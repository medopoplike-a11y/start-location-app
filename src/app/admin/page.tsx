"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Users, 
  Store, 
  ShieldCheck,
  Settings,
  AlertCircle,
  Truck,
  DollarSign,
  Menu,
  X,
  ChevronRight,
  LogOut, 
  Plus, 
  CheckCircle,
  User,
  Wallet,
  RefreshCw,
  Activity,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { 
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-gray-900/50 animate-pulse rounded-[40px] flex items-center justify-center text-gray-500 font-bold border border-white/10">جاري تحميل الخريطة...</div>
});

const AccountsView = dynamic(() => import('./AccountsView'), { ssr: false });

import { signOut, createUserByAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { StartLogo } from "@/components/StartLogo";
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
  const { lastSync, isSyncing } = useSync(undefined, () => fetchData(), true);

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
    };
    init();
  }, []);

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
    { title: "صندوق التأمين", value: insuranceFund.toLocaleString(), icon: <ShieldCheck className="text-red-500 w-5 h-5" />, trend: "+2%", trendType: 'positive' as const, subtitle: "ج.م" },
    { title: "عمولات مستحقة", value: totalSystemDebt.toLocaleString(), icon: <Wallet className="text-purple-500 w-5 h-5" />, trend: "المديونية", trendType: 'neutral' as const, subtitle: "ج.م" },
  ];

  if (loading) return <AppLoader />;

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex font-sans text-right relative overflow-hidden" dir="rtl">
      <div className="silver-live-bg" />

      {/* Sidebar */}
      <motion.aside initial={false} animate={{ width: sidebarOpen ? 280 : (isMobile ? 0 : 88), x: sidebarOpen ? 0 : (isMobile ? 280 : 0) }} className="bg-white/40 backdrop-blur-xl border-l border-white/20 fixed lg:relative z-[70] h-screen overflow-hidden shadow-sm flex flex-col">
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
            <button key={item.id} onClick={() => { setActiveView(item.id); if (isMobile) setSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeView === item.id ? "bg-blue-600/10 text-blue-600 font-bold" : "text-gray-500 hover:bg-gray-100"}`}>
              {item.icon}{sidebarOpen && <span className="text-sm flex-1 text-right">{item.label}</span>}{item.badge ? <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100"><button onClick={handleSignOut} className="w-full flex items-center gap-4 p-4 text-gray-500 hover:text-red-500 rounded-2xl transition-all">{sidebarOpen && <span className="text-sm font-bold flex-1 text-right">تسجيل الخروج</span>}<LogOut className="w-5 h-5" /></button></div>
      </motion.aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 h-20 px-8 border-b border-gray-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 bg-gray-50 text-gray-900 rounded-xl border border-gray-200">{sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
              <SyncIndicator lastSync={lastSync} isSyncing={isSyncing} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 p-1.5 pr-4 bg-white rounded-2xl border border-gray-100">
              <div className="text-left hidden sm:block"><p className="text-xs font-black text-gray-900">أدمن ستارت</p><p className="text-[10px] font-bold text-blue-600">Control Center</p></div>
              <div className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center p-1"><StartLogo className="w-8 h-8" /></div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          <Suspense fallback={<AppLoader />}>
            {activeView === "dashboard" && (
              <>
                {activityLog.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-[32px] p-4 flex flex-col gap-2 relative shadow-sm overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600" />
                    <AnimatePresence mode="popLayout">{activityLog.map(log => (
                      <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-between items-center px-4 py-2 hover:bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-600" /><span className="text-xs font-bold text-gray-700">{log.text}</span></div><span className="text-[10px] font-bold text-gray-400">{log.time}</span>
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
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-gray-900">الخريطة الحية للمناديب</h3></div>
                    <div className="flex-1 relative h-[330px]"><LiveMap drivers={onlineDrivers} vendors={vendors.filter(v => v.location).map(v => ({ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng }))} zoom={12} className="h-full w-full" /></div>
                  </div>
                </div>
              </>
            )}

            {activeView === "accounts" && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-100 rounded-[40px] p-6 shadow-sm"><AccountsView users={allUsers} /></div>
              </div>
            )}

            {/* باقي الواجهات يتم إضافتها هنا بشكل مشابه */}
          </Suspense>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddDriver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative border border-gray-100">
              <button onClick={() => setShowAddDriver(false)} className="absolute top-6 left-6 p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
              <h2 className="text-2xl font-black text-gray-900 mb-8">إضافة طيار جديد</h2>
              <form onSubmit={handleAddDriver} className="space-y-6">
                <input type="text" placeholder="الاسم بالكامل" required value={newDriverData.name} onChange={e => setNewDriverData({...newDriverData, name: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-gray-900 border border-gray-100" />
                <input type="email" placeholder="البريد الإلكتروني" required value={newDriverData.email} onChange={e => setNewDriverData({...newDriverData, email: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-gray-900 border border-gray-100" />
                <input type="password" placeholder="كلمة السر" required value={newDriverData.password} onChange={e => setNewDriverData({...newDriverData, password: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-gray-900 border border-gray-100" />
                <input type="tel" placeholder="رقم الهاتف" required value={newDriverData.phone} onChange={e => setNewDriverData({...newDriverData, phone: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-gray-900 border border-gray-100" />
                <button type="submit" disabled={actionLoading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg shadow-blue-200">{actionLoading ? "جاري الإنشاء..." : "إضافة الحساب الآن"}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
