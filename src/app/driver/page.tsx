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
  loading: () => <div className="h-40 w-full bg-brand-card animate-pulse rounded-[32px] flex items-center justify-center text-gray-500 font-bold border border-brand-border">جاري تحميل الخريطة...</div>
});

import { SAFE_RIDE_FEE, VENDOR_INSURANCE_FEE } from "@/lib/pricing";
import { getCurrentUser, getUserProfile, signOut, updateUserProfile } from "@/lib/auth";
import { updateOrder, subscribeToOrders, subscribeToWallets, subscribeToSettlements, driverConfirmPayment, getAvailableOrders, type Order as DBOrder } from "@/lib/orders";
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

    let ordersSub: any;
    let walletSub: any;
    let settlementsSub: any;

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

      // 1. اشتراك الطلبات
      ordersSub = subscribeToOrders((payload) => {
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

      // 2. اشتراك المحفظة (تحديث الأرصدة فوراً)
      walletSub = subscribeToWallets(user.id, () => {
        fetchStats(user.id);
      });

      // 3. اشتراك التسويات
      settlementsSub = subscribeToSettlements(user.id, () => {
        fetchStats(user.id);
      });
    };

    setup();

    return () => {
      if (ordersSub) supabase.removeChannel(ordersSub);
      if (walletSub) supabase.removeChannel(walletSub);
      if (settlementsSub) supabase.removeChannel(settlementsSub);
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
  };

  const fetchOrders = async (currentDriverId: string) => {
    const data = await getAvailableOrders();
    if (data) {
      setOrders(data.map(mapDBOrderToUI));
    }
  };

  const mapDBOrderToUI = (db: any): Order => {
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
    const { data, error } = await updateOrder(orderId, { driver_id: driverId, status: 'in_transit' });
    if (!error && data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data) : o));
      playNotification();
      addActivity(`استلام الطلب #${orderId.slice(0, 8)}`);
    } else {
      alert("حدث خطأ أثناء تأكيد الاستلام.");
    }
  };

  const initiatePaymentSettlement = async (orderId: string) => {
    if (!driverId) return;
    const { error } = await driverConfirmPayment(orderId);
    if (!error) {
      addActivity(`تم طلب تسوية الدفع للمحل #${orderId.slice(0, 8)}`);
      playNotification();
      fetchOrders(driverId);
    } else {
      alert("حدث خطأ أثناء طلب التسوية.");
    }
  };

  const simulateDelivery = async (orderId: string) => {
    setIsSimulating(true);
    const { data, error } = await updateOrder(orderId, { status: 'delivered' });
    if (!error && data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data) : o));
      if (driverId) {
        await fetchStats(driverId);
        await fetchOrders(driverId);
      }
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
    const { error } = await supabase.from('settlements').insert([{ user_id: driverId, amount: Number(settlementAmount), status: 'pending', method: 'Vodafone Cash' }]);
    if (!error) {
      alert("تم إرسال طلب التسوية بنجاح.");
      setShowSettlementModal(false);
      setSettlementAmount("");
      if (driverId) fetchStats(driverId);
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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (loading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center font-bold text-gray-400">جاري تحميل البيانات...</div>;

  return (
    <div className="min-h-screen bg-brand-dark text-white flex flex-col font-sans selection:bg-brand-secondary/10" dir="rtl">
      {/* Updated Header */}
      <header className="bg-brand-card/80 backdrop-blur-md p-6 shadow-lg border-b border-brand-border flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowDrawer(true)} className="p-2 hover:bg-brand-muted rounded-xl transition-colors">
            <Menu className="w-6 h-6 text-white" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white leading-tight">Start Location</h1>
              {isActive && <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 bg-brand-success rounded-full" />}
            </div>
            <p className="text-[10px] text-gray-400">كابتن: {driverName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleManualRefresh} className={`p-2 rounded-xl transition-all ${isRefreshing ? "bg-brand-muted text-gray-600" : "bg-brand-muted text-gray-400 hover:text-white"}`}>
            <History className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setAutoAccept(!autoAccept)} className={`p-2 rounded-xl border ${autoAccept ? "bg-brand-warning/20 text-brand-warning border-brand-warning/50" : "bg-brand-muted text-gray-500 border-brand-border"}`}>
            {autoAccept ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>
          <button onClick={toggleActive} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isActive ? "bg-brand-success/10 border-brand-success/20 text-brand-success" : "bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary"}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isActive ? "bg-brand-success" : "bg-brand-secondary"}`} />
            <span className="font-black text-xs">{isActive ? "متصل" : "غير متصل"}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
        {activeTab === "orders" ? (
          <>
            {isActive && activityLog.length > 0 && (
              <div className="bg-brand-card/50 backdrop-blur-md border border-brand-border rounded-[24px] p-3 flex flex-col gap-1 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-brand-secondary animate-pulse" />
                <AnimatePresence mode="popLayout">
                  {activityLog.map(log => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-between items-center px-2">
                      <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-brand-secondary" /><span className="text-[10px] font-bold text-gray-300">{log.text}</span></div>
                      <span className="text-[8px] font-bold text-gray-500">{log.time}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <section className="bg-brand-card p-5 rounded-[32px] border border-brand-border shadow-lg">
                <p className="text-[10px] font-bold text-gray-400 mb-1">دخل اليوم</p>
                <h2 className="text-xl font-black text-white">{todayDeliveryFees} <span className="text-[10px]">ج.م</span></h2>
              </section>
              <section className="bg-brand-card p-5 rounded-[32px] border border-brand-border shadow-lg">
                <p className="text-[10px] font-bold text-gray-400 mb-1">مديونية المحلات</p>
                <h2 className="text-xl font-black text-white">{vendorDebt} <span className="text-[10px]">ج.م</span></h2>
              </section>
            </div>

            <section className="space-y-4">
              {isActive && driverLocation && (
                <LiveMap 
                  drivers={[{ id: driverId || 'me', name: 'موقعي', ...driverLocation }]} 
                  center={[driverLocation.lat, driverLocation.lng]}
                  zoom={15}
                  className="h-40 w-full rounded-[32px] overflow-hidden shadow-xl border border-brand-border mb-4 grayscale invert brightness-90 contrast-125"
                />
              )}
              {!isActive ? (
                <div className="bg-brand-card p-8 rounded-[40px] shadow-xl text-center border border-brand-border">
                  <div className="w-16 h-16 bg-brand-secondary/10 text-brand-secondary rounded-full flex items-center justify-center mx-auto mb-4"><Power className="w-8 h-8" /></div>
                  <h2 className="text-xl font-bold text-white mb-2">أنت غير متصل</h2>
                  <button onClick={toggleActive} className="w-full bg-brand-secondary text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-secondary/20 mt-6">بدء العمل الآن</button>
                </div>
              ) : orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length === 0 ? (
                <div className="bg-brand-card p-8 rounded-[40px] shadow-xl text-center border border-brand-border">
                  <Truck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-400 font-bold">لا توجد طلبات متاحة حالياً</p>
                </div>
              ) : (
                orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map(order => (
                  <div key={order.id} className="bg-brand-card p-6 rounded-[32px] border border-brand-border shadow-xl relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-muted rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-brand-secondary/10 group-hover:text-brand-secondary transition-colors"><Store className="w-6 h-6" /></div>
                        <div><h3 className="font-black text-white">{order.vendor}</h3><p className="text-[10px] text-gray-500">#{order.id.slice(0, 8)}</p></div>
                      </div>
                      <div className="text-left"><p className="text-sm font-black text-brand-secondary">{order.fee}</p><p className="text-[10px] text-gray-500">{order.distance}</p></div>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-gray-400"><Clock className="w-4 h-4 text-gray-600" /><p className="text-xs font-bold">وقت التحضير: {order.prepTime} دقيقة</p></div>
                      <div className="flex items-center gap-2 text-gray-300"><Truck className="w-4 h-4 text-gray-600" /><p className="text-xs font-bold truncate">{order.address}</p></div>
                    </div>
                    <div className="flex flex-col gap-3">
                      {order.status === 'pending' ? (
                        <button onClick={() => acceptOrder(order.id)} className="w-full bg-brand-secondary text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-secondary/20 active:scale-95 transition-transform">قبول الطلب</button>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            {order.status === 'assigned' ? (
                              <button onClick={() => pickupOrder(order.id)} className="flex-1 bg-white text-brand-dark py-4 rounded-2xl font-bold active:scale-95 transition-transform">تأكيد الاستلام من المحل</button>
                            ) : (
                              <button onClick={() => simulateDelivery(order.id)} disabled={isSimulating} className="flex-1 bg-brand-success text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform disabled:opacity-50">تأكيد التسليم للعميل</button>
                            )}
                          </div>
                          {!order.vendorCollectedAt && (
                            <button 
                              onClick={() => initiatePaymentSettlement(order.id)}
                              className="w-full bg-brand-warning/10 text-brand-warning border border-brand-warning/20 py-3 rounded-xl text-[10px] font-black hover:bg-brand-warning hover:text-brand-dark transition-all flex items-center justify-center gap-2"
                            >
                              <Banknote className="w-4 h-4" />
                              دفع المديونية للمحل الآن
                            </button>
                          )}
                        </>
                      )}
                      <div className="flex gap-2 mt-1">
                        <a href={`tel:${order.vendorPhone}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-muted text-gray-300 rounded-xl hover:text-white transition-colors text-[10px] font-bold border border-brand-border">
                          <Phone className="w-4 h-4" />
                          اتصال بالمحل
                        </a>
                        {order.customerPhone && (
                          <a href={`tel:${order.customerPhone}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary/20 transition-colors text-[10px] font-bold border border-brand-primary/20">
                            <MessageCircle className="w-4 h-4" />
                            اتصال بالعميل
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        ) : activeTab === "wallet" ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">المحفظة المالية</h2>
            <div className="bg-brand-card text-white p-8 rounded-[40px] shadow-xl border border-brand-border relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">مديونية الشركة (العمولة)</p>
                <h3 className="text-4xl font-black">{systemDebt.toLocaleString()} <span className="text-lg font-bold">ج.م</span></h3>
                <button onClick={() => setShowSettlementModal(true)} className="mt-6 w-full bg-white text-brand-dark py-3 rounded-2xl text-xs font-bold transition-all hover:bg-gray-200 shadow-lg">طلب تسوية مديونية</button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-secondary/20 blur-[80px] rounded-full" />
            </div>
            <div className="bg-brand-card p-8 rounded-[40px] border border-brand-border shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">مديونية المحلات (عهد الطلبات)</p>
                <h3 className="text-4xl font-black text-white">{vendorDebt.toLocaleString()} <span className="text-lg font-bold text-gray-600">ج.م</span></h3>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white pr-2">طلبات التسوية الأخيرة</h3>
              {settlementHistory.map(s => (
                <div key={s.id} className="bg-brand-card p-4 rounded-2xl border border-brand-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.status === 'تم السداد' ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-warning/10 text-brand-warning'}`}>
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{s.vendor}</p>
                      <p className="text-[10px] text-gray-500 font-bold">{s.date}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-white">{s.amount} ج.م</p>
                    <p className={`text-[10px] font-bold ${s.status === 'تم السداد' ? 'text-brand-success' : 'text-brand-warning'}`}>{s.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">سجل العمليات</h2>
            <div className="space-y-4">
              {orders.filter(o => o.status === "delivered" || o.status === "cancelled").length === 0 ? (
                <div className="bg-brand-card p-12 rounded-[40px] text-center border border-dashed border-brand-border">
                  <History className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 font-bold">السجل فارغ حالياً</p>
                </div>
              ) : (
                orders.filter(o => o.status === "delivered" || o.status === "cancelled").map(order => (
                  <div key={order.id} className="bg-brand-card p-5 rounded-3xl border border-brand-border flex flex-col gap-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-brand-border ${order.status === "delivered" ? "bg-brand-success/10 text-brand-success" : "bg-brand-secondary/10 text-brand-secondary"}`}>
                          <History className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{order.vendor}</p>
                          <p className="text-[10px] text-gray-500 font-bold">#{order.id.slice(0, 8)} • {order.fee}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${order.status === "delivered" ? "bg-brand-success/10 text-brand-success" : "bg-brand-secondary/10 text-brand-secondary"}`}>
                          {translateStatus(order.status)}
                        </span>
                      </div>
                    </div>
                    {order.status === "delivered" && !order.vendorCollectedAt && (
                      <div className="pt-3 border-t border-brand-border">
                        {!order.driverConfirmedAt ? (
                          <button 
                            onClick={() => initiatePaymentSettlement(order.id)}
                            className="w-full bg-brand-warning/10 text-brand-warning hover:bg-brand-warning hover:text-brand-dark py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-brand-warning/20"
                          >
                            <Banknote className="w-4 h-4" />
                            تسوية الدفع مع المحل
                          </button>
                        ) : (
                          <div className="w-full bg-brand-muted text-gray-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4 text-gray-600" />
                            بانتظار تأكيد المحل لاستلام المبلغ
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDrawer(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed top-0 right-0 bottom-0 w-72 bg-brand-card z-[101] shadow-2xl flex flex-col border-l border-brand-border">
              <div className="p-6 border-b border-brand-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-secondary/10 rounded-xl flex items-center justify-center text-brand-secondary">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{driverName}</p>
                    <p className="text-[10px] text-gray-500 font-bold">{isActive ? 'متصل الآن' : 'غير متصل'}</p>
                  </div>
                </div>
                <button onClick={() => setShowDrawer(false)} className="p-2 hover:bg-brand-muted rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 p-4 space-y-2">
                <button onClick={() => { setActiveTab("orders"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === "orders" ? "bg-brand-secondary/10 text-brand-secondary" : "hover:bg-brand-muted text-gray-400"}`}>
                  <Truck className="w-5 h-5" />
                  <span className="text-sm font-bold">الطلبات المتاحة</span>
                </button>
                <button onClick={() => { setActiveTab("wallet"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === "wallet" ? "bg-brand-secondary/10 text-brand-secondary" : "hover:bg-brand-muted text-gray-400"}`}>
                  <Wallet className="w-5 h-5" />
                  <span className="text-sm font-bold">المحفظة المالية</span>
                </button>
                <button onClick={() => { setActiveTab("history"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === "history" ? "bg-brand-secondary/10 text-brand-secondary" : "hover:bg-brand-muted text-gray-400"}`}>
                  <History className="w-5 h-5" />
                  <span className="text-sm font-bold">سجل العمليات</span>
                </button>
                <div className="h-px bg-brand-border my-4" />
                <button onClick={() => { setShowDrawer(false); setShowProfileModal(true); }} className="w-full flex items-center gap-3 p-4 hover:bg-brand-muted rounded-2xl transition-colors">
                  <Settings className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-bold text-gray-300">إعدادات الحساب</span>
                </button>
                <button onClick={() => { setShowDrawer(false); setShowPasswordModal(true); }} className="w-full flex items-center gap-3 p-4 hover:bg-brand-muted rounded-2xl transition-colors">
                  <ShieldCheck className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-bold text-gray-300">تغيير كلمة السر</span>
                </button>
              </div>
              <div className="p-4 border-t border-brand-border">
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-4 text-brand-secondary hover:bg-brand-secondary/10 rounded-2xl transition-colors">
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-bold">تسجيل الخروج</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals with Dark Theme */}
      <AnimatePresence>
        {(showProfileModal || showSettlementModal || showPasswordModal) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-brand-card w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-brand-border relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => { setShowProfileModal(false); setShowSettlementModal(false); setShowPasswordModal(false); }} className="absolute top-6 left-6 text-gray-500 hover:text-white text-2xl">×</button>
              
              {showProfileModal && (
                <div className="space-y-6">
                  <h2 className="text-xl font-black text-white text-right">تحديث الملف الشخصي</h2>
                  <div className="space-y-4">
                    <input type="text" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} placeholder="الاسم بالكامل" className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-secondary font-bold text-right" />
                    <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} placeholder="رقم الهاتف" className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-secondary font-bold text-right" />
                    <input type="text" value={profileData.area} onChange={e => setProfileData({...profileData, area: e.target.value})} placeholder="المنطقة" className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-secondary font-bold text-right" />
                    <button onClick={handleUpdateProfile} disabled={savingProfile} className="w-full bg-brand-secondary text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-secondary/20 active:scale-95 transition-all">{savingProfile ? "جاري الحفظ..." : "حفظ التغييرات"}</button>
                  </div>
                </div>
              )}

              {showSettlementModal && (
                <div className="space-y-6">
                  <h2 className="text-xl font-black text-white text-right">طلب تسوية مديونية</h2>
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-bold text-right">يرجى إدخال المبلغ الذي قمت بتحويله للشركة</p>
                    <input type="number" value={settlementAmount} onChange={e => setSettlementAmount(e.target.value)} placeholder="0.00" className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-secondary font-bold text-right" />
                    <button onClick={handleRequestSettlement} className="w-full bg-brand-secondary text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-secondary/20 active:scale-95 transition-all">إرسال الطلب</button>
                  </div>
                </div>
              )}

              {showPasswordModal && (
                <div className="space-y-6">
                  <h2 className="text-xl font-black text-white text-right">تغيير كلمة السر</h2>
                  <div className="space-y-4">
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="كلمة السر الجديدة" className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-secondary font-bold text-right" />
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="تأكيد كلمة السر" className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-secondary font-bold text-right" />
                    {passwordError && <p className="text-brand-secondary text-[10px] font-bold text-right">{passwordError}</p>}
                    <button onClick={handleChangePassword} disabled={changingPassword} className="w-full bg-brand-secondary text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-secondary/20 active:scale-95 transition-all">{changingPassword ? "جاري التغيير..." : "حفظ التغييرات"}</button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
