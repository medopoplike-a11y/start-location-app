"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Users, 
  Store, 
  ShieldCheck,
  Settings,
  Truck,
  Menu,
  X,
  ChevronRight,
  LogOut, 
  Wallet,
  RefreshCw,
  Bell,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical
} from "lucide-react";
import dynamic from 'next/dynamic';

const AccountsView = dynamic(() => import('./AccountsView'), { ssr: false });

import { signOut, createUserByAdmin } from "@/lib/auth";
import { fetchAdminOrders, fetchAdminProfiles, resetUserDataAdmin, resetAllSystemDataAdmin, fetchAdminAppConfig, updateAdminAppConfig } from "@/lib/adminApi";
import { updateOrderStatus } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { StartLogo } from "@/components/StartLogo";
import { AppLoader } from "@/components/AppLoader";
import { SyncIndicator } from "@/components/SyncIndicator";
import AuthGuard from "@/components/AuthGuard";
import { useSync } from "@/hooks/useSync";
import { CardSkeleton } from "@/components/ui/Skeleton";
import type { AdminOrder, LiveOrderItem, DriverCard, VendorCard, AppUser, OnlineDriver, SettlementItem, ProfileRow, WalletRow, ActivityItem, ActivityLogItem } from "./types";
import DashboardView from "./components/DashboardView";
import OrdersView from "./components/OrdersView";
import DriversView from "./components/DriversView";
import VendorsView from "./components/VendorsView";
import SettlementsView from "./components/SettlementsView";
import AppConfigView from "./components/AppConfigView";
import SettingsView from "./components/SettingsView";
import OrderDistributionView from "./components/OrderDistributionView";

export default function AdminPanel() {
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { lastSync, isSyncing } = useSync(undefined, () => fetchData(), true);

  // Data State
  const [drivers, setDrivers] = useState<DriverCard[]>([]);
  const [liveOrders, setLiveOrders] = useState<LiveOrderItem[]>([]);
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([]);
  const [vendors, setVendors] = useState<VendorCard[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  
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
    maintenance_mode: false,
    maintenance_message: "التطبيق تحت الصيانة حالياً. يرجى المحاولة لاحقاً.",
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

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && error !== null && "message" in error) {
      return String((error as { message?: unknown }).message || "حدث خطأ");
    }
    return "حدث خطأ";
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

  const withTimeout = async <T,>(label: string, promise: Promise<T>, ms: number): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    // Mobile-optimized fallback
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
    const fallbackMs = isCapacitor ? 15000 : 5000;
    const hardFallback = setTimeout(() => {
      console.log(`AdminPage: Hard fallback (${fallbackMs/1000}s)`);
      if (isCapacitor) {
        (window as any).Capacitor?.SplashScreen?.hide?.();
      }
      setLoading(false);
    }, fallbackMs);

    const init = async () => {
      if (authLoading) return;

      // Only run fetchData if we have a user and data is not already loaded
      if (user && drivers.length === 0 && allOrders.length === 0) {
        try {
          await withTimeout('fetchData', fetchData(), 10000);
        } catch (err) {
          console.error("Admin: Init error:", err);
        } finally {
          clearTimeout(hardFallback);
          setLoading(false);
        }
      } else if (!authLoading) {
        clearTimeout(hardFallback);
        setLoading(false);
      }
    };
    init();
    return () => clearTimeout(hardFallback);
  }, [authLoading]);

  useEffect(() => {
    if (allOrders.length > 0) {
      const profits = allOrders.reduce((acc, order) => {
        if (order.status === "delivered") {
          const financials = order.financials || {};
          const deliveryFee = financials.delivery_fee ?? 0;
          const driverComm = financials.system_commission ?? (deliveryFee * (appConfig.driver_commission / 100));
          const vendorComm = financials.vendor_commission ?? (deliveryFee * (appConfig.vendor_commission / 100));
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
      const data = await fetchAdminOrders();
      if (data) {
        setAllOrders(data);
        const typedData = data as AdminOrder[];
        setAllOrders(typedData);
        const live = typedData.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').map((o) => ({
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
        setActivities(typedData.slice(0, 5).map((o) => ({
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
      const profiles = await fetchAdminProfiles();
      if (profiles) {
        const typedProfiles = profiles as ProfileRow[];
        const online = typedProfiles
          .filter((p) => (p.role || '').toLowerCase() === 'driver' && p.is_online)
          .map((p) => {
          let loc = p.location;
          if (typeof loc === 'string') {
            try {
              loc = JSON.parse(loc) as { lat?: number; lng?: number };
            } catch {
              loc = null;
            }
          }
          const normalizedLoc = typeof loc === "object" && loc !== null ? loc : null;
          return {
            id: p.id,
            name: p.full_name || "غير معروف",
            lat: normalizedLoc?.lat || null,
            lng: normalizedLoc?.lng || null,
            lastSeen: new Date(p.last_location_update || p.updated_at || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
          };
        })
          .filter((d): d is OnlineDriver => d.lat !== null && d.lng !== null);
        setOnlineDrivers(online);
        setAllUsers(typedProfiles.map((u) => ({
          id: u.id, email: u.email || "", full_name: u.full_name || "غير مسجل", phone: u.phone || "غير مسجل", area: u.area || "غير محدد", vehicle_type: u.vehicle_type || "غير محدد", national_id: u.national_id || "غير مسجل", role: (u.role || 'driver').toLowerCase(), created_at: u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : 'غير متوفر'
        })));

        const { data: wallets } = await supabase.from('wallets').select('*');
        if (wallets) {
          const typedWallets = wallets as WalletRow[];
          setTotalSystemDebt(typedWallets.reduce((acc, w) => acc + (w.system_balance || 0), 0));
          setDrivers(typedProfiles.filter((p) => (p.role || '').toLowerCase() === 'driver').map((p) => {
            const w = typedWallets.find((wal) => wal.user_id === p.id);
            return { id: p.id.slice(0, 8), id_full: p.id, name: p.full_name || "بدون اسم", status: p.is_locked ? "محظور" : "نشط", isShiftLocked: !!p.is_locked, earnings: w?.balance || 0, debt: (w?.debt || 0) + (w?.system_balance || 0), totalOrders: 0 };
          }));
          setVendors(typedProfiles.filter((p) => (p.role || '').toLowerCase() === 'vendor').map((p) => {
            const w = typedWallets.find((wal) => wal.user_id === p.id);
            const location = typeof p.location === "object" && p.location !== null ? p.location : null;
            return { id: p.id.slice(0, 8), id_full: p.id, name: p.full_name || "بدون اسم", type: "محل", orders: 0, balance: (w?.debt || 0) + (w?.system_balance || 0), status: "نشط", location };
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
    try {
      const data = await fetchAdminAppConfig();
      if (data) setAppConfig(data);
    } catch (err) {
      console.error('Admin: Error fetching app config:', err);
    }
  };

  const translateStatus = (status: string) => {
    const statuses: Record<string, string> = { pending: "جاري البحث", assigned: "تم التعيين", in_transit: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغي" };
    return statuses[status] || status;
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const { error } = await createUserByAdmin(newDriverData.email, newDriverData.password, newDriverData.name, 'driver', { phone: newDriverData.phone, area: newDriverData.area, vehicle_type: newDriverData.vehicle_type, national_id: newDriverData.national_id });
    if (!error) {
      alert("تم إنشاء حساب الطيار بنجاح!");
      addActivity(`تم إنشاء حساب طيار: ${newDriverData.name}`);
      setShowAddDriver(false);
      setNewDriverData({ name: "", email: "", password: "", phone: "", area: "", vehicle_type: "موتوسيكل", national_id: "" });
      fetchData();
    } else {
      alert(`خطأ: ${getErrorMessage(error)}`);
    }
    setActionLoading(false);
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const { error } = await createUserByAdmin(newVendorData.email, newVendorData.password, newVendorData.name, 'vendor', { phone: newVendorData.phone });
    if (!error) {
      alert("تم إنشاء حساب المحل بنجاح!");
      addActivity(`تم إنشاء حساب محل: ${newVendorData.name}`);
      setShowAddVendor(false);
      setNewVendorData({ name: "", email: "", password: "", phone: "" });
      fetchData();
    } else {
      alert(`خطأ: ${getErrorMessage(error)}`);
    }
    setActionLoading(false);
  };

  const handleUpdateAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await updateAdminAppConfig(appConfig);
      alert("تم تحديث إعدادات النظام بنجاح!");
    } catch (error) {
      alert(`خطأ: ${getErrorMessage(error)}`);
    }
    setActionLoading(false);
  };

  const handleSettlementAction = async (settlementId: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase.from('settlements').update({ status: newStatus }).eq('id', settlementId);
    if (!error) {
      alert("تم التحديث!");
      addActivity(`تم ${newStatus === "approved" ? "اعتماد" : "رفض"} تسوية`);
      setSettlements(prev => prev.filter(s => s.id !== settlementId));
    }
  };

  const toggleShiftLock = async (driverId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_locked: !currentStatus }).eq('id', driverId);
    if (!error) {
      addActivity(`تم ${!currentStatus ? "حظر" : "فتح"} شيفت المندوب`);
      setDrivers(prev => prev.map(d => d.id_full === driverId ? { ...d, isShiftLocked: !currentStatus, status: !currentStatus ? "محظور" : "نشط" } : d));
    }
  };

  const handleResetUser = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من تصفير كافة بيانات ${userName}؟`)) return;
    setActionLoading(true);
    try {
      await resetUserDataAdmin(userId);
      alert("تم التصفير!");
      addActivity(`تم تصفير بيانات ${userName}`);
      fetchData();
    } catch (error) {
      alert(`خطأ: ${getErrorMessage(error)}`);
    }
    setActionLoading(false);
  };

  const handleGlobalReset = async () => {
    if (!confirm("تحذير: هل أنت متأكد من تصفير كافة بيانات النظام؟")) return;
    setActionLoading(true);
    try {
      await resetAllSystemDataAdmin();
      alert("تم التصفير الشامل!");
      addActivity("تم تنفيذ تصفير شامل للنظام");
      fetchData();
    } catch (error) {
      alert(`خطأ: ${getErrorMessage(error)}`);
    }
    setActionLoading(false);
  };

  const handleAssignOrder = async (orderId: string, driverId: string, driverName: string) => {
    const { error } = await updateOrderStatus(orderId, 'assigned', driverId);
    if (!error) {
      addActivity(`تم تعيين الطلب #${orderId.slice(0,8)} للطيار ${driverName}`);
      setLiveOrders(prev => prev.map(o =>
        o.id_full === orderId ? { ...o, status: "تم التعيين", driver: driverName, driver_id: driverId } : o
      ));
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const { error } = await updateOrderStatus(orderId, 'cancelled');
    if (!error) {
      addActivity(`تم إلغاء الطلب #${orderId.slice(0,8)}`);
      setLiveOrders(prev => prev.map(o =>
        o.id_full === orderId ? { ...o, status: "ملغي" } : o
      ));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const stats = [
    { title: "إجمالي الطلبات", value: allOrders.length, icon: <Truck className="text-sky-500 w-5 h-5" />, trend: "+12%", trendType: 'positive' as const, subtitle: "طلب", color: "sky" },
    { title: "المناديب النشطين", value: drivers.filter(d => !d.isShiftLocked).length, icon: <Users className="text-emerald-500 w-5 h-5" />, trend: "+5%", trendType: 'positive' as const, subtitle: "كابتن", color: "emerald" },
    { title: "صندوق التأمين", value: insuranceFund.toLocaleString(), icon: <ShieldCheck className="text-rose-500 w-5 h-5" />, trend: "+2%", trendType: 'positive' as const, subtitle: "ج.م", color: "rose" },
    { title: "عمولات مستحقة", value: totalSystemDebt.toLocaleString(), icon: <Wallet className="text-amber-500 w-5 h-5" />, trend: "المديونية", trendType: 'neutral' as const, subtitle: "ج.م", color: "amber" },
    { title: "أرباح النظام", value: totalProfits.toLocaleString(), icon: <RefreshCw className="text-indigo-500 w-5 h-5" />, trend: "محسوبة", trendType: 'positive' as const, subtitle: "ج.م", color: "indigo" },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#f3f4f6] p-6 lg:p-8 space-y-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <CardSkeleton className="w-12 h-12 rounded-2xl" />
          <div className="space-y-2">
            <CardSkeleton className="h-4 w-32" />
            <CardSkeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="bg-white/40 h-[400px] rounded-[40px] animate-pulse border border-slate-100" />
    </div>
  );

  return (
    <AuthGuard allowedRoles={["admin"]}>
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
            { id: "distribution", label: "توزيع الطلبات", icon: <Truck className="w-5 h-5" />, badge: liveOrders.filter(o => o.status === "جاري البحث").length || undefined },
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
              <DashboardView activityLog={activityLog} stats={stats} onlineDrivers={onlineDrivers} vendors={vendors} />
            )}

            {activeView === "accounts" && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-100 rounded-[40px] p-6 shadow-sm"><AccountsView users={allUsers} /></div>
              </div>
            )}

            {activeView === "orders" && (
              <OrdersView liveOrders={liveOrders} activities={activities} onCancelOrder={handleCancelOrder} />
            )}

            {activeView === "distribution" && (
              <OrderDistributionView
                liveOrders={liveOrders}
                drivers={drivers}
                onAssign={handleAssignOrder}
              />
            )}

            {activeView === "drivers" && (
              <DriversView
                drivers={drivers}
                onAddDriver={() => setShowAddDriver(true)}
                onToggleShiftLock={toggleShiftLock}
                onResetUser={handleResetUser}
              />
            )}

            {activeView === "vendors" && (
              <VendorsView vendors={vendors} onAddVendor={() => setShowAddVendor(true)} onResetUser={handleResetUser} />
            )}

            {activeView === "settlements" && (
              <SettlementsView settlements={settlements} onSettlementAction={handleSettlementAction} />
            )}

            {activeView === "app_config" && (
              <AppConfigView appConfig={appConfig} actionLoading={actionLoading} setAppConfig={setAppConfig} onSubmit={handleUpdateAppConfig} />
            )}

            {activeView === "settings" && (
              <SettingsView actionLoading={actionLoading} onGlobalReset={handleGlobalReset} />
            )}
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
                <input type="password" placeholder="كلمة السر" required value={newDriverData.password} onChange={e => setNewDriverData({...newDriverData, password: e.target.value})} autoComplete="new-password" className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-gray-900 border border-gray-100" />
                <input type="tel" placeholder="رقم الهاتف" required value={newDriverData.phone} onChange={e => setNewDriverData({...newDriverData, phone: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-gray-900 border border-gray-100" />
                <button type="submit" disabled={actionLoading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg shadow-blue-200">{actionLoading ? "جاري الإنشاء..." : "إضافة الحساب الآن"}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
        {showAddVendor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative border border-gray-100">
              <button onClick={() => setShowAddVendor(false)} className="absolute top-6 left-6 p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
              <h2 className="text-2xl font-black text-gray-900 mb-8">إضافة محل جديد</h2>
              <form onSubmit={handleAddVendor} className="space-y-6">
                <input type="text" placeholder="اسم المحل" required value={newVendorData.name} onChange={e => setNewVendorData({...newVendorData, name: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-gray-900 border border-gray-100" />
                <input type="email" placeholder="البريد الإلكتروني" required value={newVendorData.email} onChange={e => setNewVendorData({...newVendorData, email: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-gray-900 border border-gray-100" />
                <input type="password" placeholder="كلمة السر" required value={newVendorData.password} onChange={e => setNewVendorData({...newVendorData, password: e.target.value})} autoComplete="new-password" className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-gray-900 border border-gray-100" />
                <input type="tel" placeholder="رقم الهاتف" required value={newVendorData.phone} onChange={e => setNewVendorData({...newVendorData, phone: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-gray-900 border border-gray-100" />
                <button type="submit" disabled={actionLoading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg shadow-blue-200">{actionLoading ? "جاري الإنشاء..." : "إضافة الحساب الآن"}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </AuthGuard>
  );
}
