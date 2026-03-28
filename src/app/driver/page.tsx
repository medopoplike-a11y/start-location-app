"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Power, 
  Wallet, 
  Truck, 
  Banknote,
  AlertCircle, 
  ChevronRight,
  Zap,
  ZapOff,
  TrendingDown,
  History,
  CheckCircle,
  Clock,
  ShieldCheck,
  LogOut,
  Phone,
  MessageCircle,
  Menu,
  X,
  Settings,
  Store,
  Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { 
  ssr: false,
  loading: () => <div className="h-40 w-full bg-gray-50 animate-pulse rounded-[32px] flex items-center justify-center text-gray-400 font-bold border border-gray-100">جاري تحميل الخريطة...</div>
});

import { getCurrentUser, getUserProfile, signOut, updateUserProfile } from "@/lib/auth";
import { getAvailableOrders } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { PremiumCard } from "@/components/PremiumCard";
import { AppLoader } from "@/components/AppLoader";
import { useSync } from "@/hooks/useSync";
import { SyncIndicator } from "@/components/SyncIndicator";

interface Order {
  id: string;
  vendor: string;
  vendorId: string;
  customer: string;
  address: string;
  distanceValue: number;
  distance: string;
  fee: string;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  coords: { lat: number; lng: number };
  prepTime: string;
  isPickedUp: boolean;
  priority: number;
  vendorPhone?: string;
  customerPhone?: string;
  vendorCollectedAt?: string | null;
  driverConfirmedAt?: string | null;
}

export default function DriverApp() {
  const router = useRouter();
  
  // Basic State
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("كابتن");
  const [isActive, setIsActive] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "wallet" | "history">("orders");
  const [todayDeliveryFees, setTodayDeliveryFees] = useState(0);
  const [vendorDebt, setVendorDebt] = useState(0);
  const [systemDebt, setSystemDebt] = useState(0);
  const [activityLog, setActivityLog] = useState<{id: string, text: string, time: string}[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);

  // Modals State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    area: "",
    vehicle_type: "موتوسيكل",
    national_id: ""
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedActive = localStorage.getItem("driver_is_active");
      const savedAutoAccept = localStorage.getItem("driver_auto_accept");
      if (savedActive !== null) setIsActive(savedActive === "true");
      if (savedAutoAccept !== null) setAutoAccept(savedAutoAccept === "true");
    }

    const setup = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const profile = await getUserProfile(user.id);
          if (profile) {
            setDriverId(user.id);
            setDriverName(profile.full_name || "كابتن");
            setProfileData({
              full_name: profile.full_name || "",
              phone: profile.phone || "",
              area: profile.area || "",
              vehicle_type: profile.vehicle_type || "موتوسيكل",
              national_id: profile.national_id || ""
            });
            await Promise.all([
              fetchOrders(user.id),
              fetchStats(user.id)
            ]);
          }
        }
        setLoading(false);
      } catch (e) {
        console.error("DriverPage: Setup error", e);
      }
    };

    setup();
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation || !driverId || !isActive) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setDriverLocation(newLocation);

        await supabase.from('profiles').update({ 
          location: newLocation,
          is_online: true,
          last_location_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', driverId);
      },
      (error) => {
        if (error.code === 1) {
          setIsActive(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverId, isActive]);

  async function fetchStats(currentDriverId: string) {
    setLastSyncTime(new Date());
    try {
      const { data: walletData } = await supabase.from('wallets').select('debt, system_balance').eq('user_id', currentDriverId).single();
      const { data: ordersDebtData } = await supabase.from('orders').select('financials').eq('driver_id', currentDriverId).eq('status', 'delivered').is('vendor_collected_at', null);
      
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: todayOrders } = await supabase.from('orders').select('financials').eq('driver_id', currentDriverId).eq('status', 'delivered').gte('created_at', startOfToday.toISOString());
      
      const { data: settlementsData } = await supabase.from('settlements').select('*').eq('user_id', currentDriverId).order('created_at', { ascending: false });

      if (walletData) setSystemDebt(walletData.system_balance);
      if (ordersDebtData) setVendorDebt(ordersDebtData.reduce((acc, order) => acc + (order.financials.order_value || 0), 0));
      if (todayOrders) setTodayDeliveryFees(todayOrders.reduce((acc, order) => acc + (order.financials.delivery_fee || 0), 0));
      if (settlementsData) {
        setSettlementHistory(settlementsData.map(s => ({
          id: s.id,
          vendor: "تسوية مديونية",
          amount: s.amount,
          status: s.status === 'approved' ? "تم السداد" : s.status === 'pending' ? "جاري المراجعة" : "مرفوض",
          date: new Date(s.created_at).toLocaleDateString('ar-EG')
        })));
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  async function fetchOrders(_currentDriverId: string) {
    const data = await getAvailableOrders();
    if (data) {
      setOrders(data.map(mapDBOrderToUI));
    }
  }

  function mapDBOrderToUI(db: any): Order {
    const distanceValue = db.distance || 2.5;
    const vendorProfile = db.profiles || {};
    return {
      id: db.id,
      vendor: vendorProfile.full_name || "محل غير معروف",
      vendorId: db.vendor_id,
      vendorPhone: vendorProfile.phone || "",
      customer: db.customer_details.name,
      customerPhone: db.customer_details.phone || "",
      address: db.customer_details.address,
      distanceValue: distanceValue,
      distance: `${distanceValue} كم`,
      fee: `${db.financials.delivery_fee} ج.م`,
      status: db.status,
      coords: vendorProfile.location || { lat: 30.0444, lng: 31.2357 },
      prepTime: db.financials.prep_time,
      isPickedUp: db.status === 'in_transit' || db.status === 'delivered',
      priority: db.status === 'in_transit' ? 1 : (db.status === 'assigned' ? 2 : 3),
      vendorCollectedAt: db.vendor_collected_at,
      driverConfirmedAt: db.driver_confirmed_at
    };
  }

  const translateStatus = (status: string) => {
    const statuses: any = { pending: "بانتظار الاستلام", assigned: "تم التعيين", in_transit: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغي" };
    return statuses[status] || status;
  };

  // Sync with useSync hook
  useSync(driverId || undefined, () => {
    if (driverId) {
      fetchOrders(driverId);
      fetchStats(driverId);
    }
  });

  const handleUpdateProfile = async () => {
    if (!driverId) return;
    setSavingProfile(true);
    const { error } = await updateUserProfile(driverId, profileData);
    if (!error) {
      setDriverName(profileData.full_name);
      alert("تم تحديث الملف الشخصي بنجاح.");
      setShowProfileModal(false);
    }
    setSavingProfile(false);
  };

  const toggleActive = async () => {
    const newStatus = !isActive;
    setIsActive(newStatus);
    if (typeof window !== "undefined") {
      localStorage.setItem("driver_is_active", newStatus.toString());
    }
    if (driverId) {
      await supabase.from('profiles').update({ is_online: newStatus }).eq('id', driverId);
    }
  };

  const addActivity = (text: string) => {
    setActivityLog(prev => [{
      id: Math.random().toString(36).substring(2, 11),
      text,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }, ...prev].slice(0, 3));
  };

  const handleSignOut = async () => {
    try { await signOut(); router.push("/login"); } catch (error) { console.error('Sign out failed:', error); }
  };

  if (loading) return <AppLoader />;

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col font-sans" dir="rtl">
      <div className="silver-live-bg" />

      <header className="bg-white/80 backdrop-blur-xl p-6 shadow-sm flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowDrawer(true)} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100">
            <Menu className="w-5 h-5 text-gray-900" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-gray-900 leading-tight">Start Location</h1>
            <p className="text-[10px] font-bold text-gray-400">كابتن: {driverName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SyncIndicator lastSync={lastSyncTime} isSyncing={isRefreshing} />
          <button onClick={toggleActive} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all ${isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
            <Power className="w-4 h-4" />
            <span className="font-black text-[10px]">{isActive ? "Online" : "Offline"}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
        <Suspense fallback={<AppLoader />}>
          {activeTab === "orders" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <PremiumCard title="أرباح اليوم" value={todayDeliveryFees} icon={<TrendingDown className="text-green-500 w-5 h-5" />} subtitle="ج.م" delay={0.1} />
                <PremiumCard title="مديونية المحلات" value={vendorDebt} icon={<Store className="text-orange-500 w-5 h-5" />} subtitle="ج.م" delay={0.2} />
              </div>
              
              <section className="space-y-4">
                {isActive && driverLocation && (
                  <LiveMap drivers={[{ id: driverId || 'me', name: 'موقعي', ...driverLocation }]} center={[driverLocation.lat, driverLocation.lng]} zoom={15} className="h-40 w-full rounded-[32px] overflow-hidden shadow-sm border border-gray-100 mb-4" />
                )}
                {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length === 0 ? (
                  <div className="bg-white p-8 rounded-[40px] shadow-sm text-center border border-gray-100">
                    <Truck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-sm text-gray-400 font-bold">لا توجد طلبات متاحة</p>
                  </div>
                ) : (
                  orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400"><Store className="w-6 h-6" /></div>
                          <div><h3 className="font-black text-gray-900">{order.vendor}</h3><p className="text-[10px] text-gray-400">#{order.id.slice(0, 8)}</p></div>
                        </div>
                        <div className="text-left"><p className="text-sm font-black text-red-600">{order.fee}</p></div>
                      </div>
                    </div>
                  ))
                )}
              </section>
            </>
          ) : (
            <div className="text-center py-20"><p className="text-gray-400">جاري تحميل البيانات...</p></div>
          )}
        </Suspense>
      </main>

      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDrawer(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed top-0 right-0 bottom-0 w-72 bg-white z-[101] shadow-2xl flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold">القائمة</h3><button onClick={() => setShowDrawer(false)}><X className="w-5 h-5" /></button></div>
              <div className="flex-1 p-4 space-y-2">
                <button onClick={() => setActiveTab("orders")} className="w-full text-right p-4 rounded-xl hover:bg-gray-50 font-bold">الطلبات</button>
                <button onClick={() => setActiveTab("wallet")} className="w-full text-right p-4 rounded-xl hover:bg-gray-50 font-bold">المحفظة</button>
                <button onClick={handleSignOut} className="w-full text-right p-4 rounded-xl hover:bg-red-50 text-red-500 font-bold">تسجيل الخروج</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
