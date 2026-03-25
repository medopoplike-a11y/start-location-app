"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Users, 
  Store, 
  TrendingUp, 
  ShieldCheck, 
  Settings,
  AlertCircle,
  Truck,
  DollarSign,
  Menu,
  X,
  Search, 
  Bell, 
  ChevronRight, 
  LogOut, 
  Plus, 
  CheckCircle,
  Phone, 
  User, 
  Mail,
  Lock,
  Wallet,
  RefreshCw,
  Activity,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { 
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-gray-100 animate-pulse rounded-[40px] flex items-center justify-center text-gray-400 font-bold">جاري تحميل الخريطة...</div>
});

import { SAFE_RIDE_FEE, VENDOR_INSURANCE_FEE } from "@/lib/pricing";
import { signOut, createUserByAdmin, getUserProfile } from "@/lib/auth";
import { subscribeToOrders, subscribeToProfiles, subscribeToWallets, subscribeToSettlements } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { StartLogo } from "@/components/StartLogo";
import AccountsView from "./AccountsView";
import { PremiumCard } from "@/components/PremiumCard";
import { AppLoader } from "@/components/AppLoader";
import { SyncIndicator } from "@/components/SyncIndicator";

import { SyncIndicator } from "@/components/SyncIndicator";

export default function AdminPanel() {
  const router = useRouter();
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { lastSync, isSyncing } = useSync(undefined, () => fetchData());
  const [debugInfo, setDebugInfo] = useState({ profilesCount: 0, error: null as string | null });

  // Data State
  const [drivers, setDrivers] = useState<any[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<{id: string, text: string, time: string}[]>([]);
  
  // Financial State
  const [totalProfits, setTotalProfits] = useState(0);
  const [insuranceFund, setInsuranceFund] = useState(0);
  const [totalSystemDebt, setTotalSystemDebt] = useState(0);

  // Form State
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newDriverData, setNewDriverData] = useState({ name: "", email: "", password: "", phone: "", area: "", vehicle_type: "موتوسيكل", national_id: "" });
  const [newVendorData, setNewVendorData] = useState({ name: "", email: "", password: "", phone: "" });
  const [systemSettings, setSystemSettings] = useState({ driverCommission: 15, vendorFee: 1, safeRideFee: 1, debtLimit: 1000, surgePricing: 0 });
  const [appConfig, setAppConfig] = useState({ 
    latest_version: "0.2.0", 
    min_version: "0.2.0", 
    download_url: "/start-location-v0.2.0.apk", 
    bundle_url: "", 
    force_update: true, 
    update_message: "لقد قمنا بتحسينات كبيرة في الأداء وإضافة مزايا جديدة. يرجى التحديث للاستمتاع بأفضل تجربة.",
    driver_commission: 15.0,
    vendor_commission: 20.0,
    vendor_fee: 1.0,
    safe_ride_fee: 1.0
  });

  const addActivity = (text: string) => {
    setActivityLog(prev => [{
      id: Math.random().toString(36).substring(2, 11),
      text,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }, ...prev].slice(0, 5));
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let ordersSub: any;
    let profilesSub: any;
    let walletsSub: any;
    let settlementsSub: any;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace("/login"); return; }
      
      const profile = await getUserProfile(session.user.id);
      let role = profile?.role || session.user.user_metadata?.role;
      if (session.user.email?.includes('admin') || session.user.email === 'medopoplike@gmail.com') role = 'admin';
      
      if (!role || role.toLowerCase() !== 'admin') { router.replace("/login"); return; }

      await fetchData();
      setLoading(false);

      // Real-time Subscriptions with smart updates
      ordersSub = subscribeToOrders(() => {
        fetchOrders();
        fetchSettlements();
      });

      profilesSub = subscribeToProfiles((payload) => {
        const { eventType, new: newProfile } = payload;
        // تحديث سريع لمواقع الطيارين على الخريطة دون إعادة جلب الكل
        if (eventType === 'UPDATE' && newProfile.role === 'driver') {
          setOnlineDrivers(prev => {
            const loc = newProfile.location;
            if (!loc) return prev;
            const updated = {
              id: newProfile.id,
              name: newProfile.full_name,
              lat: loc.lat,
              lng: loc.lng,
              lastSeen: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            };
            const idx = prev.findIndex(d => d.id === newProfile.id);
            if (idx > -1) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [...prev, updated];
          });
        }
        // تحديث باقي البيانات في الخلفية
        fetchProfiles();
      });

      // اشتراك شامل للمحافظ (لكل المستخدمين في لوحة الأدمن)
      walletsSub = supabase
        .channel('admin_wallets_all')
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'wallets' }, 
          () => {
            fetchProfiles(); // لتحديث الأرصدة والمديونيات
          }
        )
        .subscribe();

      // اشتراك التسويات
      settlementsSub = supabase
        .channel('admin_settlements_all')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'settlements' },
          () => fetchSettlements()
        )
        .subscribe();
    };

    init();
    return () => {
      if (ordersSub) supabase.removeChannel(ordersSub);
      if (profilesSub) supabase.removeChannel(profilesSub);
      if (walletsSub) supabase.removeChannel(walletsSub);
      if (settlementsSub) supabase.removeChannel(settlementsSub);
    };
  }, [router]);

  useEffect(() => {
    if (allOrders.length > 0) {
      const profits = allOrders.reduce((acc, order) => {
        if (order.status === "delivered") {
          const financials = order.financials || {};
          // حساب العمولات (نستخدم المسجل في الطلب أو نحسبه من الإعدادات الحالية كخطة بديلة)
          const driverComm = financials.system_commission ?? (financials.delivery_fee * (appConfig.driver_commission / 100));
          const vendorComm = financials.vendor_commission ?? (financials.delivery_fee * (appConfig.vendor_commission / 100));
          const insurance = financials.insurance_fee ?? (appConfig.safe_ride_fee + appConfig.vendor_fee);
          
          return acc + driverComm + vendorComm + insurance;
        }
        return acc;
      }, 0);

      const fund = allOrders.reduce((acc, order) => {
        if (order.status === "delivered") {
          const financials = order.financials || {};
          return acc + (financials.insurance_fee ?? (appConfig.safe_ride_fee + appConfig.vendor_fee));
        }
        return acc;
      }, 0);

      setTotalProfits(profits);
      setInsuranceFund(fund);
    }
  }, [allOrders, appConfig]);

  const fetchData = async () => {
    setLastSyncTime(new Date());
    try {
      await Promise.all([fetchProfiles(), fetchOrders(), fetchSettlements(), fetchAppConfig()]);
    } catch (err) {
      console.error("Admin: Global fetch error:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_orders_admin');
      if (error) throw error;
      if (data) {
        setAllOrders(data);
        const live = data.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled').map((o: any) => ({
          id: o.id.slice(0, 8),
          id_full: o.id,
          vendor: o.vendor_full_name || "محل غير معروف",
          customer: o.customer_details?.name || "عميل",
          status: translateStatus(o.status),
          driver: o.driver_id ? "تم التعيين" : null,
          driver_id: o.driver_id,
          amount: o.financials?.order_value || 0,
          delivery_fee: o.financials?.delivery_fee || 0,
          created_at: o.created_at
        }));
        setLiveOrders(live);
        if (data.length > allOrders.length) addActivity(`طلب جديد من ${data[0].vendor_full_name || "محل"}`);
        setActivities(data.slice(0, 5).map((o: any) => ({
          id: o.id,
          type: 'order',
          text: `طلب جديد من ${o.vendor_full_name || "محل"} بقيمة ${o.financials?.order_value} ج.م`,
          time: new Date(o.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        })));
      }
    } catch (err) {
      console.error("Admin: Error fetching orders:", err);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data: profiles, error } = await supabase.rpc('get_all_profiles_admin');
      if (error) throw error;
      if (profiles) {
        setDebugInfo({ profilesCount: profiles.length, error: null });
        const online = profiles.filter((p: any) => (p.role || '').toLowerCase() === 'driver' && p.is_online).map((p: any) => {
          let loc = p.location;
          if (typeof loc === 'string') try { loc = JSON.parse(loc); } catch { loc = null; }
          return {
            id: p.id,
            name: p.full_name,
            lat: loc?.lat || null,
            lng: loc?.lng || null,
            lastSeen: new Date(p.last_location_update || p.updated_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
          };
        });
        setOnlineDrivers(online);
        setAllUsers(profiles.map((u: any) => ({
          id: u.id, email: u.email, full_name: u.full_name || "غير مسجل", phone: u.phone || "غير مسجل", area: u.area || "غير محدد", vehicle_type: u.vehicle_type || "غير محدد", national_id: u.national_id || "غير مسجل", role: (u.role || 'driver').toLowerCase(), created_at: u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : 'غير متوفر'
        })));

        const { data: wallets } = await supabase.from('wallets').select('*');
        if (wallets) {
          setTotalSystemDebt(wallets.reduce((acc, w) => acc + (w.system_balance || 0), 0));
          setDrivers(profiles.filter((p: any) => (p.role || '').toLowerCase() === 'driver').map((p: any) => {
            const w = wallets.find((wal: any) => wal.user_id === p.id);
            return { id: p.id.slice(0, 8), id_full: p.id, name: p.full_name || "بدون اسم", status: p.is_locked ? "محظور" : "نشط", isShiftLocked: p.is_locked, earnings: w?.balance || 0, debt: (w?.debt || 0) + (w?.system_balance || 0), totalOrders: 0 };
          }));
          setVendors(profiles.filter((p: any) => (p.role || '').toLowerCase() === 'vendor').map((p: any) => {
            const w = wallets.find((wal: any) => wal.user_id === p.id);
            return { id: p.id.slice(0, 8), id_full: p.id, name: p.full_name || "بدون اسم", type: "محل", orders: 0, balance: (w?.debt || 0) + (w?.system_balance || 0), status: "نشط", location: p.location };
          }));
        }
      }
    } catch (err) {
      console.error("Admin: Error fetching profiles:", err);
    }
  };

  const fetchSettlements = async () => {
    const { data } = await supabase.from('settlements').select('*, profiles!user_id(full_name, role)').eq('status', 'pending').order('created_at', { ascending: true });
    if (data) setSettlements(data);
  };

  const fetchAppConfig = async () => {
    const { data } = await supabase.from('app_config').select('*').single();
    if (data) setAppConfig(data);
  };

  const translateStatus = (status: string) => {
    const statuses: any = { pending: "جاري البحث", assigned: "تم التعيين", in_transit: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغي" };
    return statuses[status] || status;
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const { error } = await createUserByAdmin(newDriverData.email, newDriverData.password, newDriverData.name, 'driver', { phone: newDriverData.phone, area: newDriverData.area, vehicle_type: newDriverData.vehicle_type, national_id: newDriverData.national_id });
    if (!error) {
      alert("تم إنشاء حساب الطيار بنجاح!");
      setShowAddDriver(false);
      setNewDriverData({ name: "", email: "", password: "", phone: "", area: "", vehicle_type: "موتوسيكل", national_id: "" });
      fetchData();
    } else {
      alert(`خطأ: ${error.message}`);
    }
    setActionLoading(false);
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const { error } = await createUserByAdmin(newVendorData.email, newVendorData.password, newVendorData.name, 'vendor', { phone: newVendorData.phone });
    if (!error) {
      alert("تم إنشاء حساب المحل بنجاح!");
      setShowAddVendor(false);
      setNewVendorData({ name: "", email: "", password: "", phone: "" });
      fetchData();
    } else {
      alert(`خطأ: ${error.message}`);
    }
    setActionLoading(false);
  };

  const handleUpdateAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const { error } = await supabase.from('app_config').update(appConfig).eq('id', 1);
    if (!error) alert("تم تحديث إعدادات النظام بنجاح!");
    else alert(`خطأ: ${error.message}`);
    setActionLoading(false);
  };

  const handleSettlementAction = async (settlementId: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase.from('settlements').update({ status: newStatus }).eq('id', settlementId);
    if (!error) {
      alert("تم التحديث!");
      setSettlements(prev => prev.filter(s => s.id !== settlementId));
    }
  };

  const toggleShiftLock = async (driverId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_locked: !currentStatus }).eq('id', driverId);
    if (!error) setDrivers(prev => prev.map(d => d.id_full === driverId ? { ...d, isShiftLocked: !currentStatus, status: !currentStatus ? "محظور" : "نشط" } : d));
  };

  const handleResetUser = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من تصفير كافة بيانات ${userName}؟`)) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('reset_user_data_admin', { target_user_id: userId });
    if (!error) { alert("تم التصفير!"); fetchData(); }
    else alert(`خطأ: ${error.message}`);
    setActionLoading(false);
  };

  const handleGlobalReset = async () => {
    if (!confirm("تحذير: هل أنت متأكد من تصفير كافة بيانات النظام؟")) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('reset_all_system_data_admin');
    if (!error) { alert("تم التصفير الشامل!"); fetchData(); }
    else alert(`خطأ: ${error.message}`);
    setActionLoading(false);
  };

  const handleSignOut = async () => { await signOut(); router.push("/login"); };

  const stats = [
    { title: "إجمالي الطلبات", value: allOrders.length, icon: <Truck className="text-blue-500 w-5 h-5" />, trend: "+12%", trendType: 'positive' as const, subtitle: "طلب" },
    { title: "المناديب النشطين", value: drivers.filter(d => !d.isShiftLocked).length, icon: <Users className="text-green-500 w-5 h-5" />, trend: "+5%", trendType: 'positive' as const, subtitle: "كابتن" },
    { title: "صندوق التأمين", value: insuranceFund.toLocaleString(), icon: <ShieldCheck className="text-brand-red w-5 h-5" />, trend: "+2%", trendType: 'positive' as const, subtitle: "ج.م" },
    { title: "عمولات مستحقة", value: totalSystemDebt.toLocaleString(), icon: <Wallet className="text-purple-500 w-5 h-5" />, trend: "المديونية", trendType: 'neutral' as const, subtitle: "ج.م" },
  ];

  if (loading) return <AppLoader />;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-right relative overflow-hidden" dir="rtl">
      {/* Sidebar Overlay */}
      <AnimatePresence>{isMobile && sidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm lg:hidden" />}</AnimatePresence>

      {/* Sidebar */}
      <motion.aside initial={false} animate={{ width: sidebarOpen ? 280 : (isMobile ? 0 : 88), x: sidebarOpen ? 0 : (isMobile ? 280 : 0) }} className="bg-white border-l border-gray-100 fixed lg:relative z-[70] h-screen overflow-hidden shadow-sm flex flex-col">
        <div className="p-6 flex items-center gap-4 border-b border-gray-50 h-24">
          <div className="flex-shrink-0 bg-gray-50 p-2 rounded-2xl"><StartLogo className="w-10 h-10" /></div>
          {sidebarOpen && <div className="flex flex-col"><h1 className="text-xl font-bold text-gray-900 leading-none">START</h1><span className="text-[10px] font-bold text-gray-400 uppercase mt-1">Management</span></div>}
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: "dashboard", label: "لوحة التحكم", icon: <LayoutDashboard className="w-5 h-5" /> },
            { id: "orders", label: "المراقبة الحية", icon: <MapIcon className="w-5 h-5" /> },
            { id: "drivers", label: "المناديب", icon: <Users className="w-5 h-5" /> },
            { id: "vendors", label: "المحلات", icon: <Store className="w-5 h-5" /> },
            { id: "accounts", label: "الحسابات", icon: <ShieldCheck className="w-5 h-5" /> },
            { id: "settlements", label: "التسويات", icon: <Wallet className="w-5 h-5" />, badge: settlements.length },
            { id: "app_config", label: "التحديثات", icon: <RefreshCw className="w-5 h-5" /> },
            { id: "settings", label: "الإعدادات", icon: <Settings className="w-5 h-5" /> }
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id); if (isMobile) setSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeView === item.id ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-400 hover:bg-gray-50"}`}>
              {item.icon}{sidebarOpen && <span className="text-sm flex-1 text-right">{item.label}</span>}{item.badge ? <span className="bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-50"><button onClick={handleSignOut} className="w-full flex items-center gap-4 p-4 text-gray-400 hover:text-red-500 rounded-2xl transition-all">{sidebarOpen && <span className="text-sm font-bold flex-1 text-right">تسجيل الخروج</span>}<LogOut className="w-5 h-5" /></button></div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 h-20 px-8 border-b border-gray-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 bg-gray-50 text-gray-900 rounded-xl border border-gray-200">{sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
              <SyncIndicator lastSync={lastSync} isSyncing={isSyncing} />
              <div className="w-px h-3 bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-gray-400 uppercase">Live</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 p-1.5 pr-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-left hidden sm:block"><p className="text-xs font-black text-gray-900">أدمن ستارت</p><p className="text-[10px] font-bold text-blue-600">Admin Mode</p></div>
              <div className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center p-1"><StartLogo className="w-8 h-8" /></div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          {activeView === "dashboard" && (
            <>
              {activityLog.length > 0 && (
                <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-[32px] p-4 flex flex-col gap-2 relative shadow-sm overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600 animate-pulse" />
                  <div className="flex items-center gap-2 mb-1 px-2"><Activity className="w-3 h-3 text-blue-600" /><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Pulse</span></div>
                  <AnimatePresence mode="popLayout">{activityLog.map(log => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-between items-center px-4 py-2 bg-gray-50/50 rounded-xl">
                      <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_5px_#2563eb]" /><span className="text-xs font-bold text-gray-700">{log.text}</span></div><span className="text-[10px] font-bold text-gray-400">{log.time}</span>
                    </motion.div>
                  ))}</AnimatePresence>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                  <PremiumCard
                    key={idx}
                    title={stat.title}
                    value={stat.value}
                    icon={stat.icon}
                    trend={stat.trend}
                    trendType={stat.trendType}
                    subtitle={stat.subtitle}
                    delay={idx * 0.1}
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden h-[400px]">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-900">الخريطة الحية</h3><div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-brand-red text-[10px] font-bold">تحديث حي</span></div></div>
                  <div className="flex-1 relative h-[330px]"><LiveMap drivers={onlineDrivers} vendors={vendors.filter(v => v.location).map(v => ({ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng }))} zoom={12} className="h-full w-full" /></div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col justify-between">
                  <h3 className="font-bold text-gray-900 mb-6">الأنشطة الأخيرة</h3>
                  <div className="space-y-4 flex-1">{activities.map(act => (
                    <div key={act.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                      <div className="flex gap-4 items-center"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${act.type === 'order' ? 'bg-orange-50 text-brand-orange' : 'bg-blue-50 text-blue-500'}`}>{act.type === 'order' ? <Truck className="w-5 h-5" /> : <User className="w-5 h-5" />}</div><div><p className="text-sm font-bold text-gray-800">{act.text}</p><p className="text-[10px] text-gray-400 font-bold">{act.time}</p></div></div><ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  ))}</div>
                </div>
              </div>
            </>
          )}

          {activeView === "orders" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">الطلبات الحية ({liveOrders.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{liveOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4"><div><h3 className="font-bold text-gray-800">{order.vendor}</h3><p className="text-[10px] text-gray-400">#{order.id}</p></div><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold">{order.status}</span></div>
                  <div className="space-y-2 mb-6 text-xs text-gray-500"><p>العميل: {order.customer}</p><p>المندوب: {order.driver || "بانتظار تعيين..."}</p></div>
                  <div className="flex gap-2"><button className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all">تفاصيل</button></div>
                </div>
              ))}</div>
            </div>
          )}

          {activeView === "drivers" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-900">إدارة المناديب</h2><button onClick={() => setShowAddDriver(true)} className="bg-brand-red text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-brand-red/20"><Plus className="w-5 h-5" />إضافة طيار</button></div>
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 overflow-x-auto"><table className="w-full text-right"><thead><tr className="text-gray-400 text-xs border-b border-gray-50"><th className="pb-4 pr-4">المندوب</th><th className="pb-4 text-center">الأرباح</th><th className="pb-4 text-center">المديونية</th><th className="pb-4 text-center">الحالة</th><th className="pb-4 text-center">الإجراءات</th></tr></thead><tbody className="divide-y divide-gray-50 text-sm">{drivers.map(d => (
                <tr key={d.id} className="group hover:bg-gray-50/50 transition-colors"><td className="py-4 pr-4"><p className="font-bold text-gray-800">{d.name}</p><p className="text-[10px] text-gray-400">ID: {d.id}</p></td><td className="py-4 text-center font-bold text-green-600">{d.earnings} ج.م</td><td className="py-4 text-center font-bold text-brand-red">{d.debt} ج.م</td><td className="py-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${d.status === "نشط" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>{d.status}</span></td><td className="py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => toggleShiftLock(d.id_full, d.isShiftLocked)} className={`p-2 rounded-xl transition-all ${d.isShiftLocked ? "bg-red-500 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{d.isShiftLocked ? <ShieldCheck className="w-4 h-4" /> : <X className="w-4 h-4" />}</button><button onClick={() => handleResetUser(d.id_full, d.name)} className="p-2 bg-red-100 text-brand-red rounded-xl hover:bg-red-200"><RefreshCw className="w-4 h-4" /></button></div></td></tr>
              ))}</tbody></table></div>
            </div>
          )}

          {activeView === "vendors" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-900">إدارة المحلات</h2><button onClick={() => setShowAddVendor(true)} className="bg-brand-red text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-brand-red/20"><Plus className="w-5 h-5" />إضافة محل</button></div>
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 overflow-x-auto"><table className="w-full text-right"><thead><tr className="text-gray-400 text-xs border-b border-gray-50"><th className="pb-4 pr-4">المحل</th><th className="pb-4 text-center">الرصيد</th><th className="pb-4 text-center">الحالة</th><th className="pb-4 text-center">الإجراءات</th></tr></thead><tbody className="divide-y divide-gray-50 text-sm">{vendors.map(v => (
                <tr key={v.id} className="group hover:bg-gray-50/50 transition-colors"><td className="py-4 pr-4"><p className="font-bold text-gray-800">{v.name}</p><p className="text-[10px] text-gray-400">ID: {v.id}</p></td><td className="py-4 text-center font-bold text-green-600">{v.balance} ج.م</td><td className="py-4 text-center"><span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold">{v.status}</span></td><td className="py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => handleResetUser(v.id_full, v.name)} className="p-2 bg-red-100 text-brand-red rounded-xl hover:bg-red-200"><RefreshCw className="w-4 h-4" /></button></div></td></tr>
              ))}</tbody></table></div>
            </div>
          )}

          {activeView === "accounts" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between"><div><p className="text-xs font-bold text-blue-900">حالة جلب البيانات</p><p className="text-[10px] text-blue-700">عدد الحسابات: {debugInfo.profilesCount}</p></div><button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-blue-700 transition-colors">تحديث يدوي</button></div>
              <AccountsView users={allUsers} />
            </div>
          )}

          {activeView === "settlements" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">طلبات التسوية ({settlements.length})</h2>
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="text-gray-400 text-xs border-b border-gray-50">
                      <th className="pb-4 pr-4">المستخدم</th>
                      <th className="pb-4 text-center">النوع</th>
                      <th className="pb-4 text-center">المبلغ</th>
                      <th className="pb-4 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {settlements.map(s => (
                      <tr key={s.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pr-4"><p className="font-bold text-gray-800">{s.profiles?.full_name || "غير معروف"}</p></td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${s.profiles?.role === 'vendor' ? 'bg-orange-50 text-brand-orange' : 'bg-blue-50 text-blue-600'}`}>
                            {s.profiles?.role === 'vendor' ? 'محل' : 'طيار'}
                          </span>
                        </td>
                        <td className="py-4 text-center font-bold text-brand-red">{s.amount} ج.م</td>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleSettlementAction(s.id, 'approved')} className="bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold">موافقة</button>
                            <button onClick={() => handleSettlementAction(s.id, 'rejected')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold">رفض</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {settlements.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-sm text-gray-400 font-bold">لا توجد طلبات معلقة</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === "app_config" && (
            <div className="max-w-4xl space-y-8">
              <h2 className="text-2xl font-bold text-gray-900">إدارة التحديثات</h2>
              <form onSubmit={handleUpdateAppConfig} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 mb-2"><RefreshCw className="text-blue-500 w-6 h-6" /><h3 className="font-bold text-gray-800">إصدار التطبيق</h3></div>
                  <div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-400 block mb-2">أحدث إصدار</label><input type="text" value={appConfig.latest_version} onChange={(e) => setAppConfig({...appConfig, latest_version: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none" /></div><div><label className="text-xs font-bold text-gray-400 block mb-2">أدنى إصدار</label><input type="text" value={appConfig.min_version} onChange={(e) => setAppConfig({...appConfig, min_version: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none" /></div></div><input type="url" value={appConfig.download_url} onChange={(e) => setAppConfig({...appConfig, download_url: e.target.value})} placeholder="رابط APK" className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-left" dir="ltr" /><div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl"><div><p className="text-sm font-bold text-gray-800">تحديث إجباري</p></div><input type="checkbox" checked={appConfig.force_update} onChange={(e) => setAppConfig({...appConfig, force_update: e.target.checked})} className="w-6 h-6 accent-blue-600" /></div></div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6"><div className="flex items-center gap-3 mb-2"><AlertCircle className="text-blue-500 w-6 h-6" /><h3 className="font-bold text-gray-800">رسالة التحديث</h3></div><div className="space-y-4"><textarea rows={4} value={appConfig.update_message} onChange={(e) => setAppConfig({...appConfig, update_message: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none resize-none" /><button type="submit" disabled={actionLoading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform shadow-lg shadow-blue-600/20">{actionLoading ? "جاري الحفظ..." : "حفظ التغييرات"}</button></div></div>
              </form>
            </div>
          )}

          {activeView === "settings" && (
            <div className="max-w-4xl space-y-8">
              <h2 className="text-2xl font-bold text-gray-900">مركز التحكم المالي</h2>
              <form onSubmit={handleUpdateAppConfig} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="text-brand-red w-6 h-6" />
                      <h3 className="font-bold text-gray-800">العمولات والرسوم</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-2">عمولة الطيار (%)</label>
                        <input type="number" step="0.1" value={appConfig.driver_commission} onChange={(e) => setAppConfig({...appConfig, driver_commission: Number(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-2">عمولة المحل (%)</label>
                        <input type="number" step="0.1" value={appConfig.vendor_commission} onChange={(e) => setAppConfig({...appConfig, vendor_commission: Number(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-2">تأمين المحل (ج.م لكل طلب)</label>
                        <input type="number" step="0.1" value={appConfig.vendor_fee} onChange={(e) => setAppConfig({...appConfig, vendor_fee: Number(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-2">تأمين الطيار (ج.م لكل طلب)</label>
                        <input type="number" step="0.1" value={appConfig.safe_ride_fee} onChange={(e) => setAppConfig({...appConfig, safe_ride_fee: Number(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Trash2 className="text-brand-red w-6 h-6" />
                      <h3 className="font-bold text-red-900">منطقة الخطر</h3>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs text-red-600 font-bold">حذف كافة الطلبات وتصفير كافة محافظ المستخدمين نهائياً.</p>
                      <button type="button" onClick={handleGlobalReset} disabled={actionLoading} className="w-full bg-brand-red text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-brand-red/20">
                        <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                        {actionLoading ? "جاري التصفير..." : "تصفير شامل للنظام"}
                      </button>
                    </div>
                  </div>
                </div>
                
                <button type="submit" disabled={actionLoading} className="w-full bg-gray-900 text-white py-5 rounded-3xl font-bold shadow-xl active:scale-[0.98] transition-all">
                  {actionLoading ? "جاري الحفظ..." : "حفظ كافة الإعدادات المالية"}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Add Driver Modal */}
      <AnimatePresence>
        {showAddDriver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowAddDriver(false)} className="absolute top-6 left-6 p-2 bg-gray-50 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
              <h2 className="text-2xl font-black text-gray-900 mb-8">إضافة طيار جديد</h2>
              <form onSubmit={handleAddDriver} className="space-y-6">
                <input type="text" placeholder="الاسم بالكامل" required value={newDriverData.name} onChange={e => setNewDriverData({...newDriverData, name: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none" />
                <input type="email" placeholder="البريد الإلكتروني" required value={newDriverData.email} onChange={e => setNewDriverData({...newDriverData, email: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none" />
                <input type="password" placeholder="كلمة السر" required value={newDriverData.password} onChange={e => setNewDriverData({...newDriverData, password: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none" />
                <input type="tel" placeholder="رقم الهاتف" required value={newDriverData.phone} onChange={e => setNewDriverData({...newDriverData, phone: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none" />
                <button type="submit" disabled={actionLoading} className="w-full bg-brand-red text-white py-5 rounded-2xl font-bold shadow-xl shadow-brand-red/20">{actionLoading ? "جاري الإنشاء..." : "إضافة الحساب الآن"}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Vendor Modal */}
      <AnimatePresence>
        {showAddVendor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative">
              <button onClick={() => setShowAddVendor(false)} className="absolute top-6 left-6 p-2 bg-gray-50 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
              <h2 className="text-2xl font-black text-gray-900 mb-8">إضافة محل جديد</h2>
              <form onSubmit={handleAddVendor} className="space-y-6">
                <input type="text" placeholder="اسم المحل" required value={newVendorData.name} onChange={e => setNewVendorData({...newVendorData, name: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none" />
                <input type="email" placeholder="البريد الإلكتروني" required value={newVendorData.email} onChange={e => setNewVendorData({...newVendorData, email: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none" />
                <input type="password" placeholder="كلمة السر" required value={newVendorData.password} onChange={e => setNewVendorData({...newVendorData, password: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none" />
                <button type="submit" disabled={actionLoading} className="w-full bg-brand-red text-white py-5 rounded-2xl font-bold shadow-xl shadow-brand-red/20">{actionLoading ? "جاري الإنشاء..." : "إضافة الحساب الآن"}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
