"use client";

import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
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
  Zap,
  AlertTriangle,
  Loader2,
  BarChart3
} from "lucide-react";
import dynamic from 'next/dynamic';
import { ThemeToggle } from "@/components/ThemeToggle";

const DashboardView = dynamic(() => import("./components/DashboardView"), { 
  ssr: false,
  loading: () => <AppLoader />
});
const SettlementsView = dynamic(() => import("./components/SettlementsView"), { ssr: false });
const SettingsView = dynamic(() => import("./components/SettingsView"), { ssr: false });
const ReportsView = dynamic(() => import("./components/ReportsView"), { ssr: false });
const UserManagementView = dynamic(() => import("./components/UserManagementView"), { ssr: false });
const OperationsCenter = dynamic(() => import("./components/OperationsCenter"), { ssr: false });
const AccountsView = dynamic(() => import('./AccountsView'), { ssr: false });

import { signOut, createUserByAdmin } from "@/lib/auth";
import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { fetchAdminOrders, fetchAdminProfiles, resetUserDataAdmin, resetAllSystemDataAdmin, fetchAdminAppConfig, updateAdminAppConfig, toggleDriverLock } from "@/lib/adminApi";
import { updateOrderStatus } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { getCache, setCache } from "@/lib/native-utils";
import { StartLogo } from "@/components/StartLogo";
import { AppLoader } from "@/components/AppLoader";
import { SyncIndicator } from "@/components/SyncIndicator";
import AuthGuard from "@/components/AuthGuard";
import { useSync } from "@/hooks/useSync";
import type { AdminOrder, LiveOrderItem, DriverCard, VendorCard, AppUser, OnlineDriver, SettlementItem, ProfileRow, WalletRow, ActivityItem, ActivityLogItem } from "./types";

export default function AdminPanel() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <AdminContent />
    </AuthGuard>
  );
}

function AdminContent() {
  // 1. Core State
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 2. UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState("operations");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // 3. Sidebar Menu Groups
  const menuGroups = [
    {
      title: "التشغيل والعمليات",
      items: [
        { id: "operations", label: "مركز العمليات الموحد", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
        { id: "dashboard", label: "الإحصائيات المباشرة", icon: LayoutDashboard },
      ]
    },
    {
      title: "الإدارة والبيانات",
      items: [
        { id: "users", label: "المستخدمين", icon: Users },
        { id: "settlements", label: "التسويات المالية", icon: Wallet },
        { id: "reports", label: "التقارير المالية", icon: BarChart3 },
      ]
    },
    {
      title: "الإعدادات",
      items: [
        { id: "settings", label: "إعدادات النظام", icon: Settings },
      ]
    }
  ];

  // 3. Data State
  const [drivers, setDrivers] = useState<DriverCard[]>([]);
  const [liveOrders, setLiveOrders] = useState<LiveOrderItem[]>([]);
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([]);
  const [vendors, setVendors] = useState<VendorCard[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  
  // 4. Financial State
  const [totalProfits, setTotalProfits] = useState(0);
  const [insuranceFund, setInsuranceFund] = useState(0);
  const [totalSystemDebt, setTotalSystemDebt] = useState(0);

  // 5. Form & Config State
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newDriverData, setNewDriverData] = useState({ name: "", email: "", password: "", phone: "", area: "", vehicle_type: "موتوسيكل", national_id: "" });
  const [newVendorData, setNewVendorData] = useState({ name: "", email: "", password: "", phone: "" });
  const [appConfig, setAppConfig] = useState<any>(null); // Start with null to prevent old data fallback

  // 6. Utility Functions (Defined EARLY to avoid TDZ)
  const getErrorMessage = useCallback((error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && error !== null && "message" in error) {
      return String((error as { message?: unknown }).message || "حدث خطأ");
    }
    return "حدث خطأ";
  }, []);

  const translateStatus = useCallback((status: string) => {
    const statuses: Record<string, string> = { pending: "جاري البحث", assigned: "تم التعيين", in_transit: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغي" };
    return statuses[status] || status;
  }, []);

  const addActivity = useCallback((text: string) => {
    setActivityLog(prev => [{
      id: Math.random().toString(36).substring(2, 11),
      text,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }, ...prev].slice(0, 5));
  }, []);

  const formatCurrency = useCallback((value: number) => {
    try {
      if (isNaN(value) || value === null || value === undefined) return "0";
      return value.toLocaleString('ar-EG');
    } catch (e) {
      return String(value || 0);
    }
  }, []);

  // 7. Data Fetching Functions
  const fetchOrders = useCallback(async () => {
    try {
      const data = await fetchAdminOrders();
      if (data) {
        const typedData = data as AdminOrder[];
        setAllOrders(typedData);
        setCache('admin_orders', typedData); // Cache orders
        const live = typedData.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').map((o) => {
          // Handle both array and object responses from Supabase joins
          const rawProfiles = (o as any).profiles;
          const vendorProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : (rawProfiles || {});
          const vName = vendorProfile.full_name || o.vendor_full_name || "محل غير معروف";
          
          return {
            id: o.id.slice(0, 8),
            id_full: o.id,
            vendor: vName,
            customer: o.customer_details?.name || "عميل",
            status: translateStatus(o.status),
            driver: o.driver_id ? "تم التعيين" : null,
            driver_id: o.driver_id,
            amount: o.financials?.order_value || 0,
            delivery_fee: o.financials?.delivery_fee || 0,
            created_at: o.created_at,
            customers: o.customer_details?.customers
          };
        });
        setLiveOrders(live);
        setActivities(typedData.slice(0, 5).map((o) => {
          const rawProfiles = (o as any).profiles;
          const vendorProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : (rawProfiles || {});
          const vName = vendorProfile.full_name || o.vendor_full_name || "محل";
          
          return {
            id: o.id,
            type: 'order',
            text: `طلب جديد من ${vName} بقيمة ${o.financials?.order_value} ج.م`,
            time: new Date(o.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
          };
        }));
      }
    } catch (err) {
      console.error("Admin: Error fetching orders:", err);
    }
  }, [translateStatus]);

  const fetchProfiles = useCallback(async () => {
    try {
      const profiles = await fetchAdminProfiles();
      if (profiles) {
        const typedProfiles = profiles as ProfileRow[];
        setCache('admin_profiles', typedProfiles); // Cache profiles
        const online = typedProfiles
          .filter((p) => {
            const role = (p.role || '').toLowerCase();
            if (role !== 'driver' || !p.is_online) return false;
            
            // Heartbeat: 10 mins threshold
            const lastUpdate = new Date(p.last_location_update || 0).getTime();
            const now = Date.now();
            return now - lastUpdate < 10 * 60 * 1000;
          })
          .map((p) => {
          let loc = p.location;
          if (typeof loc === 'string') {
            try { loc = JSON.parse(loc) as { lat?: number; lng?: number }; } catch { loc = null; }
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
            return { 
              id: p.id.slice(0, 8), 
              id_full: p.id, 
              name: p.full_name || "بدون اسم", 
              type: "محل", 
              orders: 0, 
              balance: (w?.debt || 0) + (w?.system_balance || 0), 
              status: "نشط", 
              location,
              commission_type: (p as any).commission_type,
              commission_value: (p as any).commission_value,
              billing_type: (p as any).billing_type || 'commission',
              monthly_salary: (p as any).monthly_salary || 0
            };
          }));
        }
      }
    } catch (err) {
      console.error("Admin: Error fetching profiles:", err);
    }
  }, []);

  const fetchSettlements = useCallback(async () => {
    const { data } = await supabase.from('settlements').select('*, profiles!user_id(full_name, role)').eq('status', 'pending').order('created_at', { ascending: true });
    if (data) setSettlements(data);
  }, []);

  const fetchAppConfig = useCallback(async () => {
    try {
      const data = await fetchAdminAppConfig();
      if (data) setAppConfig(data);
    } catch (err) {
      console.error('Admin: Error fetching app config:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      const fetchWithTimeout = async (promise: Promise<any>, label: string) => {
        const timeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`انتهت مهلة جلب ${label}`)), 10000)
        );
        return Promise.race([promise, timeout]);
      };

      await Promise.allSettled([
        fetchWithTimeout(fetchProfiles(), "بيانات المستخدمين"),
        fetchWithTimeout(fetchOrders(), "بيانات الطلبات"),
        fetchWithTimeout(fetchSettlements(), "بيانات التسويات"),
        fetchWithTimeout(fetchAppConfig(), "إعدادات النظام")
      ]);
    } catch (err) {
      console.error("Admin: Global fetch error:", err);
      setError(getErrorMessage(err));
    }
  }, [fetchProfiles, fetchOrders, fetchSettlements, fetchAppConfig, getErrorMessage]);

  // 8. Lifecycle & Sync Hooks
  const { lastSync, isSyncing, broadcastAlert } = useSync(undefined, (payload) => {
    if (mounted && !authLoading && user) {
      let shouldFetchFull = true;

      // Delta Sync Optimization: Update specific states based on payload to avoid full re-fetch
      if (payload && payload.table === 'profiles' && payload.new) {
        const p = payload.new;
        if (p.role === 'driver') {
          setOnlineDrivers(prev => {
            const existing = prev.find(d => d.id === p.id);
            let loc = p.location;
            if (typeof loc === 'string') { try { loc = JSON.parse(loc); } catch { loc = null; } }
            
            const lastUpdate = new Date(p.last_location_update || 0).getTime();
            const now = Date.now();
            const isFresh = now - lastUpdate < 10 * 60 * 1000;
            
            // If the driver is offline or not fresh, remove them from the list
            if (!p.is_online || !isFresh) return prev.filter(d => d.id !== p.id);
            
            const updatedDriver = {
              id: p.id,
              name: p.full_name || "غير معروف",
              lat: loc?.lat || null,
              lng: loc?.lng || null,
              lastSeen: new Date(p.last_location_update || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            };
            
            if (updatedDriver.lat === null || updatedDriver.lng === null) return prev.filter(d => d.id !== p.id);
            
            // If already exists and location hasn't changed, don't trigger re-render
            if (existing && existing.lat === updatedDriver.lat && existing.lng === updatedDriver.lng && existing.lastSeen === updatedDriver.lastSeen) {
              return prev;
            }
            
            if (existing) return prev.map(d => d.id === p.id ? { ...existing, ...updatedDriver } as OnlineDriver : d);
            return [...prev, updatedDriver as OnlineDriver];
          });
          
          // Optimization: If only location/online status of a driver changed, don't re-fetch EVERYTHING
          shouldFetchFull = false;
        } else if (p.role === 'vendor') {
          // Optimization: Instant update for vendor location if it changes
          setVendors(prev => {
            const existing = prev.find(v => v.id_full === p.id);
            let loc = p.location;
            if (typeof loc === 'string') { try { loc = JSON.parse(loc); } catch { loc = null; } }
            
            if (existing && loc) {
              return prev.map(v => v.id_full === p.id ? { ...v, location: loc } : v);
            }
            return prev;
          });
          // Vendors might have other data like balance that needs full fetch, but location alone doesn't
          shouldFetchFull = false; 
        }
      } else if (payload && payload.table === 'wallets') {
        // Optimization: For wallet updates, we definitely want fresh stats, but maybe only fetch stats?
        shouldFetchFull = true;
      }
      
      // If it's an order update, a new user, or other critical change, do full fetch
      if (shouldFetchFull) {
        fetchData();
      }
    }
  }, true);

  // KeepAwake: Prevent screen sleep if admin is using mobile to monitor
  useEffect(() => {
    if (mounted && typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      KeepAwake.keepAwake().catch(() => {});
      return () => {
        KeepAwake.allowSleep().catch(() => {});
      };
    }
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
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
    if (!mounted) return;
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
    const fallbackMs = isCapacitor ? 20000 : 10000;
    const hardFallback = setTimeout(() => { setLoading(false); }, fallbackMs);

    const init = async () => {
      // 1. Load cached data for instant display
      const [cachedOrders, cachedProfiles] = await Promise.all([
        getCache<AdminOrder[]>('admin_orders'),
        getCache<ProfileRow[]>('admin_profiles')
      ]);
      
      if (cachedOrders && cachedOrders.length > 0) {
        setAllOrders(cachedOrders);
        setLoading(false); // Hide loader early
      }

      if (authLoading) return;
      if (!user) { setLoading(false); return; }
      try {
        setLoading(true);
        await fetchData();
      } catch (e) {
        setError(`فشل في تهيئة النظام: ${getErrorMessage(e)}`);
      } finally {
        clearTimeout(hardFallback);
        setLoading(false);
      }
    };
    init();
    return () => clearTimeout(hardFallback);
  }, [mounted, authLoading, fetchData, user, getErrorMessage]);

  useEffect(() => {
    if (allOrders.length > 0) {
      const profits = allOrders.reduce((acc, order) => {
        if (order.status === "delivered") {
          const financials = order.financials || {};
          const deliveryFee = financials.delivery_fee ?? 0;
          const driverComm = financials.system_commission ?? (deliveryFee * 0.15);
          const vendorComm = financials.vendor_commission ?? (deliveryFee * 0.15);
          const insurance = financials.insurance_fee ?? 2.0;
          return acc + driverComm + vendorComm + insurance;
        }
        return acc;
      }, 0);
      const fund = allOrders.reduce((acc, order) => {
        if (order.status === "delivered") {
          const financials = order.financials || {};
          return acc + (financials.insurance_fee ?? 2.0);
        }
        return acc;
      }, 0);
      setTotalProfits(profits);
      setInsuranceFund(fund);
    }
  }, [allOrders]);

  // 9. UI Handlers
  const handleBroadcast = useCallback(async (msg: string) => {
    try {
      setActionLoading(true);
      await broadcastAlert(msg);
      addActivity(`تم إرسال تنبيه عام: ${msg.slice(0, 20)}...`);
    } catch (e) { console.error("Broadcast failed", e); } finally { setActionLoading(false); }
  }, [broadcastAlert, addActivity]);

  const handleAddDriver = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const { error } = await createUserByAdmin(newDriverData.email, newDriverData.password, newDriverData.name, 'driver', { phone: newDriverData.phone, area: newDriverData.area, vehicle_type: newDriverData.vehicle_type, national_id: newDriverData.national_id });
    if (!error) {
      alert("تم إنشاء حساب الطيار بنجاح!");
      addActivity(`تم إنشاء حساب طيار: ${newDriverData.name}`);
      setShowAddDriver(false);
      setNewDriverData({ name: "", email: "", password: "", phone: "", area: "", vehicle_type: "موتوسيكل", national_id: "" });
      fetchData();
    } else { alert(`خطأ: ${getErrorMessage(error)}`); }
    setActionLoading(false);
  }, [newDriverData, addActivity, fetchData, getErrorMessage]);

  const handleAddVendor = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const { error } = await createUserByAdmin(newVendorData.email, newVendorData.password, newVendorData.name, 'vendor', { phone: newVendorData.phone });
    if (!error) {
      alert("تم إنشاء حساب المحل بنجاح!");
      addActivity(`تم إنشاء حساب محل: ${newVendorData.name}`);
      setShowAddVendor(false);
      setNewVendorData({ name: "", email: "", password: "", phone: "" });
      fetchData();
    } else { alert(`خطأ: ${getErrorMessage(error)}`); }
    setActionLoading(false);
  }, [newVendorData, addActivity, fetchData, getErrorMessage]);

  const handleUpdateAppConfig = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appConfig) return;
    setActionLoading(true);
    try {
      await updateAdminAppConfig(appConfig);
      alert("تم تحديث إعدادات النظام بنجاح!");
    } catch (error) { alert(`خطأ: ${getErrorMessage(error)}`); }
    setActionLoading(false);
  }, [appConfig, getErrorMessage]);

  const handleSettlementAction = useCallback(async (settlementId: string, newStatus: 'approved' | 'rejected') => {
    // Optimistic Update
    const originalSettlements = [...settlements];
    setSettlements(prev => prev.filter(s => s.id !== settlementId));

    try {
      const { error } = await supabase.from('settlements').update({ status: newStatus }).eq('id', settlementId);
      if (error) throw error;
      addActivity(`تم ${newStatus === "approved" ? "اعتماد" : "رفض"} تسوية`);
    } catch (err) {
      setSettlements(originalSettlements);
      alert("فشل تحديث حالة التسوية");
    }
  }, [settlements, addActivity]);

  const handleResetUser = useCallback(async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من تصفير كافة بيانات ${userName}؟`)) return;
    setActionLoading(true);
    try {
      await resetUserDataAdmin(userId);
      alert("تم التصفير!");
      addActivity(`تم تصفير بيانات ${userName}`);
      fetchData();
    } catch (error) { alert(`خطأ: ${getErrorMessage(error)}`); }
    setActionLoading(false);
  }, [addActivity, fetchData, getErrorMessage]);

  const handleGlobalReset = useCallback(async () => {
    if (!confirm("تحذير: هل أنت متأكد من تصفير كافة بيانات النظام؟")) return;
    setActionLoading(true);
    try {
      await resetAllSystemDataAdmin();
      alert("تم التصفير الشامل!");
      addActivity("تم تنفيذ تصفير شامل للنظام");
      fetchData();
    } catch (error) { alert(`خطأ: ${getErrorMessage(error)}`); }
    setActionLoading(false);
  }, [addActivity, fetchData, getErrorMessage]);

  const handleToggleShiftLock = useCallback(async (driverId: string, currentStatus: boolean) => {
    // Optimistic Update
    const originalDrivers = [...drivers];
    setDrivers(prev => prev.map(d => d.id_full === driverId ? { ...d, isShiftLocked: !currentStatus, status: !currentStatus ? "محظور" : "نشط" } : d));
    
    try {
      await toggleDriverLock(driverId, !currentStatus);
      addActivity(`تم ${!currentStatus ? "قفل" : "فتح"} شيفت الطيار`);
    } catch (e) { 
      setDrivers(originalDrivers);
      console.error(e); 
    }
  }, [drivers, addActivity]);

  const handleLockAllDrivers = useCallback(async () => {
    if (!confirm("هل تريد قفل شيفت جميع المناديب؟")) return;
    
    const originalDrivers = [...drivers];
    setDrivers(prev => prev.map(d => ({ ...d, isShiftLocked: true, status: "محظور" })));
    
    try {
      setActionLoading(true);
      for (const d of originalDrivers.filter(d => !d.isShiftLocked)) {
        await toggleDriverLock(d.id_full, true).catch(() => {});
      }
      addActivity("تم قفل شيفت جميع المناديب");
    } catch (e) {
      setDrivers(originalDrivers);
    } finally {
      setActionLoading(false);
    }
  }, [drivers, addActivity]);

  const handleUnlockAllDrivers = useCallback(async () => {
    if (!confirm("هل تريد فتح شيفت جميع المناديب؟")) return;
    
    const originalDrivers = [...drivers];
    setDrivers(prev => prev.map(d => ({ ...d, isShiftLocked: false, status: "نشط" })));
    
    try {
      setActionLoading(true);
      for (const d of originalDrivers.filter(d => d.isShiftLocked)) {
        await toggleDriverLock(d.id_full, false).catch(() => {});
      }
      addActivity("تم فتح شيفت جميع المناديب");
    } catch (e) {
      setDrivers(originalDrivers);
    } finally {
      setActionLoading(false);
    }
  }, [drivers, addActivity]);

  const handleToggleMaintenance = useCallback(async (val: boolean) => {
    if (!appConfig) return;
    const originalConfig = { ...appConfig };
    setAppConfig(prev => ({ ...prev, maintenance_mode: val }));
    try {
      await updateAdminAppConfig({ ...appConfig, maintenance_mode: val });
      addActivity(`تم ${val ? "تفعيل" : "إيقاف"}	وضع الصيانة`);
    } catch (e) { 
      setAppConfig(originalConfig);
      console.error(e); 
    }
  }, [appConfig, addActivity]);

  const handleAssignOrder = useCallback(async (orderId: string, driverId: string, driverName: string) => {
    // Optimistic Update
    const originalLiveOrders = [...liveOrders];
    setLiveOrders(prev => prev.map(o =>
      o.id_full === orderId ? { ...o, status: "تم التعيين", driver: driverName, driver_id: driverId } : o
    ));

    try {
      const { error } = await updateOrderStatus(orderId, 'assigned', driverId);
      if (error) throw error;
      addActivity(`تم تعيين الطلب #${orderId.slice(0,8)} للطيار ${driverName}`);
    } catch (err) {
      setLiveOrders(originalLiveOrders);
      alert("فشل تعيين الطلب");
    }
  }, [liveOrders, addActivity]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    // Optimistic Update
    const originalLiveOrders = [...liveOrders];
    setLiveOrders(prev => prev.map(o =>
      o.id_full === orderId ? { ...o, status: "ملغي" } : o
    ));

    try {
      const { error } = await updateOrderStatus(orderId, 'cancelled');
      if (error) throw error;
      addActivity(`تم إلغاء الطلب #${orderId.slice(0,8)}`);
    } catch (err) {
      setLiveOrders(originalLiveOrders);
      alert("فشل إلغاء الطلب");
    }
  }, [liveOrders, addActivity]);

  const handleUpdateOrderStatusManual = useCallback(async (orderId: string, status: any) => {
    const { error } = await updateOrderStatus(orderId, status);
    if (!error) {
      addActivity(`تعديل يدوي: حالة الطلب #${orderId.slice(0,8)} إلى ${translateStatus(status)}`);
      setLiveOrders(prev => prev.map(o => o.id_full === orderId ? { ...o, status: translateStatus(status) } : o ));
      fetchOrders(); // Refresh all data to ensure financials etc are updated
    }
  }, [addActivity, translateStatus, fetchOrders]);

  const handleUpdateVendorBilling = useCallback(async (vendorId: string, data: { commission_type?: 'percentage' | 'fixed', commission_value?: number, billing_type?: 'commission' | 'fixed_salary', monthly_salary?: number }) => {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', vendorId);

    if (!error) {
      addActivity(`تعديل نظام الفوترة لمحل: ${vendors.find(v => v.id_full === vendorId)?.name}`);
      setVendors(prev => prev.map(v => v.id_full === vendorId ? { ...v, ...data } : v));
    } else {
      console.error("Update billing error:", error);
    }
  }, [vendors, addActivity]);

  const handleSignOut = useCallback(async () => {
    try { await signOut(); } catch (error) { console.error('Sign out failed:', error); }
  }, []);

  // 10. Derived State
  const systemHealth = useMemo(() => {
    const activeOrdersCount = allOrders.filter(o => o.status === 'pending' || o.status === 'assigned' || o.status === 'in_transit').length;
    const onlineDriversCount = onlineDrivers.length;
    const ratio = onlineDriversCount > 0 ? activeOrdersCount / onlineDriversCount : activeOrdersCount;
    let status: "optimal" | "busy" | "congested" = "optimal";
    if (ratio > 2) status = "congested";
    else if (ratio > 1) status = "busy";
    return { activeOrdersCount, onlineDriversCount, ratio, status };
  }, [allOrders, onlineDrivers]);

  const stats = useMemo(() => [
    { title: "إجمالي الطلبات", value: allOrders.length, icon: <Truck className="text-sky-500 w-5 h-5" />, trend: "+12%", trendType: 'positive' as const, subtitle: "طلب", color: "sky" },
    { title: "المناديب النشطين", value: drivers.filter(d => !d.isShiftLocked).length, icon: <Users className="text-emerald-500 w-5 h-5" />, trend: "+5%", trendType: 'positive' as const, subtitle: "كابتن", color: "emerald" },
    { title: "صندوق التأمين", value: formatCurrency(insuranceFund), icon: <ShieldCheck className="text-rose-500 w-5 h-5" />, trend: "+2%", trendType: 'positive' as const, subtitle: "ج.م", color: "rose" },
    { title: "عمولات مستحقة", value: formatCurrency(totalSystemDebt), icon: <Wallet className="text-amber-500 w-5 h-5" />, trend: "المديونية", trendType: 'neutral' as const, subtitle: "ج.م", color: "amber" },
    { title: "أرباح النظام", value: formatCurrency(totalProfits), icon: <RefreshCw className="text-indigo-500 w-5 h-5" />, trend: "محسوبة", trendType: 'positive' as const, subtitle: "ج.م", color: "indigo" },
  ], [allOrders.length, drivers, insuranceFund, totalSystemDebt, totalProfits, formatCurrency]);

  // Diagnostic Info for Debugging
  const connectionInfo = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return {
      url: (supabase as any).supabaseUrl || 'unknown',
      authenticated: !!user,
      profileFound: !!allUsers.find(u => u.id === user?.id),
      usersCount: allUsers.length
    };
  }, [user, allUsers]);

  // 11. Render Helpers
  if (!mounted || loading || authLoading || error) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
        {error ? (
          <div className="bg-white/10 p-8 rounded-[40px] border border-red-500/30 backdrop-blur-xl max-w-sm">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">فشل تحميل النظام</h2>
            <p className="text-slate-400 text-sm mb-6">{error}</p>
            <button 
              onClick={() => { setError(null); fetchData(); }} 
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black transition-all shadow-lg shadow-blue-500/20"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full mb-6" />
            <h2 className="text-xl font-bold text-white mb-2">جاري تحميل لوحة الإدارة...</h2>
            <p className="text-slate-400 text-sm">يرجى الانتظار قليلاً، يتم جلب البيانات الآمنة</p>
            <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs rounded-xl transition-all border border-white/10">إعادة تحميل يدوية</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-right relative overflow-hidden transition-colors duration-300" dir="rtl">
      {/* Sidebar */}
      <motion.aside initial={false} animate={{ width: sidebarOpen ? 280 : (isMobile ? 0 : 88), x: sidebarOpen ? 0 : (isMobile ? 280 : 0) }} className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-l border-white/20 dark:border-slate-800/50 fixed lg:relative z-[70] h-screen overflow-hidden shadow-sm flex flex-col transition-colors">
        <div className="p-6 flex items-center gap-4 border-b border-gray-50 dark:border-slate-800 h-24">
          <div className="flex-shrink-0 bg-gray-50 dark:bg-slate-800 p-2 rounded-2xl"><StartLogo className="w-10 h-10" /></div>
          {sidebarOpen && <div className="flex flex-col"><h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 leading-none">START</h1><span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mt-1">Management</span></div>}
        </div>
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              {sidebarOpen && (
                <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => { setActiveView(item.id); if (isMobile) setSidebarOpen(false); }} 
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative group ${
                      activeView === item.id 
                        ? "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white shadow-xl shadow-slate-200 dark:shadow-none" 
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className={`${activeView === item.id ? (activeView.includes('dark') ? "text-slate-900" : "text-white dark:text-slate-900") : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100"} transition-colors`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    {sidebarOpen && (
                      <span className="text-sm font-bold flex-1 text-right">
                        {item.label}
                      </span>
                    )}
                    {item.id === 'operations' && liveOrders.filter(o => o.status === "جاري البحث").length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] font-black text-white flex items-center justify-center">
                          {liveOrders.filter(o => o.status === "جاري البحث").length}
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-slate-800"><button onClick={handleSignOut} className="w-full flex items-center gap-4 p-4 text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-2xl transition-all">{sidebarOpen && <span className="text-sm font-bold flex-1 text-right">تسجيل الخروج</span>}<LogOut className="w-5 h-5" /></button></div>
      </motion.aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300">
        <header className="glass-morphism dark:bg-slate-900/50 dark:border-slate-800 h-20 px-8 flex items-center justify-between sticky top-0 z-50 transition-colors">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors lg:hidden"
            >
              <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                لوحة التحكم
                <span className="ultimate-badge">ULTIMATE</span>
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {manualMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase">وضع يدوي</span>
              </div>
            )}
            {appConfig?.maintenance_mode && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">صيانة</span>
              </div>
            )}
            <button onClick={() => setActiveView("operations")} className="p-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
              <Zap className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-200 dark:shadow-none">
              {user?.email?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          <Suspense fallback={<AppLoader />}>
            {activeView === "dashboard" && (
        <DashboardView 
          activityLog={activityLog} 
          stats={stats} 
          onlineDrivers={onlineDrivers} 
          vendors={vendors}
          liveOrders={liveOrders}
          allOrders={allOrders}
          systemHealth={systemHealth}
        />
      )}

            {activeView === "operations" && (
              <OperationsCenter
                liveOrders={liveOrders}
                drivers={drivers}
                onlineDrivers={onlineDrivers}
                vendors={vendors}
                allOrders={allOrders}
                activities={activities}
                manualMode={manualMode}
                maintenanceMode={appConfig?.maintenance_mode || false}
                actionLoading={actionLoading}
                onToggleManualMode={setManualMode}
                onToggleMaintenance={handleToggleMaintenance}
                onToggleShiftLock={handleToggleShiftLock}
                onLockAllDrivers={handleLockAllDrivers}
                onUnlockAllDrivers={handleUnlockAllDrivers}
                onGlobalReset={handleGlobalReset}
                onRefresh={fetchData}
                onBroadcastMessage={handleBroadcast}
                onAssign={handleAssignOrder}
                onCancelOrder={handleCancelOrder}
                onUpdateStatus={handleUpdateOrderStatusManual}
              />
            )}

            {activeView === "users" && (
              <UserManagementView
                drivers={drivers}
                vendors={vendors}
                users={allUsers}
                onAddDriver={() => setShowAddDriver(true)}
                onAddVendor={() => setShowAddVendor(true)}
                onUpdateVendorBilling={handleUpdateVendorBilling}
                onToggleShiftLock={handleToggleShiftLock}
                onResetUser={handleResetUser}
              />
            )}

            {activeView === "reports" && (
              <ReportsView allOrders={allOrders} />
            )}

            {activeView === "settlements" && (
              <SettlementsView settlements={settlements} onSettlementAction={handleSettlementAction} />
            )}

            {activeView === "settings" && appConfig && (
              <SettingsView
                appConfig={appConfig}
                actionLoading={actionLoading}
                setAppConfig={setAppConfig}
                onSubmit={handleUpdateAppConfig}
                onGlobalReset={handleGlobalReset}
              />
            )}
            {activeView === "settings" && !appConfig && (
              <div className="bg-white p-8 rounded-[40px] text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
                <p className="text-slate-500 font-bold">جاري تحميل إعدادات النظام...</p>
              </div>
            )}
          </Suspense>
        </main>
      </div>

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
  );
}
