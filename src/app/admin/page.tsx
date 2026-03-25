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
  loading: () => <div className="h-[500px] w-full bg-brand-card animate-pulse rounded-[40px] flex items-center justify-center text-gray-500 font-bold border border-brand-border">جاري تحميل الخريطة...</div>
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
import { useSync } from "@/hooks/useSync";

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
    const init = async () => {
      await fetchData();
      setLoading(false);
<<<<<<< HEAD
=======

      // Real-time Subscriptions with smart updates
      ordersSub = subscribeToOrders(() => {
        fetchOrders();
        fetchSettlements();
      });

      profilesSub = subscribeToProfiles((payload) => {
        const { eventType, new: newProfile } = payload;
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
        fetchProfiles();
      });

      walletsSub = supabase
        .channel('admin_wallets_all')
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'wallets' }, 
          () => {
            fetchProfiles();
          }
        )
        .subscribe();

      settlementsSub = supabase
        .channel('admin_settlements_all')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'settlements' },
          () => fetchSettlements()
        )
        .subscribe();
>>>>>>> 4f3a7978a70c576d8c07e817f760035194f82d4b
    };

    init();
  }, [router]);

  useEffect(() => {
    if (allOrders.length > 0) {
      const profits = allOrders.reduce((acc, order) => {
        if (order.status === "delivered") {
          const financials = order.financials || {};
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
<<<<<<< HEAD
    { title: "إجمالي الطلبات", value: allOrders.length, icon: <Truck className="text-blue-500 w-5 h-5" />, trend: "+12%", trendType: 'positive' as const, subtitle: "طلب" },
    { title: "المناديب النشطين", value: drivers.filter(d => !d.isShiftLocked).length, icon: <Users className="text-green-500 w-5 h-5" />, trend: "+5%", trendType: 'positive' as const, subtitle: "كابتن" },
    { title: "صندوق التأمين", value: insuranceFund.toLocaleString(), icon: <ShieldCheck className="text-brand-red w-5 h-5" />, trend: "+2%", trendType: 'positive' as const, subtitle: "ج.م" },
    { title: "عمولات مستحقة", value: totalSystemDebt.toLocaleString(), icon: <Wallet className="text-purple-500 w-5 h-5" />, trend: "المديونية", trendType: 'neutral' as const, subtitle: "ج.م" },
  ];

  if (loading) return <AppLoader />;

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex font-sans text-right relative overflow-hidden" dir="rtl">
      <div className="silver-live-bg" />
      {/* Sidebar Overlay */}
      <AnimatePresence>{isMobile && sidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm lg:hidden" />}</AnimatePresence>

      {/* Sidebar */}
      <motion.aside initial={false} animate={{ width: sidebarOpen ? 280 : (isMobile ? 0 : 88), x: sidebarOpen ? 0 : (isMobile ? 280 : 0) }} className="bg-white/40 backdrop-blur-xl border-l border-white/20 fixed lg:relative z-[70] h-screen overflow-hidden shadow-sm flex flex-col">
        <div className="p-6 flex items-center gap-4 border-b border-gray-50 h-24">
          <div className="flex-shrink-0 bg-gray-50 p-2 rounded-2xl"><StartLogo className="w-10 h-10" /></div>
          {sidebarOpen && <div className="flex flex-col"><h1 className="text-xl font-bold text-gray-900 leading-none">START</h1><span className="text-[10px] font-bold text-gray-400 uppercase mt-1">Management</span></div>}
=======
    { title: "إجمالي الطلبات", value: allOrders.length.toString(), icon: <Truck className="text-brand-primary w-6 h-6" />, trend: "+12%" },
    { title: "المناديب النشطين", value: drivers.filter(d => !d.isShiftLocked).length.toString(), icon: <Users className="text-brand-success w-6 h-6" />, trend: "+5%" },
    { title: "صندوق التأمين", value: `${insuranceFund.toLocaleString()} ج.م`, icon: <ShieldCheck className="text-brand-secondary w-6 h-6" />, trend: "+2%" },
    { title: "عمولات مستحقة", value: `${totalSystemDebt.toLocaleString()} ج.م`, icon: <Wallet className="text-brand-info w-6 h-6" />, trend: "المديونية" },
  ];

  if (loading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center font-bold text-gray-500">جاري تحميل النظام...</div>;

  return (
    <div className="min-h-screen bg-brand-dark flex font-sans text-right relative overflow-hidden selection:bg-brand-primary/10" dir="rtl">
      <AnimatePresence>{isMobile && sidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/70 z-[60] backdrop-blur-sm lg:hidden" />}</AnimatePresence>

      <motion.aside initial={false} animate={{ width: sidebarOpen ? 280 : (isMobile ? 0 : 88), x: sidebarOpen ? 0 : (isMobile ? 280 : 0) }} className="bg-brand-card border-l border-brand-border fixed lg:relative z-[70] h-screen overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 flex items-center gap-4 border-b border-brand-border h-24">
          <div className="flex-shrink-0 bg-brand-muted p-2 rounded-2xl border border-brand-border"><StartLogo className="w-10 h-10" /></div>
          {sidebarOpen && <div className="flex flex-col"><h1 className="text-xl font-black text-white leading-none">START</h1><span className="text-[10px] font-bold text-brand-primary uppercase mt-1">Management OS</span></div>}
>>>>>>> 4f3a7978a70c576d8c07e817f760035194f82d4b
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
            <button key={item.id} onClick={() => { setActiveView(item.id); if (isMobile) setSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeView === item.id ? "bg-brand-primary/10 text-brand-primary font-bold shadow-lg shadow-brand-primary/5" : "text-gray-500 hover:bg-brand-muted hover:text-gray-300"}`}>
              {item.icon}{sidebarOpen && <span className="text-sm flex-1 text-right">{item.label}</span>}{item.badge ? <span className="bg-brand-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-border"><button onClick={handleSignOut} className="w-full flex items-center gap-4 p-4 text-gray-500 hover:text-brand-secondary rounded-2xl transition-all">{sidebarOpen && <span className="text-sm font-bold flex-1 text-right">تسجيل الخروج</span>}<LogOut className="w-5 h-5" /></button></div>
      </motion.aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-brand-dark/80 backdrop-blur-md sticky top-0 z-40 h-20 px-8 border-b border-brand-border flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-6">
<<<<<<< HEAD
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 bg-gray-50 text-gray-900 rounded-xl border border-gray-200">{sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
              <SyncIndicator lastSync={lastSync} isSyncing={isSyncing} />
              <div className="w-px h-3 bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-gray-400 uppercase">Live</span>
              </div>
=======
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 bg-brand-card text-white rounded-xl border border-brand-border hover:bg-brand-muted transition-colors">{sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <div className="relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-primary transition-colors" />
              <input type="text" placeholder="بحث سريع في النظام..." className="bg-brand-muted border border-brand-border text-white pr-11 pl-4 py-2.5 rounded-2xl text-xs outline-none focus:ring-2 ring-brand-primary/20 w-64 transition-all focus:bg-transparent" />
            </div>
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-brand-muted rounded-2xl border border-brand-border">
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" /><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Live System</span></div>
              <div className="w-px h-3 bg-brand-border" /><div className="flex items-center gap-2"><Activity className="w-3 h-3 text-brand-primary" /><span className="text-[10px] font-bold text-gray-400">{lastSyncTime.toLocaleTimeString('ar-EG')}</span></div>
>>>>>>> 4f3a7978a70c576d8c07e817f760035194f82d4b
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 p-1.5 pr-4 bg-brand-card rounded-2xl border border-brand-border shadow-lg">
              <div className="text-left hidden sm:block"><p className="text-xs font-black text-white">أدمن ستارت</p><p className="text-[10px] font-bold text-brand-primary">Control Center</p></div>
              <div className="w-10 h-10 bg-brand-muted rounded-xl border border-brand-border flex items-center justify-center p-1"><StartLogo className="w-8 h-8" /></div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          {activeView === "dashboard" && (
            <>
              {activityLog.length > 0 && (
                <div className="bg-brand-card/50 backdrop-blur-md border border-brand-border rounded-[32px] p-4 flex flex-col gap-2 relative shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-brand-primary animate-pulse" />
                  <div className="flex items-center gap-2 mb-1 px-2"><Activity className="w-3 h-3 text-brand-primary" /><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global Pulse</span></div>
                  <AnimatePresence mode="popLayout">{activityLog.map(log => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-between items-center px-4 py-2 bg-brand-muted/50 rounded-xl border border-brand-border/20">
                      <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_#3b82f6]" /><span className="text-xs font-bold text-gray-300">{log.text}</span></div><span className="text-[10px] font-bold text-gray-500">{log.time}</span>
                    </motion.div>
                  ))}</AnimatePresence>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
<<<<<<< HEAD
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
=======
                  <div key={idx} className="bg-brand-card p-6 rounded-3xl border border-brand-border shadow-xl flex items-center justify-between hover:border-brand-primary/30 transition-all group">
                    <div><p className="text-gray-500 text-xs mb-1 font-bold">{stat.title}</p><h3 className="text-2xl font-black text-white">{stat.value}</h3><span className="text-[10px] text-brand-success font-bold">{stat.trend}</span></div>
                    <div className="w-12 h-12 bg-brand-muted rounded-2xl flex items-center justify-center border border-brand-border group-hover:bg-brand-primary/10 transition-colors">{stat.icon}</div>
                  </div>
>>>>>>> 4f3a7978a70c576d8c07e817f760035194f82d4b
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-brand-card rounded-[40px] border border-brand-border shadow-2xl overflow-hidden h-[400px]">
                  <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-muted/30"><h3 className="font-bold text-white">الخريطة الحية للمناديب</h3><div className="flex items-center gap-2"><div className="w-2 h-2 bg-brand-success rounded-full animate-pulse" /><span className="text-brand-secondary text-[10px] font-black uppercase tracking-widest">Active Tracking</span></div></div>
                  <div className="flex-1 relative h-[330px]"><LiveMap drivers={onlineDrivers} vendors={vendors.filter(v => v.location).map(v => ({ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng }))} zoom={12} className="h-full w-full grayscale invert brightness-90 contrast-125" /></div>
                </div>
                <div className="bg-brand-card p-8 rounded-[40px] border border-brand-border shadow-2xl flex flex-col justify-between">
                  <h3 className="font-bold text-white mb-6 border-b border-brand-border pb-4">الأنشطة الأخيرة</h3>
                  <div className="space-y-4 flex-1">{activities.map(act => (
                    <div key={act.id} className="flex items-center justify-between p-4 bg-brand-muted/50 rounded-2xl border border-brand-border/50 hover:bg-brand-muted transition-colors">
                      <div className="flex gap-4 items-center"><div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-brand-border ${act.type === 'order' ? 'bg-brand-warning/10 text-brand-warning' : 'bg-brand-primary/10 text-brand-primary'}`}>{act.type === 'order' ? <Truck className="w-5 h-5" /> : <User className="w-5 h-5" />}</div><div><p className="text-sm font-bold text-gray-300">{act.text}</p><p className="text-[10px] text-gray-500 font-bold">{act.time}</p></div></div><ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  ))}</div>
                </div>
              </div>
            </>
          )}

          {activeView === "orders" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">الطلبات الحية ({liveOrders.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{liveOrders.map(order => (
                <div key={order.id} className="bg-brand-card p-6 rounded-[32px] border border-brand-border shadow-2xl">
                  <div className="flex justify-between items-start mb-4"><div><h3 className="font-bold text-white">{order.vendor}</h3><p className="text-[10px] text-gray-500 font-bold tracking-widest">#{order.id}</p></div><span className="bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full text-[10px] font-black border border-brand-primary/20">{order.status}</span></div>
                  <div className="space-y-2 mb-6 text-xs text-gray-400 font-bold"><p>العميل: {order.customer}</p><p>المندوب: {order.driver || "بانتظار تعيين..."}</p></div>
                  <div className="flex gap-2"><button className="flex-1 bg-brand-muted text-gray-300 py-3 rounded-xl text-xs font-bold hover:bg-brand-card hover:text-white border border-brand-border transition-all">فتح التفاصيل</button></div>
                </div>
              ))}</div>
            </div>
          )}

          {activeView === "drivers" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-white">إدارة المناديب</h2><button onClick={() => setShowAddDriver(true)} className="bg-brand-secondary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-brand-secondary/20 hover:scale-105 transition-transform"><Plus className="w-5 h-5" />إضافة طيار</button></div>
              <div className="bg-brand-card rounded-[40px] border border-brand-border shadow-2xl p-6 overflow-x-auto"><table className="w-full text-right"><thead><tr className="text-gray-500 text-xs border-b border-brand-border"><th className="pb-4 pr-4">المندوب</th><th className="pb-4 text-center">الأرباح</th><th className="pb-4 text-center">المديونية</th><th className="pb-4 text-center">الحالة</th><th className="pb-4 text-center">الإجراءات</th></tr></thead><tbody className="divide-y divide-brand-border text-sm">{drivers.map(d => (
                <tr key={d.id} className="group hover:bg-brand-muted/30 transition-colors"><td className="py-4 pr-4"><p className="font-bold text-white">{d.name}</p><p className="text-[10px] text-gray-500 font-bold">ID: {d.id}</p></td><td className="py-4 text-center font-black text-brand-success">{d.earnings} ج.م</td><td className="py-4 text-center font-black text-brand-secondary">{d.debt} ج.م</td><td className="py-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black ${d.status === "نشط" ? "bg-brand-success/10 text-brand-success border border-brand-success/20" : "bg-brand-muted text-gray-500 border border-brand-border"}`}>{d.status}</span></td><td className="py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => toggleShiftLock(d.id_full, d.isShiftLocked)} className={`p-2 rounded-xl transition-all border ${d.isShiftLocked ? "bg-brand-secondary text-white border-brand-secondary shadow-lg shadow-brand-secondary/20" : "bg-brand-muted text-gray-400 border-brand-border hover:text-white"}`}>{d.isShiftLocked ? <ShieldCheck className="w-4 h-4" /> : <X className="w-4 h-4" />}</button><button onClick={() => handleResetUser(d.id_full, d.name)} className="p-2 bg-brand-secondary/10 text-brand-secondary rounded-xl hover:bg-brand-secondary/20 border border-brand-secondary/20"><RefreshCw className="w-4 h-4" /></button></div></td></tr>
              ))}</tbody></table></div>
            </div>
          )}

          {activeView === "vendors" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-white">إدارة المحلات</h2><button onClick={() => setShowAddVendor(true)} className="bg-brand-secondary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-brand-secondary/20 hover:scale-105 transition-transform"><Plus className="w-5 h-5" />إضافة محل</button></div>
              <div className="bg-brand-card rounded-[40px] border border-brand-border shadow-2xl p-6 overflow-x-auto"><table className="w-full text-right"><thead><tr className="text-gray-500 text-xs border-b border-brand-border"><th className="pb-4 pr-4">المحل</th><th className="pb-4 text-center">الرصيد</th><th className="pb-4 text-center">الحالة</th><th className="pb-4 text-center">الإجراءات</th></tr></thead><tbody className="divide-y divide-brand-border text-sm">{vendors.map(v => (
                <tr key={v.id} className="group hover:bg-brand-muted/30 transition-colors"><td className="py-4 pr-4"><p className="font-bold text-white">{v.name}</p><p className="text-[10px] text-gray-500 font-bold">ID: {v.id}</p></td><td className="py-4 text-center font-black text-brand-success">{v.balance} ج.م</td><td className="py-4 text-center"><span className="px-3 py-1 bg-brand-success/10 text-brand-success rounded-full text-[10px] font-black border border-brand-success/20">{v.status}</span></td><td className="py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => handleResetUser(v.id_full, v.name)} className="p-2 bg-brand-secondary/10 text-brand-secondary rounded-xl hover:bg-brand-secondary/20 border border-brand-secondary/20"><RefreshCw className="w-4 h-4" /></button></div></td></tr>
              ))}</tbody></table></div>
            </div>
          )}

          {activeView === "accounts" && (
            <div className="space-y-4">
              <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-2xl flex items-center justify-between"><div><p className="text-xs font-black text-brand-primary uppercase">Sync Status</p><p className="text-[10px] text-gray-400 font-bold">عدد الحسابات المسجلة: {debugInfo.profilesCount}</p></div><button onClick={fetchData} className="bg-brand-primary text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20 flex items-center gap-2"><RefreshCw className="w-3 h-3" />تحديث البيانات</button></div>
              <div className="bg-brand-card border border-brand-border rounded-[40px] p-6 shadow-2xl"><AccountsView users={allUsers} /></div>
            </div>
          )}

          {activeView === "settlements" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">طلبات التسوية ({settlements.length})</h2>
              <div className="bg-brand-card rounded-[40px] border border-brand-border shadow-2xl p-6 overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-brand-border">
                      <th className="pb-4 pr-4">المستخدم</th>
                      <th className="pb-4 text-center">النوع</th>
                      <th className="pb-4 text-center">المبلغ</th>
                      <th className="pb-4 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border text-sm">
                    {settlements.map(s => (
                      <tr key={s.id} className="group hover:bg-brand-muted/30 transition-colors">
                        <td className="py-4 pr-4"><p className="font-bold text-white">{s.profiles?.full_name || "غير معروف"}</p></td>
                        <td className="py-4 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${s.profiles?.role === 'vendor' ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/20' : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'}`}>
                            {s.profiles?.role === 'vendor' ? 'محل' : 'طيار'}
                          </span>
                        </td>
                        <td className="py-4 text-center font-black text-brand-secondary">{s.amount} ج.م</td>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleSettlementAction(s.id, 'approved')} className="bg-brand-success text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-brand-success/20 hover:scale-105 transition-transform">موافقة</button>
                            <button onClick={() => handleSettlementAction(s.id, 'rejected')} className="bg-brand-muted text-gray-400 px-4 py-2 rounded-xl text-xs font-black border border-brand-border hover:text-white transition-colors">رفض</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {settlements.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-brand-success mx-auto mb-4 opacity-20" />
                    <p className="text-sm text-gray-500 font-black uppercase tracking-widest">No Pending Requests</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === "app_config" && (
            <div className="max-w-4xl space-y-8">
              <h2 className="text-2xl font-black text-white">إدارة تحديثات النظام</h2>
              <form onSubmit={handleUpdateAppConfig} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-brand-card p-8 rounded-[40px] border border-brand-border shadow-2xl space-y-6">
                  <div className="flex items-center gap-3 mb-2"><RefreshCw className="text-brand-primary w-6 h-6" /><h3 className="font-bold text-white">إصدار START-OS</h3></div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Latest</label><input type="text" value={appConfig.latest_version} onChange={(e) => setAppConfig({...appConfig, latest_version: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border focus:border-brand-primary transition-colors" /></div>
                      <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Minimum</label><input type="text" value={appConfig.min_version} onChange={(e) => setAppConfig({...appConfig, min_version: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border focus:border-brand-primary transition-colors" /></div>
                    </div>
                    <input type="url" value={appConfig.download_url} onChange={(e) => setAppConfig({...appConfig, download_url: e.target.value})} placeholder="رابط APK الجديد" className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-left text-white border border-brand-border" dir="ltr" />
                    <div className="flex items-center justify-between p-4 bg-brand-muted rounded-2xl border border-brand-border"><div><p className="text-sm font-bold text-white">تحديث إجباري</p></div><input type="checkbox" checked={appConfig.force_update} onChange={(e) => setAppConfig({...appConfig, force_update: e.target.checked})} className="w-6 h-6 accent-brand-primary" /></div>
                  </div>
                </div>
                <div className="bg-brand-card p-8 rounded-[40px] border border-brand-border shadow-2xl space-y-6">
                  <div className="flex items-center gap-3 mb-2"><AlertCircle className="text-brand-primary w-6 h-6" /><h3 className="font-bold text-white">رسالة التحديث</h3></div>
                  <div className="space-y-4">
                    <textarea rows={4} value={appConfig.update_message} onChange={(e) => setAppConfig({...appConfig, update_message: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none resize-none text-white border border-brand-border focus:border-brand-primary" />
                    <button type="submit" disabled={actionLoading} className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-brand-primary/20 active:scale-95 transition-all">{actionLoading ? "جاري الحفظ..." : "حفظ إعدادات التحديث"}</button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeView === "settings" && (
            <div className="max-w-4xl space-y-8">
              <h2 className="text-2xl font-black text-white">التحكم المالي والسياسات</h2>
              <form onSubmit={handleUpdateAppConfig} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-brand-card p-8 rounded-[40px] border border-brand-border shadow-2xl space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="text-brand-secondary w-6 h-6" />
                      <h3 className="font-bold text-white">العمولات والرسوم</h3>
                    </div>
                    <div className="space-y-4">
                      <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">عمولة الطيار (%)</label><input type="number" step="0.1" value={appConfig.driver_commission} onChange={(e) => setAppConfig({...appConfig, driver_commission: Number(e.target.value)})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" /></div>
                      <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">عمولة المحل (%)</label><input type="number" step="0.1" value={appConfig.vendor_commission} onChange={(e) => setAppConfig({...appConfig, vendor_commission: Number(e.target.value)})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" /></div>
                      <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">تأمين المحل (ج.م)</label><input type="number" step="0.1" value={appConfig.vendor_fee} onChange={(e) => setAppConfig({...appConfig, vendor_fee: Number(e.target.value)})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" /></div>
                      <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">تأمين الطيار (ج.م)</label><input type="number" step="0.1" value={appConfig.safe_ride_fee} onChange={(e) => setAppConfig({...appConfig, safe_ride_fee: Number(e.target.value)})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" /></div>
                    </div>
                  </div>

                  <div className="bg-brand-secondary/5 p-8 rounded-[40px] border border-brand-secondary/20 shadow-2xl space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Trash2 className="text-brand-secondary w-6 h-6" />
                      <h3 className="font-bold text-brand-secondary uppercase tracking-tighter">Danger Zone</h3>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] text-brand-secondary font-black uppercase tracking-widest">Permanent System Reset</p>
                      <p className="text-xs text-gray-500 font-bold">سيتم حذف كافة الطلبات وتصفير المحافظ تماماً.</p>
                      <button type="button" onClick={handleGlobalReset} disabled={actionLoading} className="w-full bg-brand-secondary text-white py-4 rounded-2xl font-black active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-brand-secondary/20">
                        <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                        {actionLoading ? "جاري التصفير..." : "تصفير النظام بالكامل"}
                      </button>
                    </div>
                  </div>
                </div>
                
                <button type="submit" disabled={actionLoading} className="w-full bg-white text-brand-dark py-5 rounded-[32px] font-black text-lg shadow-2xl hover:bg-gray-100 transition-all active:scale-[0.98]">
                  {actionLoading ? "جاري الحفظ..." : "حفظ كافة الإعدادات المالية"}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showAddDriver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-brand-card w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative border border-brand-border overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowAddDriver(false)} className="absolute top-6 left-6 p-2 bg-brand-muted rounded-full text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              <h2 className="text-2xl font-black text-white mb-8 border-b border-brand-border pb-4">إضافة طيار جديد</h2>
              <form onSubmit={handleAddDriver} className="space-y-6">
                <input type="text" placeholder="الاسم بالكامل" required value={newDriverData.name} onChange={e => setNewDriverData({...newDriverData, name: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" />
                <input type="email" placeholder="البريد الإلكتروني" required value={newDriverData.email} onChange={e => setNewDriverData({...newDriverData, email: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" />
                <input type="password" placeholder="كلمة السر" required value={newDriverData.password} onChange={e => setNewDriverData({...newDriverData, password: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" />
                <input type="tel" placeholder="رقم الهاتف" required value={newDriverData.phone} onChange={e => setNewDriverData({...newDriverData, phone: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" />
                <button type="submit" disabled={actionLoading} className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black shadow-xl shadow-brand-primary/20 hover:scale-105 transition-transform">{actionLoading ? "جاري الإنشاء..." : "إضافة الحساب الآن"}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddVendor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-brand-card w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative border border-brand-border">
              <button onClick={() => setShowAddVendor(false)} className="absolute top-6 left-6 p-2 bg-brand-muted rounded-full text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              <h2 className="text-2xl font-black text-white mb-8 border-b border-brand-border pb-4">إضافة محل جديد</h2>
              <form onSubmit={handleAddVendor} className="space-y-6">
                <input type="text" placeholder="اسم المحل" required value={newVendorData.name} onChange={e => setNewVendorData({...newVendorData, name: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" />
                <input type="email" placeholder="البريد الإلكتروني" required value={newVendorData.email} onChange={e => setNewVendorData({...newVendorData, email: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" />
                <input type="password" placeholder="كلمة السر" required value={newVendorData.password} onChange={e => setNewVendorData({...newVendorData, password: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl outline-none text-white border border-brand-border" />
                <button type="submit" disabled={actionLoading} className="w-full bg-brand-warning text-brand-dark py-5 rounded-2xl font-black shadow-xl shadow-brand-warning/20 hover:scale-105 transition-transform">{actionLoading ? "جاري الإنشاء..." : "إضافة الحساب الآن"}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
