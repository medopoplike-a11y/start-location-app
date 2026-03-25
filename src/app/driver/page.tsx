"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Power, 
  Wallet, 
  Truck, 
  Banknote,
  AlertCircle, 
  ChevronRight,
  Route,
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
  loading: () => <div className="h-40 w-full bg-gray-100 animate-pulse rounded-[32px] flex items-center justify-center text-gray-400 font-bold">جاري تحميل الخريطة...</div>
});

import { SAFE_RIDE_FEE, VENDOR_INSURANCE_FEE } from "@/lib/pricing";
import { getCurrentUser, getUserProfile, signOut, updateUserProfile } from "@/lib/auth";
import { updateOrder, subscribeToOrders, driverConfirmPayment, type Order as DBOrder } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";

const ACCEPTANCE_RADIUS_KM = 5;
const DEBT_LIMIT = 1000;

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
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "wallet" | "history">("orders");
  const [newOrderNotify, setNewOrderNotify] = useState<Order | null>(null);
  const [showLockAlert, setShowLockAlert] = useState(false);
  const [showFinancialGuide, setShowFinancialGuide] = useState(false);
  const [todayDeliveryFees, setTodayDeliveryFees] = useState(0);
  const [vendorDebt, setVendorDebt] = useState(0);
  const [systemDebt, setSystemDebt] = useState(0);
  const [backgroundActive, setBackgroundActive] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
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

  // Refs for real-time consistency
  const isActiveRef = useRef(isActive);
  const autoAcceptRef = useRef(autoAccept);
  const locationRef = useRef(driverLocation);
  const ordersRef = useRef(orders);

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { autoAcceptRef.current = autoAccept; }, [autoAccept]);
  useEffect(() => { locationRef.current = driverLocation; }, [driverLocation]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  // Activity Log Helper
  const addActivity = (text: string) => {
    setActivityLog(prev => [{
      id: Math.random().toString(36).substring(2, 11),
      text,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }, ...prev].slice(0, 3));
  };

  // Initialization & Auth Check
  useEffect(() => {
    const savedActive = localStorage.getItem("driver_is_active");
    const savedAutoAccept = localStorage.getItem("driver_auto_accept");
    if (savedActive !== null) setIsActive(savedActive === "true");
    if (savedAutoAccept !== null) setAutoAccept(savedAutoAccept === "true");

    let subscription: any;

    const setup = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const profile = await getUserProfile(user.id);
      if (!profile || profile.role !== 'driver') {
        router.push("/login");
        return;
      }

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
      setLoading(false);

      subscription = subscribeToOrders((payload) => {
        fetchOrders(user.id);
        fetchStats(user.id);

        const { eventType, new: newRecord } = payload;
        if (eventType === 'INSERT' || (eventType === 'UPDATE' && (newRecord as DBOrder).status === 'pending')) {
          playNotification();
          const newOrder = newRecord as DBOrder;
          supabase
            .from('profiles')
            .select('location, full_name, phone')
            .eq('id', newOrder.vendor_id)
            .single()
            .then(({ data: vendorProfile }) => {
              if (vendorProfile) {
                const uiOrder = mapDBOrderToUI({ ...newOrder, profiles: vendorProfile });
                setNewOrderNotify(uiOrder);
                setTimeout(() => setNewOrderNotify(null), 10000);

                if (autoAcceptRef.current && isActiveRef.current && vendorProfile.location) {
                  const distance = calculateDistance(
                    locationRef.current?.lat || 0,
                    locationRef.current?.lng || 0,
                    vendorProfile.location.lat,
                    vendorProfile.location.lng
                  );
                  if (distance <= ACCEPTANCE_RADIUS_KM) {
                    acceptOrder(newOrder.id);
                  }
                }
              }
            });
        }
      });
    };

    setup();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [router]);

  // Persistent Connection & Wake Lock
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isActive) {
        try { 
          wakeLock = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
        } catch (err) {
          setWakeLockActive(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
        setBackgroundActive(false);
        if (driverId) { fetchOrders(driverId); fetchStats(driverId); }
      } else if (document.visibilityState === 'hidden' && isActive) {
        setBackgroundActive(true);
      }
    };

    if (isActive) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      setWakeLockActive(false);
      setBackgroundActive(false);
    }
    return () => {
      if (wakeLock) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, driverId]);

  // Sync state to DB & localStorage
  useEffect(() => {
    if (driverId) {
      localStorage.setItem("driver_is_active", isActive.toString());
      localStorage.setItem("driver_auto_accept", autoAccept.toString());
      
      supabase.from('profiles').update({ 
        is_online: isActive,
        updated_at: new Date().toISOString()
      }).eq('id', driverId).then();

      if (isActive && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setDriverLocation(loc);
          supabase.from('profiles').update({ 
            location: loc,
            last_location_update: new Date().toISOString()
          }).eq('id', driverId).then();
        }, null, { enableHighAccuracy: true, timeout: 5000 });
      }

      if (isActive && autoAccept) {
        const pendingOrders = orders.filter(o => o.status === 'pending');
        if (pendingOrders.length > 0) {
          const nearest = [...pendingOrders].sort((a, b) => a.distanceValue - b.distanceValue)[0];
          if (isOrderInRange(nearest.coords)) acceptOrder(nearest.id);
        }
      }
    }
  }, [isActive, autoAccept, driverId]);

  // High-accuracy location tracking
  useEffect(() => {
    if (!navigator.geolocation || !driverId || !isActive) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setDriverLocation(newLocation);
        setLocationAccuracy(position.coords.accuracy);
        
        await supabase.from('profiles').update({ 
          location: newLocation,
          is_online: true,
          last_location_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', driverId);
      },
      (error) => {
        if (error.code === 1) {
          alert("صلاحية الوصول للموقع مرفوضة. يرجى تفعيل الـ GPS وإعطاء الصلاحية للمتصفح.");
          setIsActive(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverId, isActive]);

  // --- Logic Helpers ---

  const fetchStats = async (currentDriverId: string) => {
    setLastSyncTime(new Date());
    try {
      const { data: walletData } = await supabase.from('wallets').select('debt, system_balance').eq('user_id', currentDriverId).single();
      const { data: ordersDebtData } = await supabase.from('orders').select('financials').eq('driver_id', currentDriverId).eq('status', 'delivered').is('vendor_collected_at', null);
      
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: todayOrders } = await supabase.from('orders').select('financials').eq('driver_id', currentDriverId).eq('status', 'delivered').gte('created_at', startOfToday.toISOString());
      
      const { data: settlementsData } = await supabase.from('settlements').select('*').eq('driver_id', currentDriverId).order('created_at', { ascending: false });

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
  };

  const fetchOrders = async (currentDriverId: string) => {
    try {
      const { data, error } = await supabase.from('orders').select('*, profiles!vendor_id(full_name, location, phone)').or(`status.eq.pending,driver_id.eq.${currentDriverId}`).order('created_at', { ascending: false });
      if (!error && data) setOrders(data.map(mapDBOrderToUI));
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const mapDBOrderToUI = (db: any): Order => {
    const distanceValue = db.distance || 2.5;
    return {
      id: db.id,
      vendor: db.profiles?.full_name || "محل غير معروف",
      vendorId: db.vendor_id,
      vendorPhone: db.profiles?.phone || "",
      customer: db.customer_details.name,
      customerPhone: db.customer_details.phone || "",
      address: db.customer_details.address,
      distanceValue: distanceValue,
      distance: `${distanceValue} كم`,
      fee: `${db.financials.delivery_fee} ج.م`,
      status: db.status,
      coords: db.profiles?.location || { lat: 30.0444, lng: 31.2357 },
      prepTime: db.financials.prep_time,
      isPickedUp: db.status === 'in_transit' || db.status === 'delivered',
      priority: db.status === 'in_transit' ? 1 : (db.status === 'assigned' ? 2 : 3),
      vendorCollectedAt: db.vendor_collected_at,
      driverConfirmedAt: db.driver_confirmed_at
    };
  };

  const translateStatus = (status: string) => {
    const statuses: any = { pending: "بانتظار الاستلام", assigned: "تم التعيين", in_transit: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغي" };
    return statuses[status] || status;
  };

  const handleUpdateProfile = async () => {
    if (!driverId) return;
    setSavingProfile(true);
    const { error } = await updateUserProfile(driverId, profileData);
    if (!error) {
      setDriverName(profileData.full_name);
      alert("تم تحديث الملف الشخصي بنجاح.");
      setShowProfileModal(false);
    } else {
      alert("حدث خطأ أثناء تحديث الملف الشخصي.");
    }
    setSavingProfile(false);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const isOrderInRange = (orderCoords: {lat: number, lng: number}) => {
    if (!driverLocation) return true; 
    return calculateDistance(driverLocation.lat, driverLocation.lng, orderCoords.lat, orderCoords.lng) <= ACCEPTANCE_RADIUS_KM;
  };

  const handleManualRefresh = async () => {
    if (!driverId) return;
    setIsRefreshing(true);
    await Promise.all([fetchOrders(driverId), fetchStats(driverId)]);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const toggleActive = async () => {
    const newStatus = !isActive;
    setIsActive(newStatus);
    if (newStatus) {
      playNotification();
      addActivity("بدء المناوبة - أنت متصل الآن");
    } else {
      addActivity("إنهاء المناوبة - أنت غير متصل");
    }
  };

  const acceptOrder = async (orderId: string) => {
    if (!driverId) return;
    if (orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length >= 3) {
      alert("عذراً، لا يمكنك قبول أكثر من 3 طلبات نشطة في نفس الوقت.");
      return;
    }
    const { data, error } = await updateOrder(orderId, { driver_id: driverId, status: 'assigned' });
    if (!error && data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data) : o));
      playNotification();
      addActivity(`تم قبول الطلب #${orderId.slice(0, 8)}`);
    }
  };

  const pickupOrder = async (orderId: string) => {
    if (!driverId) return;
    const { error: confirmError } = await driverConfirmPayment(orderId);
    if (confirmError) {
      alert("حدث خطأ أثناء تأكيد الدفع للمحل.");
      return;
    }
    const { data, error } = await updateOrder(orderId, { driver_id: driverId, status: 'in_transit' });
    if (!error && data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data) : o));
      playNotification();
      addActivity(`استلام الطلب #${orderId.slice(0, 8)}`);
    }
  };

  const simulateDelivery = async (orderId: string) => {
    setIsSimulating(true);
    const { data, error } = await updateOrder(orderId, { status: 'delivered' });
    if (!error && data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data) : o));
      if (driverId) fetchStats(driverId);
      playNotification();
      addActivity(`تم تسليم الطلب #${orderId.slice(0, 8)}`);
    } else {
      alert("حدث خطأ أثناء تحديث حالة الطلب.");
    }
    setIsSimulating(false);
  };

  const playNotification = () => {
    if (typeof window !== "undefined") {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
      audio.play().catch(() => {});
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    }
  };

  const handleRequestSettlement = async () => {
    if (!driverId || !settlementAmount) return;
    const { error } = await supabase.from('settlements').insert([{ driver_id: driverId, amount: Number(settlementAmount), status: 'pending', method: 'Vodafone Cash' }]);
    if (!error) {
      alert("تم إرسال طلب التسوية بنجاح.");
      setShowSettlementModal(false);
      setSettlementAmount("");
    } else {
      alert("حدث خطأ أثناء إرسال الطلب.");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { setPasswordError("كلمات السر غير متطابقة"); return; }
    if (newPassword.length < 6) { setPasswordError("6 أحرف على الأقل"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (!error) {
      setShowPasswordModal(false);
      setNewPassword(""); setConfirmPassword(""); setPasswordError("");
      alert("تم التغيير بنجاح");
    } else {
      setPasswordError(error.message);
    }
  };

  // --- Render Functions ---

  const renderHeader = () => (
    <header className="bg-white p-6 shadow-sm flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button onClick={() => setShowDrawer(true)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Start Location</h1>
            {isActive && <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 bg-green-500 rounded-full" />}
          </div>
          <p className="text-[10px] text-gray-400">كابتن: {driverName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleManualRefresh} className={`p-2 rounded-xl transition-all ${isRefreshing ? "bg-gray-100 text-gray-300" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
          <History className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
        <button onClick={() => setAutoAccept(!autoAccept)} className={`p-2 rounded-xl border ${autoAccept ? "bg-brand-yellow/20 text-brand-yellow border-brand-yellow/50" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
          {autoAccept ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
        </button>
        <button onClick={toggleActive} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isActive ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-red-600"}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${isActive ? "bg-green-500" : "bg-red-500"}`} />
          <span className="font-black text-xs">{isActive ? "متصل" : "غير متصل"}</span>
        </button>
      </div>
    </header>
  );

  const renderCurrentOrders = () => {
    const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    return (
      <section className="space-y-4">
        {isActive && driverLocation && (
          <LiveMap 
            drivers={[{ id: driverId || 'me', name: 'موقعي', ...driverLocation }]} 
            center={[driverLocation.lat, driverLocation.lng]}
            zoom={15}
            className="h-40 w-full rounded-[32px] overflow-hidden shadow-sm border border-gray-100 mb-4"
          />
        )}
        {!isActive ? (
          <div className="bg-white p-8 rounded-[40px] shadow-sm text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Power className="w-8 h-8" /></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">أنت غير متصل</h2>
            <button onClick={toggleActive} className="w-full bg-brand-red text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-200 mt-6">بدء العمل الآن</button>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-[40px] shadow-sm text-center border border-gray-100">
            <Truck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm text-gray-400 font-bold">لا توجد طلبات متاحة حالياً</p>
          </div>
        ) : (
          activeOrders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-brand-red/10 group-hover:text-brand-red transition-colors"><Store className="w-6 h-6" /></div>
                  <div><h3 className="font-black text-gray-900">{order.vendor}</h3><p className="text-[10px] text-gray-400">#{order.id.slice(0, 8)}</p></div>
                </div>
                <div className="text-left"><p className="text-sm font-black text-brand-red">{order.fee}</p><p className="text-[10px] text-gray-400">{order.distance}</p></div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-gray-600"><Clock className="w-4 h-4 text-gray-400" /><p className="text-xs font-bold">وقت التحضير: {order.prepTime} دقيقة</p></div>
                <div className="flex items-center gap-2 text-gray-600"><Truck className="w-4 h-4 text-gray-400" /><p className="text-xs font-bold truncate">{order.address}</p></div>
              </div>
              <div className="flex gap-2">
                {order.status === 'pending' ? (
                  <button onClick={() => acceptOrder(order.id)} className="flex-1 bg-brand-red text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-100 active:scale-95 transition-transform">قبول الطلب</button>
                ) : order.status === 'assigned' ? (
                  <button onClick={() => pickupOrder(order.id)} className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform">تأكيد الاستلام</button>
                ) : (
                  <button onClick={() => simulateDelivery(order.id)} disabled={isSimulating} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform disabled:opacity-50">تأكيد التسليم</button>
                )}
                <a href={`tel:${order.vendorPhone}`} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-brand-red/10 hover:text-brand-red transition-colors"><Phone className="w-6 h-6" /></a>
              </div>
            </div>
          ))
        )}
      </section>
    );
  };

  if (loading) return <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center font-bold text-gray-400">جاري تحميل البيانات...</div>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans selection:bg-brand-red/10" dir="rtl">
      {renderHeader()}
      <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
        {isActive && activityLog.length > 0 && (
          <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-[24px] p-3 flex flex-col gap-1 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-brand-red animate-pulse" />
            <AnimatePresence mode="popLayout">
              {activityLog.map(log => (
                <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-brand-red" /><span className="text-[10px] font-bold text-gray-600">{log.text}</span></div>
                  <span className="text-[8px] font-bold text-gray-400">{log.time}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <section className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 mb-1">دخل اليوم</p>
            <h2 className="text-xl font-black text-gray-900">{todayDeliveryFees} <span className="text-[10px]">ج.م</span></h2>
          </section>
          <section className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 mb-1">مديونية المحلات</p>
            <h2 className="text-xl font-black text-gray-900">{vendorDebt} <span className="text-[10px]">ج.م</span></h2>
          </section>
        </div>

        {renderCurrentOrders()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-4 flex justify-around items-center z-40">
        {[
          { id: "orders", icon: <Truck className="w-6 h-6" />, label: "الطلبات" },
          { id: "wallet", icon: <Wallet className="w-6 h-6" />, label: "المحفظة" },
          { id: "history", icon: <History className="w-6 h-6" />, label: "السجل" }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? "text-brand-red scale-110" : "text-gray-300"}`}>
            {tab.icon}<span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowProfileModal(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-900 transition-colors"><X className="w-6 h-6" /></button>
              <h2 className="text-xl font-black mb-6">تعديل الملف الشخصي</h2>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-gray-400 block mb-2">الاسم بالكامل</label><input type="text" value={profileData.full_name} onChange={(e) => setProfileData({...profileData, full_name: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-red font-bold" /></div>
                <div><label className="text-xs font-bold text-gray-400 block mb-2">رقم الهاتف</label><input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-red font-bold" /></div>
                <div><label className="text-xs font-bold text-gray-400 block mb-2">منطقة العمل</label><input type="text" value={profileData.area} onChange={(e) => setProfileData({...profileData, area: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-red font-bold" /></div>
                <div><label className="text-xs font-bold text-gray-400 block mb-2">نوع المركبة</label><select value={profileData.vehicle_type} onChange={(e) => setProfileData({...profileData, vehicle_type: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-red font-bold appearance-none"><option>موتوسيكل</option><option>عجلة</option><option>سيارة</option><option>سكوتر</option></select></div>
                <div><label className="text-xs font-bold text-gray-400 block mb-2">الرقم القومي</label><input type="text" value={profileData.national_id} onChange={(e) => setProfileData({...profileData, national_id: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-red font-bold" /></div>
                <button onClick={handleUpdateProfile} disabled={savingProfile} className="w-full bg-brand-red text-white py-4 rounded-2xl font-bold disabled:opacity-50 shadow-lg shadow-red-100">{savingProfile ? "جاري الحفظ..." : "حفظ التغييرات"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settlement Modal */}
      <AnimatePresence>
        {showSettlementModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative">
              <button onClick={() => setShowSettlementModal(false)} className="absolute top-6 left-6 text-gray-400">×</button>
              <h2 className="text-xl font-black mb-6">طلب تسوية مديونية</h2>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-gray-400 block mb-2">المبلغ المراد سداده</label><input type="number" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-red font-bold" /></div>
                <button onClick={handleRequestSettlement} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-lg">إرسال الطلب</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative">
              <button onClick={() => setShowPasswordModal(false)} className="absolute top-6 left-6 text-gray-400">×</button>
              <h2 className="text-xl font-black mb-6">تغيير كلمة السر</h2>
              <div className="space-y-4">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة السر الجديدة" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red font-bold" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تأكيد كلمة السر" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red font-bold" />
                {passwordError && <p className="text-red-500 text-xs font-bold">{passwordError}</p>}
                <button onClick={handleChangePassword} disabled={changingPassword} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-lg">{changingPassword ? "جاري التغيير..." : "حفظ التغييرات"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderDrawer()}
    </div>
  );
}
