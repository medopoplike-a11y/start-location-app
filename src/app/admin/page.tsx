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
  BarChart3,
  FileText
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
const OrderHistoryView = dynamic(() => import("./components/OrderHistoryView"), { ssr: false });
const AccountsView = dynamic(() => import('./AccountsView'), { ssr: false });

import { signOut, createUserByAdmin } from "@/lib/auth";
import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { fetchAdminOrders, fetchLiveOrders, fetchAdminProfiles, resetUserDataAdmin, resetAllSystemDataAdmin, fetchAdminAppConfig, updateAdminAppConfig, toggleDriverLock, updateProfileBilling, updateUserAdmin, deleteUserByAdmin, deleteAdminOrder } from "@/lib/adminApi";
import { updateOrderStatus } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { getCache, setCache } from "@/lib/native-utils";
import { StartLogo } from "@/components/StartLogo";
import { AppLoader } from "@/components/AppLoader";
import { SyncIndicator } from "@/components/SyncIndicator";
import AuthGuard from "@/components/AuthGuard";
import { useSync } from "@/hooks/useSync";
import type { AdminOrder, LiveOrderItem, DriverCard, VendorCard, AppUser, OnlineDriver, SettlementItem, ProfileRow, WalletRow, ActivityItem, ActivityLogItem } from "./types";
import { useRef } from "react";

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
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // 3. Sidebar Menu Groups
  const menuGroups = [
    {
      title: "التشغيل والعمليات",
      items: [
        { id: "operations", label: "مركز العمليات الموحد", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
        { id: "order-history", label: "سجل الطلبات والفواتير", icon: FileText },
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

  // 7. Auto-Dispatch Loop (Simultaneous with manual)
  useEffect(() => {
    if (!autoRetryEnabled || activeView !== "operations") return;

    const retryAutoDispatch = async () => {
      const pendingOrders = liveOrders.filter(o => o.status === "جاري البحث" || o.status === "pending");
      if (pendingOrders.length === 0) return;

      console.log(`[Auto-Dispatch] Found ${pendingOrders.length} pending orders. Retrying...`);
      
      for (const order of pendingOrders) {
        try {
          // Find vendor location for this order
          const vendor = vendors.find(v => v.name === order.vendor || v.id_full === (order as any).vendor_id);
          const vLoc = vendor?.location ? { lat: vendor.location.lat!, lng: vendor.location.lng! } : undefined;
          
          const { assignOrderToNearestDriver } = await import("@/lib/orders");
          const result = await assignOrderToNearestDriver(order.id_full, vLoc);
          if (result.success) {
            addActivity(`توزيع تلقائي: تم تعيين الطلب #${order.id} للطيار ${result.driverName}`);
          }
        } catch (err) {
          console.error(`[Auto-Dispatch] Error for order ${order.id}:`, err);
        }
      }
    };

    const interval = setInterval(retryAutoDispatch, 15000); // Retry every 15 seconds
    return () => clearInterval(interval);
  }, [autoRetryEnabled, activeView, liveOrders, vendors, addActivity]);

  // 8. Background Refresh Loop for Driver Locations (Fallback for real-time)
  useEffect(() => {
    if (!mounted || activeView !== "operations") return;

    const backgroundRefresh = async () => {
      // Only fetch profiles to update driver locations
      console.log("[Polling] Refreshing driver locations (fallback)...");
      await fetchProfiles();
    };

    const interval = setInterval(backgroundRefresh, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [mounted, activeView, fetchProfiles]);

  // 7. Data Fetching Functions
  const fetchOrders = useCallback(async (fullHistory = false) => {
    try {
      // If we only need live orders for operations center, fetch a smaller subset
      // If we need history, fetch the 100 most recent
      const data = fullHistory ? await fetchAdminOrders(200) : await fetchLiveOrders();
      
      if (data) {
        const typedData = (data as AdminOrder[]).map(o => ({
          ...o,
          status_label: translateStatus(o.status)
        }));
        
        // Merge with existing orders to maintain history in UI if needed
        if (!fullHistory) {
          setAllOrders(prev => {
            const merged = [...typedData, ...prev.filter(p => p.status === 'delivered' || p.status === 'cancelled')].slice(0, 300);
            const seen = new Set();
            return merged.filter(o => seen.has(o.id) ? false : seen.add(o.id));
          });
        } else {
          setAllOrders(typedData);
        }

        setCache('admin_orders', typedData); // Cache latest fetch
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
        
        // Update activities only on important events
        if (typedData.length > 0) {
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
            if (role !== 'driver') return false;
            
            // If we have a location, we want to see them on the map regardless of how old it is
            // so we can see their last known position.
            return !!p.location;
          })
          .map((p) => {
          let loc = p.location;
          if (typeof loc === 'string') {
            try { loc = JSON.parse(loc) as { lat?: number; lng?: number }; } catch { loc = null; }
          }
          const normalizedLoc = typeof loc === "object" && loc !== null ? loc : null;
          
          if (!normalizedLoc?.lat || !normalizedLoc?.lng) return null;

          return {
            id: p.id,
            name: p.full_name || "غير معروف",
            lat: normalizedLoc.lat,
            lng: normalizedLoc.lng,
            lastSeen: p.last_location_update || p.updated_at ? new Date(p.last_location_update || p.updated_at || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "غير متوفر",
            is_online: p.is_online
          };
        })
          .filter((d): d is OnlineDriver => d !== null);
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
            return { 
              id: p.id.slice(0, 8), 
              id_full: p.id, 
              name: p.full_name || "بدون اسم", 
              status: p.is_locked ? "محظور" : "نشط", 
              isShiftLocked: !!p.is_locked, 
              earnings: w?.balance || 0, 
              debt: (w?.debt || 0) + (w?.system_balance || 0), 
              totalOrders: 0,
              email: p.email,
              phone: p.phone,
              max_active_orders: p.max_active_orders || 3,
              billing_type: p.billing_type || 'commission',
              commission_value: p.commission_value || 15,
              monthly_salary: p.monthly_salary || 0,
              rating: p.rating || 0
            };
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
              email: p.email,
              phone: p.phone,
              commission_type: (p as any).commission_type,
              commission_value: (p as any).commission_value,
              billing_type: (p as any).billing_type || 'commission',
              monthly_salary: (p as any).monthly_salary || 0,
              rating: p.rating || 0
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

  const isDataFetchingRef = useRef(false);
  const fetchData = useCallback(async (fullHistory = false) => {
    if (isDataFetchingRef.current) return;
    try {
      isDataFetchingRef.current = true;
      setError(null);
      
      const fetchWithTimeout = async (promise: Promise<any>, label: string) => {
        const timeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`انتهت مهلة جلب ${label}`)), 10000)
        );
        return Promise.race([promise, timeout]);
      };

      await Promise.allSettled([
        fetchWithTimeout(fetchProfiles(), "بيانات المستخدمين"),
        fetchWithTimeout(fetchOrders(fullHistory), "بيانات الطلبات"),
        fetchWithTimeout(fetchSettlements(), "بيانات التسويات"),
        fetchWithTimeout(fetchAppConfig(), "إعدادات النظام")
      ]);
    } catch (err) {
      console.error("Admin: Global fetch error:", err);
      setError(getErrorMessage(err));
    } finally {
      isDataFetchingRef.current = false;
    }
  }, [fetchProfiles, fetchOrders, fetchSettlements, fetchAppConfig, getErrorMessage]);

  // Fetch full history when switching to relevant tabs
  useEffect(() => {
    if (activeView === 'order-history' || activeView === 'reports') {
      fetchData(true);
    }
  }, [activeView, fetchData]);
  const { lastSync, isSyncing, broadcastAlert } = useSync(undefined, (payload) => {
    if (mounted && !authLoading && user) {
      let shouldFetchFull = true;

      // Delta Sync Optimization: Update specific states based on payload to avoid full re-fetch
      if (payload && payload.table === 'profiles' && payload.new) {
        const p = payload.new;
        
        // Find if this is a driver (either from payload or from our existing state)
        // If role is missing in payload (common in updates), we check our existing states
        const existingProfile = allUsers.find(u => u.id === p.id);
        const existingDriver = onlineDrivers.find(d => d.id === p.id);
        const role = (p.role || existingProfile?.role || (existingDriver ? 'driver' : '') || '').toLowerCase();
        
        if (role === 'driver') {
          console.log(`[Real-time] Driver update: ${p.full_name || p.id} - Location:`, p.location);
          
          setOnlineDrivers(prev => {
            const existing = prev.find(d => d.id === p.id);
            
            // Use existing data for missing fields in payload
            const fullName = p.full_name || existing?.name || existingProfile?.full_name || "غير معروف";
            const isOnline = p.is_online !== undefined ? p.is_online : (existing ? existing.is_online : true); 
            const lastUpdateVal = p.last_location_update || new Date().toISOString();
            
            let loc = p.location || (existingProfile?.location as any) || (existing as any)?.location;
            if (typeof loc === 'string') { try { loc = JSON.parse(loc); } catch { loc = null; } }
            
            const lastUpdate = new Date(lastUpdateVal).getTime();
            const now = Date.now();
            // Be very lenient: 24 hours
            const isFresh = now - lastUpdate < 24 * 60 * 60 * 1000;
            
            // If the driver is not fresh and doesn't have a location, remove them from the list
            if (!isFresh && !loc) return prev.filter(d => d.id !== p.id);
            
            const updatedDriver = {
              id: p.id,
              name: fullName,
              lat: loc?.lat || null,
              lng: loc?.lng || null,
              lastSeen: new Date(lastUpdateVal).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              rating: p.rating !== undefined ? p.rating : (existing?.rating || existingProfile?.rating || 0),
              is_online: isOnline
            };
            
            if (updatedDriver.lat === null || updatedDriver.lng === null) {
              // If location is null but they were already on the map, maybe keep their old location?
              if (existing && existing.lat && existing.lng) {
                updatedDriver.lat = existing.lat;
                updatedDriver.lng = existing.lng;
              } else {
                return prev.filter(d => d.id !== p.id);
              }
            }
            
            // Always update if location or status changed
            if (existing && existing.lat === updatedDriver.lat && existing.lng === updatedDriver.lng && existing.lastSeen === updatedDriver.lastSeen && existing.is_online === updatedDriver.is_online) {
              return prev;
            }
            
            if (existing) return prev.map(d => d.id === p.id ? { ...existing, ...updatedDriver } as OnlineDriver : d);
            return [...prev, updatedDriver as OnlineDriver];
          });
          
          // Also update allUsers to keep it fresh for future role checks
          setAllUsers(prev => {
            const exists = prev.find(u => u.id === p.id);
            if (!exists) return prev;
            return prev.map(u => u.id === p.id ? { ...u, ...p } : u);
          });
          
          // Optimization: If only location/online status of a driver changed, don't re-fetch EVERYTHING
          shouldFetchFull = false;
        } else if (role === 'vendor') {
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
      try {
        const [cachedOrders, cachedProfiles] = await Promise.all([
          getCache<AdminOrder[]>('admin_orders'),
          getCache<ProfileRow[]>('admin_profiles')
        ]);
        
        if (cachedOrders && cachedOrders.length > 0) {
          setAllOrders(cachedOrders);
          setLoading(false); // Hide loader early if we have cache
        }
      } catch (e) {
        console.warn("Failed to load admin cache:", e);
      }

      if (authLoading) return;
      if (!user) { setLoading(false); return; }

      try {
        setLoading(true);
        await fetchData();
        // Second fetch to ensure real-time is settled
        setTimeout(() => fetchData(), 2000);
      } catch (e) {
        setError(`فشل في تهيئة النظام: ${getErrorMessage(e)}`);
      } finally {
        clearTimeout(hardFallback);
        setLoading(false);
      }
    };

    init();
    
    return () => {
      clearTimeout(hardFallback);
    };
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

  const handleUpdateProfileBilling = useCallback(async (userId: string, data: any) => {
    try {
      setActionLoading(true);
      await updateProfileBilling(userId, data);
      addActivity(`تعديل إعدادات الحساب لمستخدم: ${allUsers.find(u => u.id === userId)?.full_name || userId}`);
      
      // Update local state for drivers and vendors
      setDrivers(prev => prev.map(d => d.id_full === userId ? { ...d, ...data } : d));
      setVendors(prev => prev.map(v => v.id_full === userId ? { ...v, ...data } : v));
      
      fetchData(); // Refresh to ensure all data is in sync
    } catch (e) {
      alert(`خطأ في تحديث البيانات: ${getErrorMessage(e)}`);
    } finally {
      setActionLoading(false);
    }
  }, [allUsers, addActivity, fetchData, getErrorMessage]);

  const handleUpdateUserDetails = useCallback(async (userId: string, updates: any) => {
    try {
      setActionLoading(true);
      await updateUserAdmin(userId, updates);
      addActivity(`تم تحديث بيانات المستخدم: ${updates.full_name || userId}`);
      fetchData();
    } catch (e) {
      alert(`خطأ في تحديث البيانات: ${getErrorMessage(e)}`);
    } finally {
      setActionLoading(false);
    }
  }, [addActivity, fetchData, getErrorMessage]);

  const handleDeleteUser = useCallback(async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من حذف حساب ${userName} بالكامل؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      setActionLoading(true);
      await deleteUserByAdmin(userId);
      addActivity(`تم حذف حساب المستخدم: ${userName}`);
      fetchData();
    } catch (e) {
      alert(`خطأ في حذف المستخدم: ${getErrorMessage(e)}`);
    } finally {
      setActionLoading(false);
    }
  }, [addActivity, fetchData, getErrorMessage]);

  const handleSignOut = useCallback(async () => {
    try { await signOut(); } catch (error) { console.error('Sign out failed:', error); }
  }, []);

  const handleDeleteAdminOrder = useCallback(async (orderId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً من السجل؟")) return;
    try {
      setActionLoading(true);
      await deleteAdminOrder(orderId);
      addActivity(`تم حذف الطلب #${orderId.slice(0, 8)}`);
      fetchData();
    } catch (e) {
      alert("خطأ في حذف الطلب");
    } finally {
      setActionLoading(false);
    }
  }, [addActivity, fetchData]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-right relative overflow-hidden transition-colors duration-500" dir="rtl">
      {/* Sidebar */}
      <motion.aside 
        initial={false} 
        animate={{ width: sidebarOpen ? 280 : (isMobile ? 0 : 88), x: sidebarOpen ? 0 : (isMobile ? 280 : 0) }} 
        className="drawer-glass fixed lg:relative z-[70] h-screen overflow-hidden flex flex-col transition-all duration-500"
      >
        <div className="p-6 flex items-center gap-4 border-b border-white/10 dark:border-slate-800/50 h-24">
          <div className="flex-shrink-0 bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl backdrop-blur-md border border-white/40 dark:border-slate-700/40 shadow-sm">
            <StartLogo className="w-10 h-10" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none tracking-tighter italic">START</h1>
              <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase mt-1 tracking-widest">Management</span>
            </div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-3">
              {sidebarOpen && (
                <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1 opacity-60">
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
                        ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                        : "text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className={`${activeView === item.id ? "text-white" : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100"} transition-colors`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    {sidebarOpen && (
                      <span className="text-sm font-black flex-1 text-right">
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
        <div className="p-4 border-t border-white/10 dark:border-slate-800/50">
          <button 
            onClick={handleSignOut} 
            className="w-full flex items-center gap-4 p-4 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all"
          >
            {sidebarOpen && <span className="text-sm font-black flex-1 text-right">تسجيل الخروج</span>}
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300">
        <header className="glass-panel h-20 px-8 flex items-center justify-between sticky top-0 z-50 transition-all duration-500">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/40 dark:hover:bg-slate-800/40 rounded-xl transition-colors lg:hidden"
            >
              <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2 italic">
                لوحة التحكم
                <span className="premium-badge">ULTIMATE</span>
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {autoRetryEnabled && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">التوزيع التلقائي نشط</span>
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

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-transparent">
          <Suspense fallback={<AppLoader />}>
            {activeView === "dashboard" && (
              <DashboardView 
                activityLog={activityLog} 
                stats={stats} 
                onlineDrivers={onlineDrivers} 
                vendors={vendors} 
                allOrders={allOrders}
                systemHealth={systemHealth}
              />
            )}
            {activeView === "order-history" && (
              <OrderHistoryView
                orders={allOrders}
                onEditOrder={(order) => {
                  alert("ميزة التعديل التفصيلي قيد التطوير - يمكنك استخدام تغيير الحالة من مركز العمليات حالياً");
                }}
                onDeleteOrder={handleDeleteAdminOrder}
                onCreateOrder={() => {
                  alert("يرجى إنشاء الطلبات من حساب المطعم لضمان دقة البيانات المالية حالياً");
                }}
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
                autoRetryEnabled={autoRetryEnabled}
                maintenanceMode={appConfig?.maintenance_mode || false}
                actionLoading={actionLoading}
                onToggleAutoRetry={setAutoRetryEnabled}
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
                onUpdateVendorBilling={handleUpdateProfileBilling}
                onUpdateDriverBilling={handleUpdateProfileBilling}
                onUpdateUserDetails={handleUpdateUserDetails}
                onDeleteUser={handleDeleteUser}
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
