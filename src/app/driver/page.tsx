"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Power, 
  Wallet, 
  Truck, 
  Banknote,
  AlertCircle, 
  ChevronRight,
  Volume2,
  Navigation2,
  Route,
  Zap,
  ZapOff,
  TrendingDown,
  TrendingUp,
  History,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Calendar, 
  ShieldCheck,
  ArrowRightLeft as OrdersIcon,
  LogOut,
  Navigation as NavigationIcon,
  CheckCircle2,
  Phone,
  MessageCircle,
  Menu,
  X,
  Settings
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import LocationMarker from "@/components/LocationMarker";
import { SAFE_RIDE_FEE, calculateOrderFinancials } from "@/lib/pricing";
import { getCurrentUser, getUserProfile, signOut } from "@/lib/auth";
import { updateOrder, subscribeToOrders, driverConfirmPayment, type Order as DBOrder } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import PushNotificationManager from "@/components/PushNotificationManager";

interface Order {
  id: string;
  vendor: string;
  customer: string;
  address: string;
  distanceValue: number;
  distance: string;
  fee: string;
  status: string;
  coords: { lat: number; lng: number };
  prepTime: string;
  isPickedUp: boolean;
  priority: number;
  vendorPhone?: string;
  customerPhone?: string;
  vendorCollectedAt?: string | null;
  driverConfirmedAt?: string | null;
}

interface SettlementHistoryItem {
  id: string;
  vendor: string;
  amount: number;
  status: string;
  date: string;
}

export default function DriverApp() {
  const router = useRouter();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("كابتن");
  const [isActive, setIsActive] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);

  // استعادة الحالة من localStorage عند التحميل
  useEffect(() => {
    const savedActive = localStorage.getItem("driver_is_active");
    const savedAutoAccept = localStorage.getItem("driver_auto_accept");
    if (savedActive !== null) setIsActive(savedActive === "true");
    if (savedAutoAccept !== null) setAutoAccept(savedAutoAccept === "true");
  }, []);

  // منع الشاشة من الإغلاق (Screen Wake Lock) والحفاظ على الاتصال
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isActive) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.error("Wake Lock error:", err);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
        // إعادة جلب البيانات عند العودة للتطبيق
        if (driverId) {
          fetchOrders(driverId);
          fetchStats(driverId);
        }
      }
    };

    if (isActive) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (wakeLock) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, driverId]);

  // حفظ الحالة في localStorage وتحديث قاعدة البيانات
  useEffect(() => {
    if (driverId) {
      localStorage.setItem("driver_is_active", isActive.toString());
      localStorage.setItem("driver_auto_accept", autoAccept.toString());
      
      supabase.from('profiles').update({ 
        is_online: isActive,
      }).eq('id', driverId).then(({ error }) => {
        if (error) console.error("Error updating online status:", error);
      });

      // إذا أصبح متصلاً مع تفعيل القبول التلقائي، نقوم بفحص الطلبات المعلقة حالياً
      if (isActive && autoAccept) {
        const pendingOrders = orders.filter(o => o.status === 'pending');
        if (pendingOrders.length > 0) {
          // قبول أقرب طلب معلق
          const nearest = [...pendingOrders].sort((a, b) => a.distanceValue - b.distanceValue)[0];
          if (isOrderInRange(nearest.coords)) {
            acceptOrder(nearest.id);
          }
        }
      }
    }
  }, [isActive, autoAccept, driverId]);
  const [earnings, setEarnings] = useState(0);
  const [vendorDebt, setVendorDebt] = useState(0);
  const [systemDebt, setSystemDebt] = useState(0);
  const [showMap, setShowMap] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isSimulating, setIsSimulating] = useState(false);
  const [showLockAlert, setShowLockAlert] = useState(false);
  const [showFinancialGuide, setShowFinancialGuide] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"wallet" | "stats" | "none">("none");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderNotify, setNewOrderNotify] = useState<Order | null>(null);
  const DEBT_LIMIT = 1000;

  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const ACCEPTANCE_RADIUS_KM = 5; // 5 km radius

  // مراجع للقيم اللحظية لاستخدامها في الاشتراكات دون إعادة تفعيلها
  const isActiveRef = React.useRef(isActive);
  const autoAcceptRef = React.useRef(autoAccept);
  const locationRef = React.useRef(driverLocation);

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { autoAcceptRef.current = autoAccept; }, [autoAccept]);
  useEffect(() => { locationRef.current = driverLocation; }, [driverLocation]);

  // تتبع موقع الطيار
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting driver location:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // التحقق من الهوية وجلب البيانات
  useEffect(() => {
    let subscription: any;

    const setupSubscriptions = async () => {
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
      
      // جلب الطلبات المتاحة أو المسندة لهذا الطيار
      fetchOrders(user.id);
      fetchStats(user.id);
      setLoading(false);

      // الاشتراك في التغييرات اللحظية
      subscription = subscribeToOrders((payload) => {
        const { eventType, new: newRecord } = payload;

        // تحديث القائمة بالكامل لضمان مزامنة البيانات
        fetchOrders(user.id);
        fetchStats(user.id);
        
        if (eventType === 'INSERT') {
          playNotification();
          
          const newOrder = newRecord as DBOrder;
          if (newOrder.status === 'pending') {
            // إظهار تنبيه بصري
            setNewOrderNotify(mapDBOrderToUI(newOrder));
            setTimeout(() => setNewOrderNotify(null), 10000); // إخفاء بعد 10 ثوانٍ

            // منطق القبول التلقائي
            if (autoAcceptRef.current && isActiveRef.current) {
              const distance = calculateDistance(
                locationRef.current?.lat || 0,
                locationRef.current?.lng || 0,
                (newOrder as any).profiles?.location?.lat || 0,
                (newOrder as any).profiles?.location?.lng || 0
              );
              
              if (distance <= ACCEPTANCE_RADIUS_KM) {
                acceptOrder(newOrder.id);
              }
            }
          }
        }
      });
    };

    setupSubscriptions();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router]); // Only depend on router now, refs handle the rest

  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);

  const fetchStats = async (currentDriverId: string) => {
    // 1. جلب بيانات المحفظة مباشرة
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('balance, debt')
      .eq('user_id', currentDriverId)
      .single();

    // 2. جلب الطلبات لحساب مديونية المطاعم الحالية (التي لم تُحصل بعد)
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('financials, status, vendor_collected_at')
      .eq('driver_id', currentDriverId)
      .eq('status', 'delivered')
      .is('vendor_collected_at', null);

    // 3. جلب سجل التسويات للعرض فقط
    const { data: settlementsData, error: settlementsError } = await supabase
      .from('settlements')
      .select('*')
      .eq('driver_id', currentDriverId)
      .order('created_at', { ascending: false });

    if (!walletError && walletData) {
      setEarnings(walletData.balance);
      setSystemDebt(walletData.debt); // المديونية الإجمالية (سيستم + مطاعم متبقية)
    }

    if (!ordersError && ordersData) {
      const totalVendorDebt = ordersData.reduce((acc, order) => acc + (order.financials.order_value || 0), 0);
      setVendorDebt(totalVendorDebt);
    }

    if (!settlementsError && settlementsData) {
      setSettlementHistory(settlementsData.map(s => ({
        id: s.id,
        vendor: "تسوية مديونية",
        amount: s.amount,
        status: s.status === 'approved' ? "تم السداد" : s.status === 'pending' ? "جاري المراجعة" : "مرفوض",
        date: new Date(s.created_at).toLocaleDateString('ar-EG')
      })));
    }
  };

  const fetchOrders = async (currentDriverId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles!vendor_id(full_name, location, phone)')
      .or(`status.eq.pending,driver_id.eq.${currentDriverId}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data.map(mapDBOrderToUI));
    }
  };

  const mapDBOrderToUI = (db: any): Order => {
    const distanceValue = db.distance || 2.5;
    return {
      id: db.id,
      vendor: db.profiles?.full_name || "محل غير معروف",
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
    switch (status) {
      case 'pending': return "بانتظار الاستلام";
      case 'assigned': return "تم التعيين";
      case 'in_transit': return "في الطريق";
      case 'delivered': return "تم التوصيل";
      default: return status;
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    const { data, error } = await driverConfirmPayment(orderId);
    if (error) {
      alert("حدث خطأ أثناء تأكيد الدفع.");
    } else if (data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data) : o));
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const isOrderInRange = (orderCoords: {lat: number, lng: number}) => {
    if (!driverLocation) return false;
    const distance = calculateDistance(
      driverLocation.lat, 
      driverLocation.lng, 
      orderCoords.lat, 
      orderCoords.lng
    );
    return (distance <= ACCEPTANCE_RADIUS_KM);
  };

  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleOpenSettlement = () => {
    setSettlementAmount(systemDebt.toString());
    setShowSettlementModal(true);
  };

  const handleRequestSettlement = async () => {
    if (!driverId || !settlementAmount) return;

    const { error } = await supabase.from('settlements').insert([
      { 
        driver_id: driverId,
        amount: Number(settlementAmount),
        status: 'pending',
        method: 'Vodafone Cash'
      }
    ]);

    if (error) {
      alert("حدث خطأ أثناء إرسال طلب التسوية.");
    } else {
      alert("تم إرسال طلب التسوية بنجاح، سيتم مراجعته من قبل الإدارة.");
      setShowSettlementModal(false);
      setSettlementAmount("");
    }
  };

  const playNotification = () => {
    if (typeof window !== "undefined") {
      // صوت تنبيه مميز للطلبات الجديدة
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
      audio.play().catch(e => console.log("Audio play failed:", e));
      
      // اهتزاز الهاتف إذا كان مدعوماً
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  };

  const toggleActive = async () => {
    if (isActive) {
      const profile = await getUserProfile(driverId!);
      if (profile?.is_locked) {
        setShowLockAlert(true);
        setTimeout(() => setShowLockAlert(false), 3000);
        return;
      }
    }
    const newStatus = !isActive;
    setIsActive(newStatus);
    if (newStatus) playNotification();
  };

  const acceptOrder = async (orderId: string) => {
    if (!driverId) return;
    const { data, error } = await updateOrder(orderId, { 
      driver_id: driverId, 
      status: 'assigned' 
    });
    
    if (!error && data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data) : o));
      playNotification();
    }
  };

  const pickupOrder = async (orderId: string) => {
    if (!driverId) return;
    
    // 1. تأكيد الدفع للمحل
    const { error: confirmError } = await driverConfirmPayment(orderId);
    if (confirmError) {
      alert("حدث خطأ أثناء تأكيد الدفع للمحل.");
      return;
    }

    // 2. تحديث الحالة إلى "في الطريق"
    const { data, error } = await updateOrder(orderId, { 
      driver_id: driverId, 
      status: 'in_transit' 
    });
    
    if (!error && data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data) : o));
      playNotification();
      
      // إرسال إشعار للمحل بأن الطلب في الطريق (عبر Realtime)
      // سوبابيز تتعامل مع هذا تلقائياً عبر Postgres Changes
    }
  };

  const simulateDelivery = async (orderId: string) => {
    setIsSimulating(true);
    const { data, error } = await updateOrder(orderId, { status: 'delivered' });

    if (!error && data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data) : o));
      if (driverId) fetchStats(driverId);
      playNotification();
    } else if (error) {
      alert("حدث خطأ أثناء تحديث حالة الطلب.");
    }
    setIsSimulating(false);
  };

  const openNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("كلمات السر غير متطابقة");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("كلمة السر يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      alert("تم تغيير كلمة السر بنجاح");
    }
  };

  const totalDebt = vendorDebt + systemDebt;
  const debtPercentage = (totalDebt / DEBT_LIMIT) * 100;
  const sortedOrders = [...orders].sort((a, b) => a.distanceValue - b.distanceValue);
  const nearestOrder = sortedOrders.length > 0 ? sortedOrders[0] : null;

  // --- مكونات واجهة المستخدم الصغيرة ---

  const renderDrawer = () => (
    <AnimatePresence>
      {showDrawer && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDrawer(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-72 bg-white z-[101] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-red/10 rounded-xl flex items-center justify-center text-brand-red">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{driverName}</p>
                  <p className="text-[10px] text-gray-400">الإعدادات والأدوات</p>
                </div>
              </div>
              <button onClick={() => setShowDrawer(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="bg-gray-50 p-4 rounded-2xl space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${autoAccept ? "bg-brand-yellow/20 text-brand-yellow" : "bg-gray-200 text-gray-400"}`}>
                      {autoAccept ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                    </div>
                    <span className="text-xs font-bold text-gray-700">القبول التلقائي</span>
                  </div>
                  <button 
                    onClick={() => setAutoAccept(!autoAccept)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${autoAccept ? "bg-brand-yellow" : "bg-gray-300"}`}
                  >
                    <motion.div animate={{ x: autoAccept ? 22 : 2 }} className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              </div>

              <button onClick={() => { setShowDrawer(false); setShowPasswordModal(true); }} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                <ShieldCheck className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-bold text-gray-700">تغيير كلمة السر</span>
              </button>

              <button onClick={() => { setShowDrawer(false); setShowFinancialGuide(true); }} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                <AlertCircle className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-bold text-gray-700">دليل الحسابات</span>
              </button>

              <button onClick={() => { setShowDrawer(false); handleOpenSettlement(); }} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                <TrendingDown className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-bold text-gray-700">طلب تسوية</span>
              </button>
            </div>

            <div className="p-4 border-t border-gray-100">
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-bold">تسجيل الخروج</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const renderHeader = () => (
    <header className="bg-white p-6 shadow-sm flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button onClick={() => setShowDrawer(true)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Start Location</h1>
          <p className="text-[10px] text-gray-400">لوحة تحكم الكابتن</p>
        </div>
      </div>
      
      <button 
        onClick={toggleActive}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all border ${isActive ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-red-600"}`}
      >
        <div className={`w-2 h-2 rounded-full animate-pulse ${isActive ? "bg-green-500" : "bg-red-500"}`} />
        <span className="font-black text-xs">{isActive ? "متصل" : "غير متصل"}</span>
      </button>
    </header>
  );

  const renderWalletStats = () => (
    <div className="grid grid-cols-2 gap-4">
      <section className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold text-gray-400">صافي الربح</p>
        </div>
        <h2 className="text-xl font-black text-gray-900">{earnings.toLocaleString()} <span className="text-[10px]">ج.م</span></h2>
      </section>

      <section className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
            <TrendingDown className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold text-gray-400">مديونية المطاعم</p>
        </div>
        <h2 className="text-xl font-black text-gray-900">{vendorDebt.toLocaleString()} <span className="text-[10px]">ج.م</span></h2>
      </section>
    </div>
  );

  const renderCurrentOrders = () => {
    const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    
    return (
      <section className="space-y-4">
        {!isActive ? (
          <div className="bg-white p-8 rounded-[40px] shadow-sm text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Power className="w-8 h-8" /></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">أنت غير متصل</h2>
            <p className="text-gray-500 text-sm mb-6">قم بتغيير حالتك للبدء في استقبال الطلبات.</p>
            <button onClick={toggleActive} className="w-full bg-brand-red text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-transform">بدء العمل الآن</button>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-[40px] shadow-sm text-center border border-gray-100">
            <Truck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm text-gray-400 font-bold">لا توجد طلبات متاحة حالياً</p>
          </div>
        ) : (
          <>
            {activeOrders.filter(o => o.isPickedUp).length > 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900 rounded-[32px] p-6 text-white shadow-xl overflow-hidden relative mb-4">
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center shadow-lg shadow-brand-red/20"><Route className="w-5 h-5 text-white" /></div><h3 className="font-bold text-sm">أفضل مسار للوجهات</h3></div>
                  <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full border border-white/5">{activeOrders.length} طلبات</span>
                </div>
                <div className="space-y-4 relative z-10">
                  {activeOrders.sort((a, b) => a.distanceValue - b.distanceValue).map((order, idx) => (
                    <div key={order.id} className="flex gap-4 items-start group">
                      <div className="flex flex-col items-center gap-1 mt-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? "bg-brand-red text-white" : "bg-gray-700 text-gray-400"}`}>{idx + 1}</div>
                        {idx !== activeOrders.length - 1 && <div className="w-0.5 h-8 bg-gray-800"></div>}
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-bold leading-none ${idx === 0 ? "text-white" : "text-gray-500"}`}>{order.vendor}</p>
                        <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1"><LocationMarker size={12} pulse={false} /> {order.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex justify-between items-center px-2 mb-4">
              <h3 className="font-bold text-gray-800">قائمة المهام ({activeOrders.length})</h3>
              <span className="text-xs text-brand-red font-bold flex items-center gap-1"><Zap className="w-3 h-3 fill-current" /> ذكاء اصطناعي</span>
            </div>

            <AnimatePresence>
              {activeOrders.map((order, index) => (
                <motion.div 
                  key={order.id} 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: index * 0.1 }} 
                  className={`p-4 rounded-2xl shadow-sm border flex flex-col gap-3 mb-3 relative overflow-hidden ${order.id === nearestOrder?.id ? "bg-white border-brand-red ring-1 ring-brand-red/20" : "bg-white border-gray-100"}`}
                >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"><Truck className="w-6 h-6 text-gray-500" /></div>
                    <div>
                      <p className="font-bold text-gray-900">{order.vendor}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-gray-400">#{order.id.slice(0, 8)}</p>
                        {order.vendorPhone && (
                          <a href={`tel:${order.vendorPhone}`} className="text-blue-500 hover:text-blue-600">
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${order.isPickedUp ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}>{translateStatus(order.status)}</span>
                    {order.customerPhone && (
                      <div className="flex gap-2 mt-1">
                        <a href={`tel:${order.customerPhone}`} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="اتصال بالعميل">
                          <Phone className="w-3 h-3" />
                        </a>
                        <a href={`https://wa.me/${order.customerPhone}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="واتساب العميل">
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg"><LocationMarker size={14} pulse={false} /><span>{order.address}</span><span className="mr-auto font-bold">{order.distance}</span></div>
                
                <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-50">
                  <span className="font-bold text-brand-red">{order.fee}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setShowMap(showMap === order.id ? null : order.id)} className="bg-gray-100 text-gray-600 text-[10px] px-3 py-2 rounded-xl flex items-center gap-1"><Navigation2 className="w-3 h-3" />الخريطة</button>
                    {order.status === 'pending' && (
                      <button onClick={() => acceptOrder(order.id)} disabled={!isOrderInRange(order.coords)} className="bg-blue-600 text-white text-[10px] px-4 py-2 rounded-xl flex items-center gap-1 shadow-sm disabled:bg-gray-300">قبول</button>
                    )}
                    {order.status === 'assigned' && (
                      <button onClick={() => pickupOrder(order.id)} className="bg-brand-orange text-white text-[10px] px-4 py-2 rounded-xl flex items-center gap-1 shadow-sm font-bold">
                        <Banknote className="w-3 h-3" /> استلام ودفع للمحل
                      </button>
                    )}
                    {order.status === 'in_transit' && (
                      <button onClick={() => simulateDelivery(order.id)} disabled={isSimulating} className="bg-gray-900 text-white text-[10px] px-4 py-2 rounded-xl flex items-center gap-1 disabled:opacity-50">إتمام التوصيل</button>
                    )}
                  </div>
                </div>

                {order.vendorCollectedAt && !order.driverConfirmedAt && (
                  <button onClick={() => handleConfirmPayment(order.id)} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> تأكيد تحصيل المديونية
                  </button>
                )}

                <AnimatePresence>
                  {showMap === order.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-blue-50 rounded-xl mt-2 p-4 text-center">
                      <button onClick={() => openNavigation(order.address)} className="bg-brand-red text-white px-6 py-3 rounded-2xl flex items-center gap-2 mx-auto text-xs">
                        <NavigationIcon className="w-4 h-4" /> فتح الخريطة (Google Maps)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </>
      )}
    </section>
    );
  };

  const renderHistory = () => (
    <section className="space-y-6">
      <div className="bg-gray-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
        <p className="text-white/60 text-sm mb-2 font-bold">الرصيد المتاح</p>
        <h3 className="text-4xl font-black mb-6">{earnings.toLocaleString()} <span className="text-lg font-bold">ج.م</span></h3>
        <div className="flex gap-3">
          <div className="flex-1 bg-white/10 p-3 rounded-2xl">
            <p className="text-[8px] text-white/50 mb-1 font-bold">المديونية</p>
            <p className="text-sm font-bold text-brand-red">{systemDebt.toLocaleString()} ج.م</p>
          </div>
          <div className="flex-1 bg-white/10 p-3 rounded-2xl">
            <p className="text-[8px] text-white/50 mb-1 font-bold">السقف</p>
            <p className="text-sm font-bold text-green-400">{DEBT_LIMIT.toLocaleString()} ج.م</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-gray-900 px-2">سجل الطلبات</h4>
        <div className="space-y-3">
          {orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').length > 0 ? (
            orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 group hover:border-brand-red transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.status === "delivered" ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"}`}>
                      {order.status === "delivered" ? <CheckCircle className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{order.vendor}</p>
                      <p className="text-[10px] text-gray-400">{order.customer}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">{order.fee}</p>
                    <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-gray-100">{translateStatus(order.status)}</span>
                  </div>
                </div>
                {order.status === 'delivered' && (
                  <div className="mt-2 pt-3 border-t border-dashed border-gray-100">
                    {order.vendorCollectedAt && !order.driverConfirmedAt ? (
                      <button onClick={() => handleConfirmPayment(order.id)} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-bold shadow-sm active:scale-[0.98] transition-transform">تأكيد تحصيل المديونية</button>
                    ) : order.driverConfirmedAt ? (
                      <div className="text-center py-2 text-blue-600 bg-blue-50 rounded-xl text-[9px] font-bold">تم سداد المديونية بنجاح</div>
                    ) : (
                      <div className="text-center py-2 text-gray-400 bg-gray-50 rounded-xl text-[9px] font-bold">بانتظار تحصيل المحل من العميل...</div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-xs text-gray-400 font-bold">لا توجد طلبات سابقة</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative overflow-hidden font-sans" dir="rtl">
      <PushNotificationManager userId={driverId} />
      
      {/* Visual In-App Notification Overlay */}
      <AnimatePresence>
        {newOrderNotify && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            onClick={() => { setActiveTab("current"); setNewOrderNotify(null); }}
            className="fixed top-20 left-4 right-4 bg-gray-900 text-white p-5 rounded-[28px] z-[60] shadow-2xl border border-white/10 cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-red rounded-2xl flex items-center justify-center animate-pulse">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-black text-sm">طلب جديد متاح!</h4>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{newOrderNotify.distance}</span>
                </div>
                <p className="text-[11px] text-white/70 font-bold">{newOrderNotify.vendor}</p>
                <p className="text-[10px] text-white/50 mt-1">اضغط للتفاصيل والقبول</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {renderHeader()}
      {renderDrawer()}
      
      <AnimatePresence>
        {showLockAlert && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-4 right-4 z-50 bg-red-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 flex-shrink-0" />
            <div><p className="text-xs font-bold">عذراً، لا يمكن غلق المناوبة حالياً</p><p className="text-[10px] opacity-90">يرجى الاستمرار في استقبال الطلبات.</p></div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {renderWalletStats()}
            
            <div className="flex bg-white p-1 rounded-2xl border border-gray-100 mb-4">
              <button 
                onClick={() => setActiveTab("current")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "current" ? "bg-brand-red text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}
              >
                الطلبات النشطة
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "history" ? "bg-brand-red text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}
              >
                سجل الطلبات
              </button>
            </div>

            {activeTab === "current" ? renderCurrentOrders() : renderHistory()}
          </>
        )}
      </main>

      {/* Settlement Modal */}
      <AnimatePresence>
        {showSettlementModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative">
              <button onClick={() => setShowSettlementModal(false)} className="absolute top-6 left-6 text-gray-400 text-xl">×</button>
              <h2 className="text-xl font-black mb-6">تسوية المديونية</h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-2xl text-center"><p className="text-xs font-bold text-blue-800">فودافون كاش: 01012345678</p></div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 mr-2">المبلغ المطلوب تسويته</label>
                  <input type="number" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl text-center font-bold text-lg outline-none focus:ring-2 ring-brand-red/20" />
                </div>
                <button onClick={handleRequestSettlement} className="w-full bg-brand-red text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-100 active:scale-95 transition-all">تأكيد الطلب</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative">
              <button onClick={() => setShowPasswordModal(false)} className="absolute top-6 left-6 text-gray-400 text-xl">×</button>
              <h2 className="text-xl font-black mb-6">تغيير كلمة السر</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">كلمة السر الجديدة</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-red font-bold" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">تأكيد كلمة السر</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-red font-bold" 
                  />
                </div>
                {passwordError && <p className="text-red-500 text-xs font-bold">{passwordError}</p>}
                <button 
                  onClick={handleChangePassword} 
                  disabled={changingPassword}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold disabled:opacity-50"
                >
                  {changingPassword ? "جاري التغيير..." : "حفظ التغييرات"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Financial Guide Modal */}
      <AnimatePresence>
        {showFinancialGuide && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[40px] p-8 relative shadow-2xl overflow-hidden">
              <button onClick={() => setShowFinancialGuide(false)} className="absolute top-6 left-6 text-gray-400 text-xl">×</button>
              <h2 className="text-xl font-black mb-4">دليل الحسابات</h2>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-2xl"><h3 className="text-sm font-bold text-green-900">أرباحك</h3><p className="text-[10px] text-green-700">سعر التوصيل كاملاً يضاف لمحفظتك فور إتمام التوصيل.</p></div>
                <div className="p-4 bg-red-50 rounded-2xl"><h3 className="text-sm font-bold text-red-900">المديونية</h3><p className="text-[10px] text-red-700">عمولة الشركة (15%) + رسوم تأمين الطلب يتم خصمها من رصيدك.</p></div>
                <button onClick={() => setShowFinancialGuide(false)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold">فهمت، شكراً</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
