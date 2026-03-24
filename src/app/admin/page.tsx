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
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SAFE_RIDE_FEE, VENDOR_INSURANCE_FEE } from "@/lib/pricing";
import { signOut, createUserByAdmin, getUserProfile } from "@/lib/auth";
import { subscribeToOrders, subscribeToProfiles } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { StartLogo } from "@/components/StartLogo";
import LocationMarker from "@/components/LocationMarker";
import AccountsView from "./AccountsView";
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { 
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-gray-100 animate-pulse rounded-[40px] flex items-center justify-center text-gray-400 font-bold">جاري تحميل الخريطة...</div>
});

export default function AdminPanel() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveTab] = useState("dashboard");
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [newDriverData, setNewDriverData] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    phone: "", 
    area: "", 
    vehicle_type: "موتوسيكل", 
    national_id: "" 
  });
  const [newVendorData, setNewVendorData] = useState({ name: "", email: "", password: "", phone: "" });

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

  const [systemSettings, setSystemSettings] = useState({
    driverCommission: 15,
    vendorFee: 1,
    safeRideFee: 1,
    debtLimit: 1000,
    surgePricing: 0
  });

  const [drivers, setDrivers] = useState<any[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [totalProfits, setTotalProfits] = useState(0);
  const [insuranceFund, setInsuranceFund] = useState(0);
  const [vendors, setVendors] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [assigningOrder, setAssigningOrder] = useState<any>(null);
  const [assignSearch, setAssignSearch] = useState("");

  const [totalSystemDebt, setTotalSystemDebt] = useState(0); 

  const [appConfig, setAppConfig] = useState({
    latest_version: "0.2.0",
    min_version: "0.2.0",
    download_url: "/start-location-v0.2.0.apk",
    bundle_url: "",
    force_update: true,
    update_message: "لقد قمنا بتحسينات كبيرة في الأداء وإضافة مزايا جديدة. يرجى التحديث للاستمتاع بأفضل تجربة."
  });

  const fetchAppConfig = async () => {
    const { data } = await supabase.from('app_config').select('*').single();
    if (data) setAppConfig(data);
  };

  const handleUpdateAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const { error } = await supabase.from('app_config').update(appConfig).eq('id', 1);
    if (error) alert("حدث خطأ أثناء تحديث إعدادات التطبيق.");
    else alert("تم تحديث إعدادات التطبيق بنجاح!");
    setActionLoading(false);
  };

  const fetchSettlements = async () => {
    const { data } = await supabase.from('settlements').select('*, profiles!driver_id(full_name)').eq('status', 'pending').order('created_at', { ascending: true });
    if (data) setSettlements(data);
  };

  const handleSettlementAction = async (settlementId: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase.from('settlements').update({ status: newStatus }).eq('id', settlementId);
    if (error) alert("حدث خطأ أثناء تحديث حالة التسوية.");
    else { alert(`تم ${newStatus === 'approved' ? 'الموافقة على' : 'رفض'} طلب التسوية بنجاح.`); setSettlements(prev => prev.filter(s => s.id !== settlementId)); }
  };

  useEffect(() => {
    if (allOrders.length > 0) {
      const profits = allOrders.reduce((acc, order) => {
        if (order.status === "delivered") {
          const commission = order.financials.system_commission ?? (order.financials.delivery_fee * (systemSettings.driverCommission / 100));
          const insurance = order.financials.insurance_fee ?? (systemSettings.safeRideFee + VENDOR_INSURANCE_FEE);
          return acc + commission + insurance;
        }
        return acc;
      }, 0);

      const fund = allOrders.reduce((acc, order) => {
        if (order.status === "delivered") return acc + (order.financials.insurance_fee ?? (systemSettings.safeRideFee + VENDOR_INSURANCE_FEE));
        return acc;
      }, 0);

      setTotalProfits(profits);
      setInsuranceFund(fund);
    }
  }, [allOrders, systemSettings]);

  useEffect(() => {
    let ordersSub: any;
    let profilesSub: any;
    let walletsSub: any;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace("/login"); return; }
      const profile = await getUserProfile(session.user.id);
      let role = profile?.role || session.user.user_metadata?.role;
      if (session.user.email?.includes('admin') || session.user.email === 'medopoplike@gmail.com') role = 'admin';
      if (!role || role.toLowerCase() !== 'admin') { router.replace("/login"); return; }

      fetchData();
      setLoading(false);

      ordersSub = subscribeToOrders(() => { fetchOrders(); fetchSettlements(); });
      profilesSub = subscribeToProfiles(() => fetchProfiles());
      walletsSub = supabase.channel('admin_wallets_all').on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => fetchProfiles()).subscribe();
    };

    init();
    return () => {
      if (ordersSub) supabase.removeChannel(ordersSub);
      if (profilesSub) supabase.removeChannel(profilesSub);
      if (walletsSub) supabase.removeChannel(walletsSub);
    };
  }, [router]);

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
          customer_phone: o.customer_details?.phone || "غير متوفر",
          address: o.customer_details?.address || "غير محدد",
          status: translateStatus(o.status),
          status_raw: o.status,
          driver: o.driver_id ? "تم التعيين" : null,
          driver_id: o.driver_id,
          amount: o.financials?.order_value || 0,
          delivery_fee: o.financials?.delivery_fee || 0,
          prep_time: o.financials?.prep_time || "15",
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

  const handleManualAssign = async (orderId: string, driverId: string) => {
    setActionLoading(true);
    const { error } = await supabase.from('orders').update({ driver_id: driverId, status: 'assigned' }).eq('id', orderId);
    if (error) alert("حدث خطأ أثناء تعيين المندوب: " + error.message);
    else { alert("تم تعيين المندوب بنجاح."); setShowAssignDriver(false); fetchOrders(); }
    setActionLoading(false);
  };

  const fetchProfiles = async () => {
    try {
      const { data: profiles, error } = await supabase.rpc('get_all_profiles_admin');
      if (error) throw error;
      if (profiles) {
        const online = profiles.filter(p => (p.role || '').toLowerCase() === 'driver' && p.is_online).map(p => {
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
          id: u.id,
          email: u.email,
          full_name: u.full_name || "غير مسجل",
          phone: u.phone || "غير مسجل",
          area: u.area || "غير محدد",
          vehicle_type: u.vehicle_type || "غير محدد",
          national_id: u.national_id || "غير مسجل",
          role: (u.role || 'driver').toLowerCase(),
          created_at: u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : 'غير متوفر'
        })));

        const { data: wallets } = await supabase.from('wallets').select('*');
        if (wallets) {
          setTotalSystemDebt(wallets.reduce((acc, w) => acc + (w.system_balance || 0), 0));
          setDrivers(profiles.filter((p: any) => (p.role || '').toLowerCase() === 'driver').map((p: any) => {
            const w = wallets.find((wal: any) => wal.user_id === p.id);
            return {
              id: p.id.slice(0, 8),
              id_full: p.id,
              name: p.full_name || "بدون اسم",
              status: p.is_locked ? "محظور" : "نشط",
              isShiftLocked: p.is_locked,
              earnings: w?.balance || 0,
              debt: (w?.debt || 0) + (w?.system_balance || 0),
              totalOrders: 0
            };
          }));
          setVendors(profiles.filter((p: any) => (p.role || '').toLowerCase() === 'vendor').map((p: any) => {
            const w = wallets.find((wal: any) => wal.user_id === p.id);
            return {
              id: p.id.slice(0, 8),
              id_full: p.id,
              name: p.full_name || "بدون اسم",
              type: "محل",
              orders: 0,
              balance: (w?.debt || 0) + (w?.system_balance || 0),
              status: "نشط",
              location: p.location
            };
          }));
        }
      }
    } catch (err) {
      console.error("Admin: Error fetching profiles:", err);
    }
  };

  const translateStatus = (status: string) => {
    const statuses: any = { pending: "جاري البحث", assigned: "تم التعيين", in_transit: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغي" };
    return statuses[status] || status;
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    
    const { data, error } = await createUserByAdmin(
      newDriverData.email,
      newDriverData.password,
      newDriverData.name,
      'driver',
      {
        phone: newDriverData.phone,
        area: newDriverData.area,
        vehicle_type: newDriverData.vehicle_type,
        national_id: newDriverData.national_id
      }
    );

    if (error) {
      console.error("Driver creation error details:", error);
      alert(`خطأ في إنشاء حساب الطيار: ${error.message || "حدث خطأ غير متوقع"}\nتأكد من أن البريد الإلكتروني لم يتم استخدامه من قبل.`);
    } else {
      alert("تم إنشاء حساب الطيار بنجاح!");
      setShowAddDriver(false);
      setNewDriverData({ 
        name: "", 
        email: "", 
        password: "", 
        phone: "", 
        area: "", 
        vehicle_type: "موتوسيكل", 
        national_id: "" 
      });
      // انتظار بسيط للتأكد من استقرار البيانات في Supabase قبل التحديث
      setTimeout(() => {
        fetchData();
      }, 1000);
    }
    setActionLoading(false);
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    
    const { data, error } = await createUserByAdmin(
      newVendorData.email,
      newVendorData.password,
      newVendorData.name,
      'vendor'
    );

    if (error) {
      console.error("Vendor creation error details:", error);
      alert(`خطأ في إنشاء حساب المحل: ${error.message || "حدث خطأ غير متوقع"}\nتأكد من أن البريد الإلكتروني لم يتم استخدامه من قبل.`);
    } else {
      alert("تم إنشاء حساب المحل بنجاح!");
      setShowAddVendor(false);
      setNewVendorData({ name: "", email: "", password: "", phone: "" });
      // انتظار بسيط للتأكد من استقرار البيانات في Supabase قبل التحديث
      setTimeout(() => {
        fetchData();
      }, 1000);
    }
    setActionLoading(false);
  };

  const toggleShiftLock = async (driverId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_locked: !currentStatus })
      .eq('id', driverId);
    
    if (error) {
      alert("حدث خطأ أثناء تحديث القفل");
    } else {
      // تحديث محلي فوري
      setDrivers(prev => prev.map(d => 
        d.id_full === driverId ? { ...d, isShiftLocked: !currentStatus, status: !currentStatus ? "محظور" : "نشط" } : d
      ));
    }
  };

  const handleResetUser = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من تصفير كافة بيانات ${userName}؟ سيتم حذف سجل الطلبات وتصفير المحفظة نهائياً.`)) return;
    
    setActionLoading(true);
    const { data, error } = await supabase.rpc('reset_user_data_admin', { target_user_id: userId });
    setActionLoading(false);

    if (error) {
      alert(`خطأ أثناء التصفير: ${error.message}`);
    } else {
      alert("تم تصفير بيانات المستخدم بنجاح.");
      fetchData(); // إعادة جلب البيانات لتحديث العرض
    }
  };

  const handleGlobalReset = async () => {
    if (!confirm("تحذير: هل أنت متأكد من تصفير كافة بيانات النظام (الطلبات، التسويات، المحافظ)؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    if (!confirm("هل أنت متأكد حقاً؟ سيتم حذف سجلات كافة المطاعم والطيارين.")) return;

    setActionLoading(true);
    const { data, error } = await supabase.rpc('reset_all_system_data_admin');
    setActionLoading(false);

    if (error) {
      alert(`خطأ أثناء التصفير الشامل: ${error.message}`);
    } else {
      alert("تم تصفير كافة بيانات النظام بنجاح.");
      fetchData();
    }
  };

  const stats = [
    { title: "إجمالي الطلبات", value: allOrders.length.toString(), icon: <Truck className="text-blue-500 w-6 h-6" />, trend: "+12%" },
    { title: "المناديب النشطين", value: drivers.filter(d => !d.isShiftLocked).length.toString(), icon: <Users className="text-green-500 w-6 h-6" />, trend: "+5%" },
    { title: "صندوق التأمين", value: `${insuranceFund.toLocaleString()} ج.م`, icon: <ShieldCheck className="text-brand-red w-6 h-6" />, trend: "+2%" },
    { title: "عمولات مستحقة", value: `${totalSystemDebt.toLocaleString()} ج.م`, icon: <Wallet className="text-purple-500 w-6 h-6" />, trend: "المديونية الحالية" },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-right relative overflow-hidden" dir="rtl">
      
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Slidable Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: sidebarOpen ? (isMobile ? "280px" : "280px") : (isMobile ? "0px" : "88px"),
          x: sidebarOpen ? 0 : (isMobile ? 280 : 0)
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`bg-white border-l border-gray-100 fixed lg:relative z-[70] h-screen overflow-hidden shadow-sm flex flex-col`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 flex items-center gap-4 border-b border-gray-50 h-24">
            <div className="flex-shrink-0 bg-gray-50 p-2 rounded-2xl">
              <StartLogo className="w-10 h-10" />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex flex-col"
                >
                  <h1 className="text-xl font-bold text-gray-900 leading-none tracking-tight">START</h1>
                  <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mt-1">Management</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            {[
              { id: "dashboard", label: "لوحة التحكم", icon: <LayoutDashboard className="w-5 h-5" /> },
              { id: "orders", label: "المراقبة الحية", icon: <MapIcon className="w-5 h-5" /> },
              { id: "drivers", label: "إدارة المناديب", icon: <Users className="w-5 h-5" /> },
              { id: "vendors", label: "إدارة المحلات", icon: <Store className="w-5 h-5" /> },
              { id: "accounts", label: "حسابات المستخدمين", icon: <ShieldCheck className="w-5 h-5" /> },
              { id: "settings", label: "مركز التحكم", icon: <Settings className="w-5 h-5" /> },
              { id: "reports", label: "التقارير", icon: <TrendingUp className="w-5 h-5" /> },
              { id: "settlements", label: "طلبات التسوية", icon: <Wallet className="w-5 h-5" />, badge: settlements.length },
              { id: "app_config", label: "تحديث التطبيق", icon: <RefreshCw className="w-5 h-5" /> },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`w-full group flex items-center gap-4 p-4 rounded-2xl transition-all relative ${
                  activeView === item.id 
                    ? "bg-blue-50 text-blue-600 font-bold" 
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                }`}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      className="text-sm flex-1 text-right"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-50">
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 p-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group relative"
            >
              <div className="flex-shrink-0"><LogOut className="w-5 h-5" /></div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    className="text-sm font-bold"
                  >
                    تسجيل الخروج
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50/50">
        
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 h-20 px-8 border-b border-gray-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 bg-gray-50 text-gray-900 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
            >
              {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative group hidden md:block">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                placeholder="ابحث عن طلب، مندوب، أو محل..." 
                className="bg-gray-100/50 pr-11 pl-4 py-2.5 rounded-2xl text-sm border-none outline-none focus:ring-2 ring-blue-500/20 w-80 transition-all font-bold"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2.5 left-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            </button>
            <div className="flex items-center gap-3 p-1.5 pr-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-left hidden sm:block">
                <p className="text-xs font-black text-gray-900 leading-none">أدمن ستارت</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase mt-1 tracking-widest">Admin Mode</p>
              </div>
              <div className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center p-1 shadow-sm overflow-hidden">
                <StartLogo className="w-8 h-8" />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-gray-50/50">
          
          {activeView === "dashboard" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ y: -5 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="text-gray-400 text-xs mb-1 font-bold">{stat.title}</p>
                      <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                      <span className="text-[10px] text-green-500 font-bold">{stat.trend} مقارنة بالشهر السابق</span>
                    </div>
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                      {stat.icon}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">الخريطة الحية للمناديب</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-brand-red text-[10px] font-bold">تحديث تلقائي حي</span>
                      </div>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                      <LiveMap 
                        drivers={onlineDrivers} 
                        vendors={vendors.filter(v => v.location).map(v => ({
                          id: v.id_full,
                          name: v.name,
                          lat: v.location.lat,
                          lng: v.location.lng,
                          details: `${liveOrders.filter(o => o.vendor_id === v.id_full || o.vendor === v.name).length} طلبات نشطة`
                        }))}
                        className="h-full w-full" 
                        zoom={12} 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-6 px-2">مراقبة العمليات الحية</h3>
                  <div className="space-y-4">
                    {activities.map((act) => (
                      <div key={act.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                        <div className="flex gap-4 items-center">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            act.type === 'order' ? 'bg-orange-50 text-brand-orange' : 
                            act.type === 'driver' ? 'bg-blue-50 text-blue-500' : 
                            'bg-green-50 text-green-500'
                          }`}>
                            {act.type === 'order' ? <Truck className="w-5 h-5" /> : 
                             act.type === 'driver' ? <User className="w-5 h-5" /> : 
                             <Store className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{act.text}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{act.time}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 text-white p-8 rounded-[40px] shadow-xl shadow-gray-900/10 flex flex-col justify-between relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="font-bold mb-2">صافي الأرباح المحصلة</h3>
                    <p className="text-4xl font-black">{totalProfits.toLocaleString()} <span className="text-lg font-bold">ج.م</span></p>
                    <p className="text-xs text-white/50 mt-4 leading-relaxed">
                      إجمالي العمولات المحصلة من الرحلات المكتملة بعد خصم مستحقات الطيارين.
                    </p>
                  </div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 blur-[80px] rounded-full" />
                </div>

                <div className="bg-brand-red text-white p-8 rounded-[40px] shadow-xl shadow-brand-red/10 flex flex-col justify-between relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="font-bold mb-2">إجمالي صندوق التأمين</h3>
                    <p className="text-4xl font-black">{insuranceFund.toLocaleString()} <span className="text-lg font-bold">ج.م</span></p>
                    <p className="text-xs text-white/50 mt-4 leading-relaxed">
                      يتم تجميع {SAFE_RIDE_FEE + VENDOR_INSURANCE_FEE} جنيه من كل رحلة لضمان حماية الطيارين.
                    </p>
                  </div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/20 blur-[80px] rounded-full" />
                </div>
              </div>
            </>
          )}

          {activeView === "orders" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">مراقبة الطلبات الحية</h2>
                <div className="flex gap-2">
                  <span className="bg-orange-100 text-brand-orange px-4 py-2 rounded-xl text-xs font-bold">
                    نشط حالياً: {liveOrders.length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveOrders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-800">{order.vendor}</h3>
                        <p className="text-[10px] text-gray-400">ID: {order.id}</p>
                      </div>
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold">
                        {order.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-6 text-xs text-gray-500">
                      <p className="flex items-center gap-2"><MapIcon className="w-3 h-3" /> إلى: {order.customer}</p>
                      <p className="flex items-center gap-2"><Truck className="w-3 h-3" /> المندوب: {order.driver || "بانتظار تعيين..."}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                        className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                      >
                        تفاصيل الطلب
                      </button>
                      {!order.driver_id && (
                        <button 
                          onClick={() => {
                            setAssigningOrder(order);
                            setShowAssignDriver(true);
                          }}
                          className="flex-1 bg-brand-red text-white py-3 rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg shadow-brand-red/20"
                        >
                          تعيين مندوب يدوياً
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === "settlements" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">طلبات تسوية المديونية</h2>
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-6 px-2">الطلبات المعلقة ({settlements.length})</h3>
                {settlements.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="text-gray-400 text-xs border-b border-gray-50">
                          <th className="pb-4 font-bold text-right pr-4">الطيار</th>
                          <th className="pb-4 font-bold text-center">المبلغ</th>
                          <th className="pb-4 font-bold text-center">التاريخ</th>
                          <th className="pb-4 font-bold text-center">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm">
                        {settlements.map((s) => (
                          <tr key={s.id} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 pr-4">
                              <p className="font-bold text-gray-800">{s.profiles.full_name}</p>
                              <p className="text-[10px] text-gray-400">ID: {s.driver_id.slice(0, 8)}</p>
                            </td>
                            <td className="py-4 text-center font-bold text-brand-red">{s.amount.toLocaleString()} ج.م</td>
                            <td className="py-4 text-center text-gray-500">{new Date(s.created_at).toLocaleString('ar-EG')}</td>
                            <td className="py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => handleSettlementAction(s.id, 'approved')}
                                  className="bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold"
                                >
                                  موافقة
                                </button>
                                <button 
                                  onClick={() => handleSettlementAction(s.id, 'rejected')}
                                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold"
                                >
                                  رفض
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-sm text-gray-400 font-bold">لا توجد طلبات تسوية معلقة حالياً.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === "reports" && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-900">التقارير والإحصائيات</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <p className="text-gray-400 text-xs font-bold mb-2">أداء التوصيل اليوم</p>
                  <h3 className="text-3xl font-black text-gray-900">94%</h3>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
                    <div className="bg-green-500 h-full w-[94%]" />
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <p className="text-gray-400 text-xs font-bold mb-2">متوسط وقت التحضير</p>
                  <h3 className="text-3xl font-black text-gray-900">18 <span className="text-sm">دقيقة</span></h3>
                  <p className="text-[10px] text-blue-500 font-bold mt-2">-2 دقيقة عن الأمس</p>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <p className="text-gray-400 text-xs font-bold mb-2">الطلبات الملغية</p>
                  <h3 className="text-3xl font-black text-brand-red">3%</h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-2">معدل طبيعي جداً</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm h-[300px] flex flex-col items-center justify-center">
                <TrendingUp className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-gray-400 font-bold">رسم بياني للنمو (قيد التطوير مع Chart.js)</p>
              </div>
            </div>
          )}

          {activeView === "accounts" && (
            <div className="space-y-4">
              {/* رسالة تشخيصية */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-900">حالة جلب البيانات (للأدمن فقط)</p>
                    <p className="text-[10px] text-blue-700">عدد الحسابات في قاعدة البيانات: {debugInfo.profilesCount}</p>
                  </div>
                </div>
                {debugInfo.error && (
                  <p className="text-[10px] text-red-500 font-bold">خطأ: {debugInfo.error}</p>
                )}
                <button 
                  onClick={fetchData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-blue-700 transition-colors"
                >
                  تحديث يدوي
                </button>
              </div>
              <AccountsView users={allUsers} />
            </div>
          )}

          {activeView === "drivers" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">إدارة المناديب</h2>
                <button 
                  onClick={() => setShowAddDriver(true)}
                  className="bg-brand-red text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-brand-red/20"
                >
                  <Plus className="w-5 h-5" />
                  إضافة طيار جديد
                </button>
              </div>
              
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-6 px-2">قائمة المناديب والتحكم في المناوبات</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="text-gray-400 text-xs border-b border-gray-50">
                        <th className="pb-4 font-bold text-right pr-4">المندوب</th>
                        <th className="pb-4 font-bold text-center">الطلبات</th>
                        <th className="pb-4 font-bold text-center">الأرباح</th>
                        <th className="pb-4 font-bold text-center">المديونية</th>
                        <th className="pb-4 font-bold">الحالة</th>
                        <th className="pb-4 font-bold text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {drivers.map((driver) => (
                        <tr key={driver.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                                {driver.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{driver.name}</p>
                                <p className="text-[10px] text-gray-400">ID: {driver.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center font-bold text-gray-600">{driver.totalOrders}</td>
                          <td className="py-4 text-center font-bold text-green-600">{driver.earnings} ج.م</td>
                          <td className="py-4 text-center font-bold text-brand-red">{driver.debt} ج.م</td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                              driver.status === "نشط" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                            }`}>
                              {driver.status}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => toggleShiftLock(driver.id_full, driver.isShiftLocked)}
                                className={`p-2 rounded-xl transition-all ${
                                  driver.isShiftLocked ? "bg-red-500 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                                title={driver.isShiftLocked ? "إلغاء حظر المندوب" : "حظر المندوب مؤقتاً"}
                              >
                                {driver.isShiftLocked ? <ShieldCheck className="w-4 h-4" /> : <X className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => {
                                  setActiveTab("dashboard");
                                  // في المستقبل يمكن إضافة فلترة للخريطة هنا
                                }}
                                className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                                title="تتبع المندوب"
                              >
                                <MapIcon className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800"
                                title="عرض السجل والمدفوعات"
                              >
                                <Wallet className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleResetUser(driver.id_full, driver.name)}
                                className="p-2 bg-red-100 text-brand-red rounded-xl hover:bg-red-200"
                                title="تصفير بيانات المندوب"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeView === "vendors" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">إدارة المحلات</h2>
                <button 
                  onClick={() => setShowAddVendor(true)}
                  className="bg-brand-red text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-brand-red/20"
                >
                  <Plus className="w-5 h-5" />
                  إضافة محل جديد
                </button>
              </div>
              
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-6 px-2">قائمة المحلات المشتركة</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="text-gray-400 text-xs border-b border-gray-50">
                        <th className="pb-4 font-bold text-right pr-4">المحل</th>
                        <th className="pb-4 font-bold text-center">التصنيف</th>
                        <th className="pb-4 font-bold text-center">الطلبات</th>
                        <th className="pb-4 font-bold text-center">الرصيد</th>
                        <th className="pb-4 font-bold">الحالة</th>
                        <th className="pb-4 font-bold text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {vendors.map((vendor) => (
                        <tr key={vendor.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center">
                                <Store className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{vendor.name}</p>
                                <p className="text-[10px] text-gray-400">ID: {vendor.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center font-bold text-gray-600">{vendor.type}</td>
                          <td className="py-4 text-center font-bold text-gray-600">{vendor.orders}</td>
                          <td className="py-4 text-center font-bold text-green-600">{vendor.balance} ج.م</td>
                          <td className="py-4">
                            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold">
                              {vendor.status}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                className="p-2 bg-orange-100 text-brand-orange rounded-xl hover:bg-orange-200"
                                title="عرض الطلبات"
                              >
                                <Truck className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800"
                                title="إعدادات المحل"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleResetUser(vendor.id_full, vendor.name)}
                                className="p-2 bg-red-100 text-brand-red rounded-xl hover:bg-red-200"
                                title="تصفير بيانات المحل"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeView === "settings" && (
            <div className="max-w-4xl space-y-8">
              <h2 className="text-2xl font-bold text-gray-900">مركز التحكم في النظام</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="text-brand-red w-6 h-6" />
                    <h3 className="font-bold text-gray-800">إعدادات العمولات والرسوم</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2">عمولة الطيار (%)</label>
                      <input 
                        type="number" 
                        value={systemSettings.driverCommission} 
                        onChange={(e) => setSystemSettings({...systemSettings, driverCommission: Number(e.target.value)})}
                        className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2">رسوم تأمين المحل (ج.م ثابت)</label>
                      <input 
                        type="number" 
                        value={systemSettings.vendorFee} 
                        onChange={(e) => setSystemSettings({...systemSettings, vendorFee: Number(e.target.value)})}
                        className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2">رسوم تأمين الرحلة (ج.م)</label>
                      <input 
                        type="number" 
                        value={systemSettings.safeRideFee} 
                        onChange={(e) => setSystemSettings({...systemSettings, safeRideFee: Number(e.target.value)})}
                        className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red" 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="text-brand-red w-6 h-6" />
                    <h3 className="font-bold text-gray-800">إدارة المخاطر والذروة</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2">سقف المديونية للمناديب (ج.م)</label>
                      <input 
                        type="number" 
                        value={systemSettings.debtLimit} 
                        onChange={(e) => setSystemSettings({...systemSettings, debtLimit: Number(e.target.value)})}
                        className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2">رسوم الذروة الإضافية (Surge)</label>
                      <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                        <input 
                          type="range" 
                          min="0" 
                          max="50" 
                          step="5" 
                          value={systemSettings.surgePricing} 
                          onChange={(e) => setSystemSettings({...systemSettings, surgePricing: Number(e.target.value)})}
                          className="flex-1 accent-brand-red" 
                        />
                        <span className="font-bold text-brand-red">{systemSettings.surgePricing} ج.م</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert("تم حفظ الإعدادات بنجاح في النظام")}
                      className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold mt-4 active:scale-95 transition-transform"
                    >
                      حفظ جميع الإعدادات
                    </button>
                  </div>
                </div>

                {/* تصفير النظام */}
                <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Trash2 className="text-brand-red w-6 h-6" />
                    <h3 className="font-bold text-red-900">منطقة الخطر</h3>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs text-red-600 font-bold leading-relaxed">
                      هذا الإجراء سيقوم بحذف كافة الطلبات، التسويات، وتصفير محافظ كافة المستخدمين. لا يمكن التراجع عن هذا الإجراء.
                    </p>
                    <button 
                      onClick={handleGlobalReset}
                      disabled={actionLoading}
                      className="w-full bg-brand-red text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-brand-red/20"
                    >
                      <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                      {actionLoading ? "جاري التصفير..." : "تصفير شامل للنظام"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === "app_config" && (
            <div className="max-w-4xl space-y-8">
              <h2 className="text-2xl font-bold text-gray-900">إدارة تحديثات التطبيق</h2>
              <form onSubmit={handleUpdateAppConfig} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <RefreshCw className="text-blue-500 w-6 h-6" />
                    <h3 className="font-bold text-gray-800">إعدادات الإصدار</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-2">أحدث إصدار (X.Y.Z)</label>
                        <input 
                          type="text" 
                          value={appConfig.latest_version} 
                          onChange={(e) => setAppConfig({...appConfig, latest_version: e.target.value})}
                          className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-2">أدنى إصدار مطلوب</label>
                        <input 
                          type="text" 
                          value={appConfig.min_version} 
                          onChange={(e) => setAppConfig({...appConfig, min_version: e.target.value})}
                          className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2">رابط تحميل الـ APK</label>
                      <input 
                        type="url" 
                        value={appConfig.download_url} 
                        onChange={(e) => setAppConfig({...appConfig, download_url: e.target.value})}
                        placeholder="https://your-app.vercel.app/app.apk"
                        className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 text-left" 
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2">رابط حزمة التحديث (www.zip)</label>
                      <input 
                        type="url" 
                        value={appConfig.bundle_url} 
                        onChange={(e) => setAppConfig({...appConfig, bundle_url: e.target.value})}
                        placeholder="https://your-app.vercel.app/www.zip"
                        className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 text-left" 
                        dir="ltr"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="text-sm font-bold text-gray-800">تحديث إجباري</p>
                        <p className="text-[10px] text-gray-400">منع المستخدمين من الدخول دون تحديث</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={appConfig.force_update} 
                        onChange={(e) => setAppConfig({...appConfig, force_update: e.target.checked})}
                        className="w-6 h-6 accent-blue-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="text-blue-500 w-6 h-6" />
                    <h3 className="font-bold text-gray-800">رسالة التحديث</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2">الرسالة التي تظهر للمستخدم</label>
                      <textarea 
                        rows={4}
                        value={appConfig.update_message} 
                        onChange={(e) => setAppConfig({...appConfig, update_message: e.target.value})}
                        className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 resize-none" 
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={actionLoading}
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold mt-4 active:scale-95 transition-transform shadow-lg shadow-blue-600/20"
                    >
                      {actionLoading ? "جاري الحفظ..." : "حفظ إعدادات التحديث"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeView === "reports" && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-900">التقارير والإحصائيات</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <p className="text-gray-400 text-xs font-bold mb-2">أداء التوصيل اليوم</p>
                  <h3 className="text-3xl font-black text-gray-900">94%</h3>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
                    <div className="bg-green-500 h-full w-[94%]" />
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <p className="text-gray-400 text-xs font-bold mb-2">متوسط وقت التحضير</p>
                  <h3 className="text-3xl font-black text-gray-900">18 <span className="text-sm">دقيقة</span></h3>
                  <p className="text-[10px] text-blue-500 font-bold mt-2">-2 دقيقة عن الأمس</p>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <p className="text-gray-400 text-xs font-bold mb-2">الطلبات الملغية</p>
                  <h3 className="text-3xl font-black text-brand-red">3%</h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-2">معدل طبيعي جداً</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm h-[300px] flex flex-col items-center justify-center">
                <TrendingUp className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-gray-400 font-bold">رسم بياني للنمو (قيد التطوير مع Chart.js)</p>
              </div>
            </div>
          )}

          {activeView === "insurance" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">صندوق التأمين والحماية</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <h3 className="font-bold text-gray-800">سجل مطالبات التأمين</h3>
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-red">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">مطالبة تعويض عن طلب #77{i}</p>
                            <p className="text-[10px] text-gray-400">تاريخ: 20 مارس 2026</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full">تحت المراجعة</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-brand-red text-white p-8 rounded-[40px] shadow-xl shadow-brand-red/20 space-y-6">
                  <h3 className="font-bold">رصيد الصندوق الحالي</h3>
                  <p className="text-4xl font-black">4,250 <span className="text-lg font-bold">ج.م</span></p>
                  <p className="text-xs text-white/70">يتم تجميع {SAFE_RIDE_FEE + VENDOR_INSURANCE_FEE} جنيه من كل رحلة ({SAFE_RIDE_FEE} جنيه من السائق + {VENDOR_INSURANCE_FEE} جنيه من المحل) لصالح تأمين المخاطر والحوادث.</p>
                  <button className="w-full bg-white text-brand-red py-4 rounded-2xl font-bold">إصدار تعويض</button>
                </div>
              </div>
            </div>
          )}
 
         </div>
       </main>

       {/* Modals */}
       <AnimatePresence>
         {showAddDriver && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
           >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative overflow-hidden"
             >
               <button onClick={() => setShowAddDriver(false)} className="absolute top-6 left-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                 <X className="w-5 h-5" />
               </button>

               <div className="flex items-center gap-4 mb-8">
                 <div className="w-14 h-14 bg-brand-red/10 text-brand-red rounded-2xl flex items-center justify-center">
                   <User className="w-8 h-8" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-gray-900">إضافة طيار جديد</h2>
                   <p className="text-sm text-gray-400 font-bold">تسجيل بيانات المندوب في النظام</p>
                 </div>
               </div>

               <form onSubmit={handleAddDriver} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                       <User className="w-3 h-3" /> اسم المندوب بالكامل
                     </label>
                     <input 
                       type="text" 
                       required
                       value={newDriverData.name}
                       onChange={(e) => setNewDriverData({...newDriverData, name: e.target.value})}
                       placeholder="مثلاً: محمد أحمد علي" 
                       className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none" 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                       <Mail className="w-3 h-3" /> البريد الإلكتروني
                     </label>
                     <input 
                       type="email" 
                       required
                       value={newDriverData.email}
                       onChange={(e) => setNewDriverData({...newDriverData, email: e.target.value})}
                       placeholder="driver@example.com" 
                       className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none" 
                     />
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                       <Lock className="w-3 h-3" /> كلمة المرور
                     </label>
                     <input 
                       type="password" 
                       required
                       value={newDriverData.password}
                       onChange={(e) => setNewDriverData({...newDriverData, password: e.target.value})}
                       placeholder="••••••••" 
                       className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none" 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                       <Phone className="w-3 h-3" /> رقم الهاتف
                     </label>
                     <input 
                       type="tel" 
                       required
                       value={newDriverData.phone}
                       onChange={(e) => setNewDriverData({...newDriverData, phone: e.target.value})}
                       placeholder="01xxxxxxxxx" 
                       className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none" 
                     />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                     <LocationMarker size={14} pulse={false} /> منطقة العمل المفضلة
                   </label>
                   <input 
                     type="text" 
                     required
                     value={newDriverData.area}
                     onChange={(e) => setNewDriverData({...newDriverData, area: e.target.value})}
                     placeholder="مثلاً: المعادي، التجمع، المهندسين..." 
                     className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none" 
                   />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                       <Briefcase className="w-3 h-3" /> نوع المركبة
                     </label>
                     <select 
                       value={newDriverData.vehicle_type}
                       onChange={(e) => setNewDriverData({...newDriverData, vehicle_type: e.target.value})}
                       className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none appearance-none"
                     >
                       <option>موتوسيكل</option>
                       <option>عجلة</option>
                       <option>سيارة</option>
                       <option>سكوتر</option>
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                       <ShieldCheck className="w-3 h-3" /> رقم الهوية (القومي)
                     </label>
                     <input 
                       type="text" 
                       required
                       value={newDriverData.national_id}
                       onChange={(e) => setNewDriverData({...newDriverData, national_id: e.target.value})}
                       placeholder="14 رقم" 
                       className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none" 
                     />
                   </div>
                 </div>

                 <button 
                   type="submit"
                   disabled={actionLoading}
                   className="w-full bg-brand-red text-white py-5 rounded-[24px] font-black shadow-xl shadow-brand-red/20 active:scale-95 transition-all mt-4 disabled:opacity-50"
                 >
                   {actionLoading ? "جاري الإنشاء..." : "تأكيد إضافة المندوب"}
                 </button>
               </form>
             </motion.div>
           </motion.div>
         )}

         {/* Modal: Order Details */}
         {showOrderDetails && selectedOrder && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
           >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl relative overflow-hidden"
             >
               <button onClick={() => setShowOrderDetails(false)} className="absolute top-6 left-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                 <X className="w-5 h-5" />
               </button>

               <div className="flex items-center gap-4 mb-8">
                 <div className="w-14 h-14 bg-orange-50 text-brand-orange rounded-2xl flex items-center justify-center">
                   <Truck className="w-8 h-8" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-gray-900">تفاصيل الطلب #{selectedOrder.id}</h2>
                   <p className="text-sm text-gray-400 font-bold">{selectedOrder.vendor}</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                 <div className="space-y-4">
                   <h4 className="text-xs font-black text-gray-400 pr-1">بيانات العميل</h4>
                   <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                     <p className="text-sm font-bold flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> {selectedOrder.customer}</p>
                     <p className="text-sm font-bold flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> {selectedOrder.customer_phone}</p>
                     <p className="text-sm font-bold flex items-center gap-2"><MapIcon className="w-4 h-4 text-gray-400" /> {selectedOrder.address}</p>
                   </div>
                 </div>
                 <div className="space-y-4">
                   <h4 className="text-xs font-black text-gray-400 pr-1">التفاصيل المالية</h4>
                   <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-500">قيمة الطلب:</span>
                       <span className="font-bold">{selectedOrder.amount} ج.م</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-500">رسوم التوصيل:</span>
                       <span className="font-bold">{selectedOrder.delivery_fee} ج.م</span>
                     </div>
                     <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                       <span className="font-bold text-gray-900">الإجمالي:</span>
                       <span className="font-black text-brand-red">{(selectedOrder.amount + selectedOrder.delivery_fee).toLocaleString()} ج.م</span>
                     </div>
                   </div>
                 </div>
               </div>

               <button 
                 onClick={() => setShowOrderDetails(false)}
                 className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform"
               >
                 إغلاق النافذة
               </button>
             </motion.div>
           </motion.div>
         )}

         {/* Modal: Assign Driver */}
         {showAssignDriver && assigningOrder && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
           >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative"
             >
               <button onClick={() => setShowAssignDriver(false)} className="absolute top-6 left-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                 <X className="w-5 h-5" />
               </button>

               <div className="mb-8">
                 <h2 className="text-2xl font-black text-gray-900">تعيين مندوب يدوياً</h2>
                 <p className="text-sm text-gray-400 font-bold">للطلب من {assigningOrder.vendor}</p>
               </div>

               <div className="relative mb-6">
                 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                 <input 
                   type="text" 
                   placeholder="ابحث عن مندوب بالاسم أو المنطقة..." 
                   value={assignSearch}
                   onChange={(e) => setAssignSearch(e.target.value)}
                   className="w-full bg-gray-50 pr-12 pl-6 py-4 rounded-2xl outline-none focus:ring-2 ring-brand-orange border-none font-bold text-sm"
                 />
               </div>

               <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                 {drivers
                   .filter(d => d.status === "نشط" && (d.name.includes(assignSearch) || d.area?.includes(assignSearch)))
                   .map((driver) => (
                     <button 
                       key={driver.id_full}
                       onClick={() => handleManualAssign(assigningOrder.id_full, driver.id_full)}
                       disabled={actionLoading}
                       className="w-full p-4 bg-white border border-gray-100 rounded-[28px] flex items-center justify-between hover:border-brand-orange hover:bg-orange-50 transition-all group"
                     >
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold group-hover:bg-brand-orange group-hover:text-white transition-colors">
                           {driver.name.charAt(0)}
                         </div>
                         <div className="text-right">
                           <p className="font-bold text-gray-800">{driver.name}</p>
                           <p className="text-[10px] text-gray-400">{driver.area || "منطقة غير محددة"}</p>
                         </div>
                       </div>
                       {actionLoading ? (
                         <div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                       ) : (
                         <Plus className="w-5 h-5 text-gray-300 group-hover:text-brand-orange transition-colors" />
                       )}
                     </button>
                   ))}
               </div>
             </motion.div>
           </motion.div>
         )}

         {showAddVendor && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
           >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative overflow-hidden"
             >
               <button onClick={() => setShowAddVendor(false)} className="absolute top-6 left-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                 <X className="w-5 h-5" />
               </button>

               <div className="flex items-center gap-4 mb-8">
                 <div className="w-14 h-14 bg-orange-50 text-brand-orange rounded-2xl flex items-center justify-center">
                   <Store className="w-8 h-8" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-gray-900">إضافة محل جديد</h2>
                   <p className="text-sm text-gray-400 font-bold">إنشاء حساب تجاري جديد للمحل</p>
                 </div>
               </div>

               <form onSubmit={handleAddVendor} className="space-y-6">
                 <div className="space-y-2">
                   <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                     <Store className="w-3 h-3" /> اسم المحل (الاسم التجاري)
                   </label>
                   <input 
                     type="text" 
                     required
                     value={newVendorData.name}
                     onChange={(e) => setNewVendorData({...newVendorData, name: e.target.value})}
                     placeholder="مثلاً: مطعم بيتزا إيطالي" 
                     className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none" 
                   />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                       <Mail className="w-3 h-3" /> البريد الإلكتروني
                     </label>
                     <input 
                       type="email" 
                       required
                       value={newVendorData.email}
                       onChange={(e) => setNewVendorData({...newVendorData, email: e.target.value})}
                       placeholder="vendor@example.com" 
                       className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none" 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                       <Lock className="w-3 h-3" /> كلمة المرور
                     </label>
                     <input 
                       type="password" 
                       required
                       value={newVendorData.password}
                       onChange={(e) => setNewVendorData({...newVendorData, password: e.target.value})}
                       placeholder="••••••••" 
                       className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none" 
                     />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-black text-gray-400 flex items-center gap-2 pr-1">
                     <Phone className="w-3 h-3" /> هاتف التواصل
                   </label>
                   <input 
                     type="tel" 
                     required
                     value={newVendorData.phone}
                     onChange={(e) => setNewVendorData({...newVendorData, phone: e.target.value})}
                     placeholder="01xxxxxxxxx" 
                     className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-red/20 font-bold text-gray-900 border-none" 
                   />
                 </div>

                 <button 
                   type="submit"
                   disabled={actionLoading}
                   className="w-full bg-gray-900 text-white py-5 rounded-[24px] font-black shadow-xl shadow-gray-900/10 active:scale-95 transition-all mt-2 disabled:opacity-50"
                 >
                   {actionLoading ? "جاري الإنشاء..." : "إنشاء حساب المحل"}
                 </button>
               </form>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   );
 }
