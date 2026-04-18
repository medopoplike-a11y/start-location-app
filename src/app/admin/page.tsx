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
const WalletsView = dynamic(() => import('./components/WalletsView'), { ssr: false });

import { signOut, createUserByAdmin } from "@/lib/auth";
import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { fetchOrders as fetchAdminOrders, updateOrderStatus } from "@/lib/api/orders";
import { fetchProfiles as fetchAdminProfiles, toggleLock as toggleDriverLock, updateProfile as updateProfileBilling } from "@/lib/api/profiles";
import { fetchWallets as fetchAdminWallets, updateWallet as updateAdminWallet } from "@/lib/api/wallets";
import { resetUserDataAdmin, resetAllSystemDataAdmin, fetchAdminAppConfig, updateAdminAppConfig, deleteUserByAdmin, deleteAdminOrder } from "@/lib/adminApi"; // Still need some RPCs from adminApi for now
import { supabase } from "@/lib/supabaseClient";
import { getCache, setCache } from "@/lib/native-utils";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import { StartLogo } from "@/components/StartLogo";
import { AppLoader } from "@/components/AppLoader";
import { SyncIndicator } from "@/components/SyncIndicator";
import AuthGuard from "@/components/AuthGuard";
import { useSync } from "@/hooks/useSync";
import type { AdminOrder, LiveOrderItem, DriverCard, VendorCard, AppUser, OnlineDriver, SettlementItem, ProfileRow, WalletRow, ActivityItem, ActivityLogItem } from "./types";
import { useRef } from "react";

import { formatCurrency, translateStatus, getErrorMessage } from "@/lib/utils/format";
import { menuGroups } from "./config/menu"; // Move static data to config

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
  const { toasts, removeToast, success: toastSuccess, error: toastError } = useToast();
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

  // 3. Data State
  const [drivers, setDrivers] = useState<DriverCard[]>([]);
  const [liveOrders, setLiveOrders] = useState<LiveOrderItem[]>([]);
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([]);
  const [vendors, setVendors] = useState<VendorCard[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const onlineDriversRef = useRef<OnlineDriver[]>([]);
  
  // Sync ref with state for stable callbacks (V0.9.75)
  useEffect(() => {
    onlineDriversRef.current = onlineDrivers;
  }, [onlineDrivers]);

  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const isDataFetchingRef = useRef(false);
  
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
  const broadcastAlert = useCallback(async (message: string) => {
    try {
      const channel = supabase.channel('system_alerts');
      await channel.send({
        type: 'broadcast',
        event: 'system_alert',
        payload: { message, timestamp: new Date().toISOString() }
      });
      return { success: true };
    } catch (error) {
      console.error("Broadcast failed:", error);
      throw error;
    }
  }, []);

  const updateDriverRegistry = useCallback((payload: Partial<OnlineDriver> & { id: string }, source: 'db' | 'realtime') => {
    setOnlineDrivers(prev => {
      const existingIndex = prev.findIndex(d => d.id === payload.id);
      const existing = existingIndex !== -1 ? prev[existingIndex] : null;
      const now = Date.now();
      
      // 1. Timestamp Protection: Never let old data overwrite new data
      const payloadTs = payload.lastSeenTimestamp || (source === 'realtime' ? now : 0);
      
      if (existing && existing.lastSeenTimestamp && payloadTs < existing.lastSeenTimestamp) {
        // GHOST PROTECTION (V0.9.57): If DB data is older than current memory, 
        // ONLY update status/online, but KEEP the newer location we already have.
        if (source === 'db') {
          const newDrivers = [...prev];
          newDrivers[existingIndex] = {
            ...existing,
            is_online: payload.is_online !== undefined ? payload.is_online : existing.is_online,
            status: payload.status || existing.status
          };
          return newDrivers;
        }
        
        // If both are Realtime and this one is older (out of order delivery)
        if (source === 'realtime' && (existing.lastSeenTimestamp - payloadTs) > 100) {
           return prev;
        }
      }

      // 2. Precision Location Parsing
      const lat = payload.lat ?? existing?.lat ?? 0;
      const lng = payload.lng ?? existing?.lng ?? 0;
      
      if (lat === 0 || lng === 0) return prev;

      // 3. Force move for Realtime updates (V0.9.50)
      // Even if the movement is tiny, we want the marker to move in Realtime
      const locChanged = source === 'realtime' || Math.abs((existing?.lat || 0) - lat) > 0.000001 || Math.abs((existing?.lng || 0) - lng) > 0.000001;

      // 4. Status & Online logic
      const isOnline = payload.is_online !== undefined ? payload.is_online : (existing?.is_online ?? true);
      
      // 5. Breadcrumb Path (V0.9.50): Keep last 30 points for a detailed movement trail
      let updatedPath = existing?.path || [];
      if (locChanged) {
        updatedPath = [...updatedPath, { lat, lng }].slice(-30);
      }

      const updatedDriver: OnlineDriver = {
        ...existing,
        ...payload,
        id: payload.id,
        name: payload.name || existing?.name || payload.full_name || "كابتن",
        lat,
        lng,
        path: updatedPath,
        lastSeen: source === 'realtime' ? "الآن" : (existing?.lastSeen || "تحديث..."),
        lastSeenTimestamp: payloadTs,
        is_online: isOnline,
        status: payload.status || existing?.status || 'available',
        rating: payload.rating ?? existing?.rating ?? 0
      };

      // V1.0.1: Added timestamp protection for setDrivers to prevent stale DB data from overwriting real-time location
      setDrivers(current => {
        const updated = current.map(d => {
          if (d.id_full === payload.id) {
            // PROTECTION: If current driver in list has a newer timestamp, don't overwrite its location
            if (d.lastSeenTimestamp && payloadTs < d.lastSeenTimestamp) {
               return {
                 ...d,
                 isOnline: payload.is_online !== undefined ? payload.is_online : d.isOnline,
                 status: d.isShiftLocked ? "محظور" : (payload.is_online !== undefined ? (payload.is_online ? "متصل" : "غير متصل") : d.status),
               };
            }

            const isOnlineStatus = payload.is_online !== undefined ? payload.is_online : d.isOnline;
            
            // Calculate relative time for the card
            let relativeTime = d.lastSeen;
            if (source === 'realtime') {
              relativeTime = "الآن";
            } else if (payload.lastSeenTimestamp) {
              const mins = Math.floor((Date.now() - payload.lastSeenTimestamp) / 60000);
              if (mins < 1) relativeTime = "الآن";
              else if (mins < 60) relativeTime = `منذ ${mins} دقيقة`;
              else if (mins < 1440) relativeTime = `منذ ${Math.floor(mins/60)} ساعة`;
              else relativeTime = `منذ ${Math.floor(mins/1440)} يوم`;
            }

            return { 
              ...d, 
              isOnline: isOnlineStatus, 
              status: d.isShiftLocked ? "محظور" : (isOnlineStatus ? "متصل" : "غير متصل"),
              location: { lat, lng, ts: payloadTs },
              lastSeen: relativeTime,
              lastSeenTimestamp: payloadTs
            };
          }
          return d;
        });
        
        // V1.0.4: Ensure new reference for immediate React state update
        return [...updated];
      });

      if (existing) {
        const statusChanged = existing.status !== updatedDriver.status || existing.is_online !== updatedDriver.is_online;
        
        // V0.9.50: Ultra-fast updates for Real-time (250ms) to ensure smooth marker movement
        const cooldown = source === 'realtime' ? 250 : 5000;
        if (!locChanged && !statusChanged && (now - (existing.lastSeenTimestamp || 0) < cooldown)) {
          return prev;
        }

        const newDrivers = [...prev];
        newDrivers[existingIndex] = updatedDriver;
        return newDrivers;
      }
      return [...prev, updatedDriver];
    });
  }, []);

  // Locations older than this are not rendered on the live map (they may be days old).
  const LOCATION_STALE_MS = 12 * 60 * 60 * 1000; // 12 hours

  const processProfiles = useCallback((profiles: ProfileRow[], walletsData?: WalletRow[]) => {
    // Process ALL profiles for registry first
    profiles.forEach(p => {
      if ((p.role || '').toLowerCase() === 'driver') {
        let loc = p.location;
        if (typeof loc === 'string') { try { loc = JSON.parse(loc); } catch { loc = null; } }
        const normalizedLoc = typeof loc === "object" && loc !== null ? loc : null;
        
        const lastUpdateStr = p.last_location_update || p.updated_at;
        const lastUpdateTs = lastUpdateStr ? new Date(lastUpdateStr).getTime() : 0;
        
        const hasCoords = normalizedLoc && normalizedLoc.lat != null && normalizedLoc.lng != null;

        // Skip locations that are stale (older than 12 h) unless the driver is currently online.
        // This prevents the admin map from showing drivers at positions from days ago on login.
        const locationIsFresh = lastUpdateTs > 0 && (Date.now() - lastUpdateTs) < LOCATION_STALE_MS;

        // FIX: A driver is "actually online" only if is_online=true AND the location was updated
        // recently (within 30 minutes). This prevents showing drivers who closed the app days ago
        // but still have is_online=true in the DB (because the app was killed without a clean logout).
        const ONLINE_STALE_MS = 30 * 60 * 1000; // 30 minutes
        const isActuallyOnline = p.is_online && lastUpdateTs > 0 && (Date.now() - lastUpdateTs) < ONLINE_STALE_MS;
        
        if (hasCoords && (isActuallyOnline || locationIsFresh)) {
          updateDriverRegistry({
            id: p.id,
            name: p.full_name || "غير معروف",
            lat: normalizedLoc!.lat!,
            lng: normalizedLoc!.lng!,
            lastSeenTimestamp: lastUpdateTs,
            is_online: isActuallyOnline,
            status: isActuallyOnline ? 'available' : undefined,
            rating: p.rating || 0
          }, 'db');
        }
      }
    });

    const users = profiles.map((u) => ({
      id: u.id, email: u.email || "", full_name: u.full_name || "غير مسجل", phone: u.phone || "غير مسجل", area: u.area || "غير محدد", vehicle_type: u.vehicle_type || "غير محدد", national_id: u.national_id || "غير مسجل", role: (u.role || 'driver').toLowerCase(), created_at: u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : 'غير متوفر'
    }));
    setAllUsers(users);

    const activeWallets = walletsData || wallets || [];

    const driversFromProfiles = profiles.filter((p) => (p.role || '').toLowerCase() === 'driver');
    const driverCards = driversFromProfiles.map((p) => {
      const w = activeWallets.find((wal) => wal.user_id === p.id);
      const lastSeenStr = p.last_location_update || p.updated_at;
      const dbLastUpdateTs = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
      
      // V0.9.72: Registry-First Strategy - Single Source of Truth for position
      const registryEntry = onlineDriversRef.current.find(od => od.id === p.id);
      
      // V1.0.1: Improved Online Logic - Use registry if exists and fresh, otherwise DB
      const registryIsFresh = registryEntry && (Date.now() - (registryEntry.lastSeenTimestamp || 0) < 15 * 60 * 1000); // 15 mins
      const isActuallyOnline = !!registryEntry?.is_online || (!!p.is_online && (Date.now() - dbLastUpdateTs < 30 * 60 * 1000));

      let relativeTime = "غير متوفر";
      const finalLastUpdateTs = Math.max(dbLastUpdateTs, registryEntry?.lastSeenTimestamp || 0);
      const mins = Math.floor((Date.now() - finalLastUpdateTs) / 60000);

      if (registryEntry?.lastSeen === "الآن" || mins < 1) {
        relativeTime = "الآن";
      } else if (finalLastUpdateTs > 0) {
        if (mins < 60) relativeTime = `منذ ${mins} دقيقة`;
        else if (mins < 1440) relativeTime = `منذ ${Math.floor(mins/60)} ساعة`;
        else relativeTime = `منذ ${Math.floor(mins/1440)} يوم`;
      }

      const isOnlineValue = isActuallyOnline;

      // V0.9.72: CRITICAL - Prefer the registry location ALWAYS if it exists and is newer
      let currentLocation = p.location;
      const currentInState = drivers.find(d => d.id_full === p.id);
      
      if (registryEntry && (registryEntry.lat != null && registryEntry.lng != null) && (registryEntry.lastSeenTimestamp || 0) >= dbLastUpdateTs) {
        currentLocation = { 
          lat: registryEntry.lat, 
          lng: registryEntry.lng, 
          ts: registryEntry.lastSeenTimestamp || Date.now() 
        };
      } else if (currentInState?.location?.ts && currentInState.location.ts > dbLastUpdateTs) {
        // Fallback to existing state if it's newer than DB (prevents jumping back to 6-day-old DB data)
        currentLocation = currentInState.location;
      } else if (typeof currentLocation === 'string') {
        try { currentLocation = JSON.parse(currentLocation); } catch { currentLocation = null; }
      }

      return { 
        id: p.id.slice(0, 8), 
        id_full: p.id, 
        name: p.full_name || "بدون اسم", 
        status: p.is_locked ? "محظور" : (isOnlineValue ? "متصل" : "غير متصل"), 
        lastSeen: relativeTime,
        lastSeenTimestamp: finalLastUpdateTs,
        isShiftLocked: !!p.is_locked, 
        isOnline: isOnlineValue, 
        earnings: w?.balance || 0, 
        debt: (w?.debt || 0) + (w?.system_balance || 0), 
        totalOrders: 0,
        email: p.email, 
        phone: p.phone, 
        max_active_orders: p.max_active_orders || 3, 
        billing_type: p.billing_type || 'commission', 
        commission_value: p.commission_value || 15, 
        monthly_salary: p.monthly_salary || 0, 
        rating: p.rating || 0,
        location: currentLocation 
      };
    });
    setDrivers(driverCards);

    const vendorsFromProfiles = profiles.filter((p) => (p.role || '').toLowerCase() === 'vendor');
    const vendorCards = vendorsFromProfiles.map((p) => {
      const w = activeWallets.find((wal) => wal.user_id === p.id);
      let loc = p.location;
      if (typeof loc === 'string') { try { loc = JSON.parse(loc); } catch { loc = null; } }
      const location = typeof loc === "object" && loc !== null ? loc : null;
      return { 
        id: p.id.slice(0, 8), id_full: p.id, name: p.full_name || "بدون اسم", type: "محل", orders: 0, balance: (w?.debt || 0) + (w?.system_balance || 0), status: "نشط", location,
        email: p.email, phone: p.phone, commission_type: (p as any).commission_type, commission_value: (p as any).commission_value, billing_type: (p as any).billing_type || 'commission', monthly_salary: (p as any).monthly_salary || 0, rating: p.rating || 0
      };
    });
    setVendors(vendorCards);

    if (walletsData) {
      setWallets(walletsData);
      setTotalSystemDebt(walletsData.reduce((acc, w) => acc + (w.system_balance || 0), 0));
    }
  }, [updateDriverRegistry, onlineDrivers, wallets]); // V0.9.87: Re-added onlineDrivers to trigger UI refresh on presence changes

  const addActivity = useCallback((text: string) => {
    setActivityLog(prev => [{
      id: Math.random().toString(36).substring(2, 11),
      text,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }, ...prev].slice(0, 5));
  }, []);

  // 7. Data Fetching Functions (Corrected Order to avoid TDZ)
  const fetchAppConfig = useCallback(async () => {
    try {
      const data = await fetchAdminAppConfig();
      if (data) setAppConfig(data);
    } catch (err) {
      console.error('Admin: Error fetching app config:', err);
    }
  }, []);

  const fetchOrders = useCallback(async (fullHistory = false) => {
    try {
      const data = fullHistory ? await fetchAdminOrders(200) : await fetchLiveOrders();
      if (data) {
        const typedData = (data as AdminOrder[]).map(o => ({
          ...o,
          status_label: translateStatus(o.status)
        }));
        if (!fullHistory) {
          setAllOrders(prev => {
            const merged = [...typedData, ...prev.filter(p => p.status === 'delivered' || p.status === 'cancelled')].slice(0, 300);
            const seen = new Set();
            return merged.filter(o => seen.has(o.id) ? false : seen.add(o.id));
          });
        } else {
          setAllOrders(typedData);
        }
        setCache('admin_orders', typedData);
        const live = typedData.filter((o) => o.status === 'pending' || o.status === 'assigned' || o.status === 'in_transit').map((o) => {
          const rawProfiles = (o as any).profiles;
          const vendorProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : (rawProfiles || {});
          const vName = vendorProfile.full_name || o.vendor_full_name || "محل غير معروف";
          return {
            id: o.id.slice(0, 8), id_full: o.id, vendor: vName, customer: o.customer_details?.name || "عميل",
            status: translateStatus(o.status), driver: o.driver_id ? "تم التعيين" : null, driver_id: o.driver_id,
            amount: o.financials?.order_value || 0, delivery_fee: o.financials?.delivery_fee || 0,
            created_at: o.created_at, customers: o.customer_details?.customers
          };
        });
        setLiveOrders(live);
        if (typedData.length > 0) {
          setActivities(typedData.slice(0, 5).map((o) => {
            const rawProfiles = (o as any).profiles;
            const vendorProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : (rawProfiles || {});
            const vName = vendorProfile.full_name || o.vendor_full_name || "محل";
            return {
              id: o.id, type: 'order', text: `طلب جديد من ${vName} بقيمة ${o.financials?.order_value} ج.م`,
              time: new Date(o.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            };
          }));
        }
      }
    } catch (err) { console.error("Admin: Error fetching orders:", err); }
  }, [translateStatus]);

  const fetchSettlements = useCallback(async () => {
    // V1.3.0: Fetching settlements with detailed profile information
    const { data, error } = await supabase
      .from('settlements')
      .select('*, profiles!user_id(full_name, role, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error("Admin: Error fetching settlements:", error);
      return;
    }
    if (data) setSettlements(data);
  }, []);

  const fetchProfiles = useCallback(async () => {
    try {
      const profiles = await fetchAdminProfiles();
      if (profiles) {
        const typedProfiles = profiles as ProfileRow[];
        setCache('admin_profiles', typedProfiles);
        
        // V1.3.8: CRITICAL - Fetch wallets with a clean select to avoid any caching issues
        const { data: walletsData, error: walletsError } = await supabase
          .from('wallets')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (walletsError) throw walletsError;
        
        processProfiles(typedProfiles, (walletsData as WalletRow[]) || []);

        // FIX: Clean up stale is_online=true flags in the DB for drivers who haven't
        // sent a location update in over 30 minutes. This happens when a driver's app
        // is killed by the OS without a clean logout (is_online stays true forever).
        const staleThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        supabase
          .from('profiles')
          .update({ is_online: false })
          .eq('is_online', true)
          .eq('role', 'driver')
          .lt('last_location_update', staleThreshold)
          .then(({ error: cleanupErr }) => {
            if (cleanupErr) console.warn("Admin: Stale online cleanup failed (non-blocking):", cleanupErr);
          });
      }
    } catch (err) { console.error("Admin: Error fetching profiles:", err); }
  }, [processProfiles]);

  const fetchData = useCallback(async (fullHistory = false) => {
    if (isDataFetchingRef.current) return;
    try {
      isDataFetchingRef.current = true;
      setError(null);
      const fetchWithTimeout = async (promise: Promise<any>, label: string) => {
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`انتهت مهلة جلب ${label}`)), 10000));
        return Promise.race([promise, timeout]);
      };

      // V1.2.5: Auto-unassign stale orders (> 15 mins) on every data refresh
      try {
        const { data: staleData, error: staleError } = await supabase.rpc('auto_unassign_stale_orders');
        if (!staleError && staleData?.unassigned_count > 0) {
          addActivity(`تم سحب ${staleData.unassigned_count} طلب متأخر وإعادة توزيعه`);
          toastSuccess(`تنبيه: تم سحب ${staleData.unassigned_count} طلب متأخر من الطيارين`);
        }
      } catch (e) {
        console.warn("Admin: Auto-unassign failed", e);
      }

      await Promise.allSettled([
        fetchWithTimeout(fetchProfiles(), "بيانات المستخدمين"),
        fetchWithTimeout(fetchOrders(fullHistory), "بيانات الطلبات"),
        fetchWithTimeout(fetchSettlements(), "بيانات التسويات"),
        fetchWithTimeout(fetchAppConfig(), "إعدادات النظام")
      ]);
    } catch (err) {
      console.error("Admin: Global fetch error:", err);
      setError(getErrorMessage(err));
    } finally { isDataFetchingRef.current = false; }
  }, [fetchProfiles, fetchOrders, fetchSettlements, fetchAppConfig, getErrorMessage, addActivity]);

  const manualSync = useCallback(async (payload?: any) => {
    if (!mounted) return;

    // On app resume or tab-focus, reset the fetching lock in case it got stuck
    // while the app was backgrounded (fetch interrupted on native platforms).
    if (payload?.source === 'app_resume' || payload?.source === 'visibility_change') {
      isDataFetchingRef.current = false;
    }
    
    // V1.4.0: Optimized real-time location and status updates
    if (payload?.source === 'location_update' || (payload?.source === 'profiles' && payload?.event === 'UPDATE')) {
      const data = payload.payload?.new || payload.payload;
      if (data?.id) {
        updateDriverRegistry({
          id: data.id,
          name: data.full_name || "غير معروف",
          lat: data.location?.lat,
          lng: data.location?.lng,
          is_online: data.is_online,
          lastSeenTimestamp: data.last_location_update ? new Date(data.last_location_update).getTime() : Date.now()
        }, 'realtime');
      }
      return;
    }

    if (isDataFetchingRef.current) return;
    try {
      await fetchData();
    } catch (e) {}
  }, [mounted, fetchData, updateDriverRegistry]);

  const handleRefresh = useCallback(async () => {
    try {
      // CLEAR EVERYTHING for a fresh start
      localStorage.clear();
      sessionStorage.clear();
      
      // Force reload the entire supabase client state if possible by refreshing data
      console.log("Admin: ALL Cache cleared manually");
    } catch (e) {}
    
    setLoading(true);
    await fetchData(true);
    addActivity("تم تصفير الذاكرة وتحديث البيانات بالكامل");
    setLoading(false);
  }, [fetchData, addActivity]);

  // 7. Auto-Dispatch Loop (Simultaneous with manual)
  useEffect(() => {
    if (!autoRetryEnabled || activeView !== "operations") return;

    const retryAutoDispatch = async () => {
      // V1.4.1: Run stale order cleanup before new dispatching
      try {
        const { data: staleData } = await supabase.rpc('auto_unassign_stale_orders');
        if (staleData?.unassigned_count > 0) {
          addActivity(`تم سحب ${staleData.unassigned_count} طلب متأخر وإعادة توزيعه تلقائياً`);
        }
      } catch (e) {}

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
      // 1. Only fetch profiles to update driver locations
      console.log("[Polling] Refreshing driver locations (fallback)...");
      await fetchProfiles();

      // 2. Cleanup stale drivers from the Real-time Registry (Inactive for more than 1 hour and offline)
      // V0.9.71: Increased threshold to 1 hour to prevent flickering/disappearing
      setOnlineDrivers(prev => {
        const now = Date.now();
        const threshold = 60 * 60 * 1000;
        return prev.filter(d => d.is_online || (now - (d.lastSeenTimestamp || 0) < threshold));
      });
    };

    const interval = setInterval(backgroundRefresh, 10000); // V0.9.87: Faster refresh (10s) for better dashboard response
    return () => clearInterval(interval);
  }, [mounted, activeView, fetchProfiles]);

  // Fetch full history when switching to relevant tabs
  useEffect(() => {
    if (activeView === 'order-history' || activeView === 'reports') {
      fetchData(true);
    }
  }, [activeView, fetchData]);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      KeepAwake.keepAwake().catch(() => {});
      return () => {
        KeepAwake.allowSleep().catch(() => {});
      };
    }
  }, [mounted]);

  const { lastSync, isSyncing, triggerUpdate } = useSync(user?.id, (payload) => {
    if (mounted && !authLoading && user) {

      // ── Real-time driver location broadcast (highest priority, no DB fetch needed) ──
      if (payload?.source === 'location_update') {
        const d = payload.payload;
        if (d?.id && d?.location?.lat != null && d?.location?.lng != null) {
          updateDriverRegistry({
            id: d.id,
            name: d.name,
            lat: d.location.lat,
            lng: d.location.lng,
            is_online: d.is_online !== undefined ? d.is_online : true,
            lastSeenTimestamp: d.ts || Date.now()
          }, 'realtime');
        }
        return; // Skip full data fetch – location-only update
      }

      // ── DB profile changes (online status, full_name, etc.) ──
      if (payload?.source === 'profiles' || (payload?.source === 'postgres' && payload?.table === 'profiles')) {
        const newData = payload.new || payload.payload?.new;
        if (newData) {
          updateDriverRegistry({
            id: newData.id,
            name: newData.full_name, // V1.2.6: Pass name on profile update
            lat: newData.location?.lat,
            lng: newData.location?.lng,
            is_online: newData.is_online,
            lastSeenTimestamp: newData.location?.ts || (newData.last_location_update ? new Date(newData.last_location_update).getTime() : Date.now())
          }, 'db');
          if (newData.location && !newData.full_name && !newData.role) return;
        }
      }

      if (payload && payload.table === 'location_logs' && payload.new) {
        const log = payload.new;
        updateDriverRegistry({
          id: log.user_id,
          lat: log.lat,
          lng: log.lng,
          lastSeenTimestamp: new Date(log.created_at).getTime()
        }, 'realtime');
        return;
      }

      // ── Structural changes (orders, wallets, etc.) → full refresh ──
      console.log(`[Admin-Sync] Structural change detected: ${payload?.source || payload?.table}. Fetching data...`);
      fetchData();
    }
  }, true);

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
      // 1. Force full data fetch on Web for first load
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
      
      // 1. Load cached data for instant display (ONLY for native mobile)
      if (isNative) {
        try {
          const [cachedOrders, cachedProfiles] = await Promise.all([
            getCache<AdminOrder[]>('admin_orders'),
            getCache<ProfileRow[]>('admin_profiles')
          ]);
          
          if (cachedOrders && cachedOrders.length > 0) {
            setAllOrders(cachedOrders);
          }
          
          if (cachedProfiles && cachedProfiles.length > 0) {
            processProfiles(cachedProfiles);
            setLoading(false); // Hide loader early
          }
        } catch (e) {
          console.warn("Failed to load admin cache:", e);
        }
      }

      if (authLoading) return;
      if (!user) { setLoading(false); return; }

      try {
        setLoading(true);
        // V0.9.94: SINGLE INITIALIZATION FETCH
        await fetchData(true);
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
  }, [mounted, authLoading, user]); // fetchData removed from deps to prevent infinite loop (V0.9.75)

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
      
      // V0.9.90: CRITICAL - Trigger a full data refresh to ensure wallets update correctly in UI
      setTimeout(() => {
        fetchData(true);
      }, 1000);
    } catch (err) {
      setSettlements(originalSettlements);
      alert("فشل تحديث حالة التسوية");
    }
  }, [settlements, addActivity, fetchData]);

  const handleResetUser = useCallback(async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من تصفير كافة بيانات ${userName}؟ سيتم حذف الطلبات المكتملة وتصفير المحفظة.`)) return;
    setActionLoading(true);
    try {
      // 1. Reset Wallet (Original V1.2.0 logic includes order cleanup)
      const { error: walletError } = await supabase.rpc('reset_wallet_balance', { p_user_id: userId });
      if (walletError) throw walletError;

      toastSuccess(`تم تصفير بيانات ${userName} بالكامل`);
      addActivity(`تم تصفير حساب ${userName}`);
      fetchData(true);
    } catch (error) { toastError(`خطأ: ${getErrorMessage(error)}`); }
    setActionLoading(false);
  }, [addActivity, fetchData, getErrorMessage, toastSuccess, toastError]);

  // V1.2.7: Reverting granular settlement handlers - returning to single stable reset
  /*
  const handleSettleVendorDebt = ...
  const handleSettleSystemDebt = ...
  */

  const handleGlobalReset = useCallback(async () => {
    if (!confirm("تحذير: هل أنت متأكد من تصفير كافة حسابات النظام وتنظيف جميع السجلات؟")) return;
    setActionLoading(true);
    try {
      // 1. Reset All Wallets
      const { error: walletError } = await supabase.rpc('reset_all_wallets');
      if (walletError) throw walletError;

      // 2. Cleanup All History
      const { error: cleanupError } = await supabase.rpc('cleanup_all_orders');
      if (cleanupError) throw cleanupError;

      alert("تم التصفير الشامل للنظام بنجاح!");
      addActivity("تم تنفيذ تصفير شامل للنظام وتنظيف السجلات");
      fetchData(true);
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
      addActivity(`تم ${val ? "تفعيل" : "إيقاف"}        وضع الصيانة`);
    } catch (e) { 
      setAppConfig(originalConfig);
      console.error(e); 
    }
  }, [appConfig, addActivity]);

  const handleAssignOrder = useCallback(async (orderId: string, driverId: string, driverName: string) => {
    // V0.9.88: Optimized Atomic Manual Assignment
    const originalLiveOrders = [...liveOrders];
    
    // Optimistic Update
    setLiveOrders(prev => prev.map(o =>
      o.id_full === orderId ? { ...o, status: "تم التعيين", driver: driverName, driver_id: driverId } : o
    ));

    try {
      // Use the new atomic RPC to prevent race conditions even in manual mode
      const { data: rpcData, error: rpcError } = await supabase.rpc('assign_order_atomic', {
        p_order_id: orderId,
        p_driver_id: driverId
      });

      if (rpcError || !(rpcData as any)?.success) {
        throw new Error((rpcData as any)?.error || "فشل تعيين الطلب (حالة سباق)");
      }
      
      addActivity(`تم تعيين الطلب #${orderId.slice(0,8)} للطيار ${driverName}`);
      
      // Haptic feedback for Admin
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
    } catch (err: any) {
      setLiveOrders(originalLiveOrders);
      alert(err.message || "فشل تعيين الطلب");
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
  const [showSyncDebug, setShowSyncDebug] = useState(false);
  const connectionInfo = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return {
      url: (supabase as any).supabaseUrl || 'unknown',
      authenticated: !!user,
      profileFound: !!allUsers.find(u => u.id === user?.id),
      usersCount: allUsers.length,
      isSyncing,
      lastSyncTime: lastSync.toLocaleTimeString(),
      driversOnline: onlineDrivers.length
    };
  }, [user, allUsers, isSyncing, lastSync, onlineDrivers.length]);

  // 11. Render Helpers
  if (!mounted || loading || authLoading) {
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
      {/* Sidebar - V1.0.0 GLASSMORPHISM DESIGN */}
      <motion.aside 
        initial={false} 
        animate={{ width: sidebarOpen ? 280 : (isMobile ? 0 : 88), x: sidebarOpen ? 0 : (isMobile ? 280 : 0) }} 
        className="drawer-glass fixed lg:relative z-[70] h-screen overflow-hidden flex flex-col transition-all duration-500 border-l border-white/10 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl shadow-2xl"
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
                <span className="premium-badge bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[8px]">AD-ULTIMATE</span>
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                Admin Control Center
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                V1.0.0-STABLE-RELEASE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSyncDebug(!showSyncDebug)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all ${
                isSyncing ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? "bg-blue-500 animate-spin" : "bg-emerald-500 animate-pulse"}`} />
              <span className={`text-[10px] font-black uppercase tracking-tighter ${isSyncing ? "text-blue-700 dark:text-blue-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                {isSyncing ? "جاري المزامنة..." : "متصل بالبث المباشر"}
              </span>
            </button>
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

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-transparent relative">
          {showSyncDebug && (
            <div className="absolute top-4 left-4 z-[100] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl text-[10px] font-mono space-y-3 w-72 transition-all animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-1">
                <span className="font-black text-slate-900 dark:text-white text-xs">تشخيص المزامنة اللحظية</span>
                <button onClick={() => setShowSyncDebug(false)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <p className="flex justify-between"><span>الحالة:</span> <span className="text-emerald-500 font-bold">متصل (Realtime OK)</span></p>
                <p className="flex justify-between"><span>آخر تحديث:</span> <span className="text-blue-500">{connectionInfo?.lastSyncTime}</span></p>
                <p className="flex justify-between"><span>الطيارين النشطين:</span> <span className="text-blue-500 font-bold">{connectionInfo?.driversOnline}</span></p>
                <p className="flex justify-between"><span>إجمالي المستخدمين:</span> <span className="text-slate-500">{connectionInfo?.usersCount}</span></p>
                <p className="flex justify-between border-t border-slate-50 dark:border-slate-800 pt-2">
                  <span>البيئة:</span> 
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[8px] font-black uppercase text-slate-600 dark:text-slate-400">
                    {typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() ? 'Native App' : 'Web Browser'}
                  </span>
                </p>
              </div>
              <button 
                onClick={handleRefresh}
                className="w-full mt-4 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                تحديث إجباري وتفريغ الذاكرة
              </button>
              <p className="text-[8px] text-slate-400 text-center leading-relaxed">
                * في حال عدم رؤية الطيارين، يرجى الضغط على الزر أعلاه لتجاوز الذاكرة المؤقتة.
              </p>
            </div>
          )}
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
                onRefresh={handleRefresh}
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

            {activeView === "wallets" && (
              <WalletsView 
                users={allUsers} 
                wallets={wallets} 
                onResetUser={handleResetUser}
                onRefresh={fetchProfiles}
              />
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

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
