"use client";

import React, { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Preferences } from "@capacitor/preferences";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { Capacitor } from "@capacitor/core";
import { signOut } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/api/orders";
import { supabase, forceReconnectRealtime } from "@/lib/supabaseClient";
import { dbService } from "@/lib/db-service";
import { requestAIAnalysis } from "@/lib/api/ai";
import { getCache, setCache, startBackgroundTracking, stopBackgroundTracking, stopForegroundTracking, sendLocationBroadcast, cleanupBroadcastChannel, requestBatteryOptimizationExemption } from "@/lib/native-utils";
import { Skeleton, OrderSkeleton } from "@/components/ui/Skeleton";
import AuthGuard from "@/components/AuthGuard";
import Toast from "@/components/Toast";
import { useSync } from "@/hooks/useSync";
import { useToast } from "@/hooks/useToast";
import { aiVoice } from "@/lib/utils/voice";
import AISupportBot from "@/components/AISupportBot";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import type { Order } from "./types";
import DriverHeader from "./components/DriverHeader";
import DriverOrdersView from "./components/DriverOrdersView";
import DriverDrawer from "./components/DriverDrawer";
import DriverWalletView from "./components/DriverWalletView";
import DriverHistoryView from "./components/DriverHistoryView";
import DriverSettingsView from "./components/DriverSettingsView";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import { Wallet, X, Loader2, Settings, Bot, MapPin, Send, Mic, AlertCircle } from "lucide-react";

// --- SKELETON COMPONENTS ---
function DriverStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}

function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function DriverApp() {
  return (
    <GlobalErrorBoundary 
      title="خطأ في واجهة الطيار"
      description="حدث خطأ غير متوقع أثناء عرض واجهة الطيار. تم عزل الخطأ لضمان استقرار التطبيق."
    >
      <AuthGuard allowedRoles={["driver", "admin"]}>
        <DriverPageContent />
      </AuthGuard>
    </GlobalErrorBoundary>
  );
}

function DriverPageContent() {
  const { toasts, removeToast, success: toastSuccess, error: toastError } = useToast();
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  
  // Basic State
  const [driverId, setDriverId] = useState<string | null>(user?.id || null);
  const [driverName, setDriverName] = useState(authProfile?.full_name || user?.user_metadata?.full_name || "كابتن");
  const [isActive, setIsActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number, heading?: number} | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "wallet" | "history" | "settings">("orders");
  const [todayDeliveryFees, setTodayDeliveryFees] = useState(0);
  const [vendorDebt, setVendorDebt] = useState<number>(0);
  const [systemBalance, setSystemBalance] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0); 
  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);
  const [mapMode, setMapMode] = useState(false);
  const [activeDebtOrders, setActiveDebtOrders] = useState<Order[]>([]);
  const [todayHistory, setTodayHistory] = useState<Order[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>("جاري المزامنة...");
  const [isSurgeActive, setIsSurgeActive] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showBatteryAlert, setShowBatteryAlert] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [aiAnalysis, setAIAnalysis] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', content: string}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAISending, setIsAISending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [analyzingOrder, setAnalyzingOrder] = useState<string | null>(null);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [requestingSettlement, setRequestingSettlement] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [settingsData, setSettingsData] = useState({ name: "", phone: "", email: "", password: "" });
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  
  const isRefreshingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const ordersRef = useRef<Order[]>([]);
  const backgroundWatcherRef = useRef<string | null>(null);
  const foregroundWatcherRef = useRef<string | null>(null);

  // ─── CORE FUNCTIONS ───────────────────────────
  
  const mapDBOrderToUI = useCallback((db: any): Order => {
    try {
      if (!db) throw new Error("Null order data");
      
      const distanceValue = Number(db.financials?.distance || db.distance || 0).toFixed(1);
      
      const rawProfiles = db.profiles || db.vendor || db.profile;
      const vendorProfile = (Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles) || {};
      
      const vendorName = vendorProfile.full_name || db.vendor_name || "محل غير معروف";
      const vendorPhone = vendorProfile.phone || db.vendor_phone || "";
      const vendorArea = vendorProfile.area || db.vendor_area || "";
      
      let vendorCoords = vendorProfile.location || db.vendor_location || null;
      if (typeof vendorCoords === 'string') {
        try { vendorCoords = JSON.parse(vendorCoords); } catch { vendorCoords = null; }
      }
      
      let customerCoords = db.customer_details?.coords || (db.customer_details?.lat ? { lat: db.customer_details.lat, lng: db.customer_details.lng } : null);
      if (typeof customerCoords === 'string') {
        try { customerCoords = JSON.parse(customerCoords); } catch { customerCoords = null; }
      }

      const ensureCoords = (c: any) => {
        if (!c || typeof c !== 'object') return null;
        const lat = Number(c.lat || c.latitude || c.y);
        const lng = Number(c.lng || c.longitude || c.x);
        if (isNaN(lat) || isNaN(lng)) return null;
        return { lat, lng };
      };

      const finalVendorCoords = ensureCoords(vendorCoords);
      const finalCustomerCoords = ensureCoords(customerCoords);

      return {
        id: db.id || String(Math.random()),
        vendor: vendorName,
        vendorId: db.vendor_id || "",
        driverId: db.driver_id || "",
        vendorPhone: vendorPhone,
        vendorArea: vendorArea,
        customer: db.customer_details?.name || "عميل غير معروف",
        customerPhone: db.customer_details?.phone || "",
        address: db.customer_details?.address || "عنوان غير محدد",
        distanceValue: Number(distanceValue),
        distance: `${distanceValue} كم`,
        fee: `${db.financials?.delivery_fee || 0} ج.م`,
        status: db.status || "pending",
        coords: finalVendorCoords,
        vendorCoords: finalVendorCoords,
        customerCoords: finalCustomerCoords,
        prepTime: String(db.financials?.prep_time || "15"),
        isPickedUp: db.status === 'in_transit' || db.status === 'delivered',
        priority: db.status === 'in_transit' ? 1 : (db.status === 'assigned' ? 2 : (db.status === 'pending' ? 3 : 4)),
        statusUpdatedAt: db.status_updated_at || db.created_at || undefined,
        vendorCollectedAt: db.vendor_collected_at,
        driverConfirmedAt: db.driver_confirmed_at,
        orderValue: Number(db.financials?.order_value) || 0,
        customers: (db.customer_details?.customers || []).filter((c: any) => c && typeof c === 'object'),
        financials: {
          order_value: Number(db.financials?.order_value) || 0,
          delivery_fee: Number(db.financials?.delivery_fee) || 0,
          system_commission: Number(db.financials?.system_commission) || 0,
          vendor_commission: Number(db.financials?.vendor_commission) || 0,
          driver_earnings: Number(db.financials?.driver_earnings) || 0,
          insurance_fee: Number(db.financials?.insurance_fee || db.financials?.driver_insurance) || 0,
          prep_time: String(db.financials?.prep_time || "15"),
        },
      };
    } catch (e) {
      console.error("mapDBOrderToUI failed for order:", db?.id, e);
      return { id: db?.id || "error", status: "pending" } as Order;
    }
  }, []);

  const fetchOrders = useCallback(async (explicitDriverId?: string) => {
    const activeDriverId = explicitDriverId ?? driverId;
    try {
      const { fetchOrders: fetchUnifiedOrders } = await import("@/lib/api/orders");
      const [pending, active, completedToday] = await Promise.all([
        fetchUnifiedOrders({ role: 'driver', status: ['pending'] }),
        activeDriverId ? fetchUnifiedOrders({ role: 'driver', userId: activeDriverId, status: ['assigned', 'in_transit'] }) : Promise.resolve([]),
        activeDriverId ? supabase.from('orders').select('*, vendor:vendor_id(*)').eq('driver_id', activeDriverId).in('status', ['delivered', 'cancelled']).gte('status_updated_at', new Date(new Date().setHours(0,0,0,0)).toISOString()).then(r => r.data || []) : Promise.resolve([]),
      ]);
      
      const seen = new Set<string>();
      const merged = [...(active || []), ...(pending || []), ...(completedToday || [])].filter((o) => {
        if (!o || seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });
      
      const uiOrders = merged.map(mapDBOrderToUI).filter(o => o.id !== 'error');
      setOrders(uiOrders);
      setCache('driver_orders', uiOrders);
      return uiOrders;
    } catch (err) {
      console.error("fetchOrders error:", err);
      return [];
    }
  }, [driverId, mapDBOrderToUI]);

  const fetchStats = useCallback(async (currentDriverId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 1. Fetch wallet data for overall balance and system balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance, debt, system_balance')
        .eq('user_id', currentDriverId)
        .single();

      // 2. Fetch today's orders for daily stats
      const { data, error } = await supabase
        .from('orders')
        .select('financials, status, vendor_collected_at, driver_confirmed_at')
        .eq('driver_id', currentDriverId)
        .gte('status_updated_at', today.toISOString());

      if (error) throw error;

      let earnings = 0;
      let fees = 0;
      let debt = 0;
      let sysBalance = walletData?.system_balance || 0; // Use wallet value as base

      data?.forEach(order => {
        if (order.status === 'delivered') {
          earnings += Number(order.financials?.driver_earnings || 0);
          fees += Number(order.financials?.delivery_fee || 0);
        }
        // Today's debt (orders not yet collected by vendor)
        if (!order.vendor_collected_at && (order.status === 'assigned' || order.status === 'in_transit' || order.status === 'delivered')) {
          debt += Number(order.financials?.order_value || 0);
        }
      });

      setBalance(walletData?.balance || earnings); // Prefer total wallet balance
      setTodayDeliveryFees(fees);
      setVendorDebt(walletData?.debt || debt); // Prefer total wallet debt
      setSystemBalance(sysBalance);
      setCache('driver_wallet', { 
        balance: walletData?.balance || earnings, 
        debt: walletData?.debt || debt, 
        system_balance: sysBalance 
      });
    } catch (err) {
      console.error("fetchStats error:", err);
    }
  }, []);

  const fetchActiveDebtOrders = useCallback(async (currentDriverId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, vendor:vendor_id(full_name, phone, location, area)')
        .eq('driver_id', currentDriverId)
        .in('status', ['assigned', 'in_transit', 'delivered']) 
        .is('vendor_collected_at', null) 
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        const mapped = (data || []).map(mapDBOrderToUI).filter(o => o.id !== 'error');
        setActiveDebtOrders(mapped as any);
        setCache('driver_active_debt_orders', mapped);
      }
    } catch (err) {
      console.error("fetchActiveDebtOrders error:", err);
    }
  }, [mapDBOrderToUI]);

  const fetchTodayHistory = useCallback(async (currentDriverId: string) => {
    try {
      const { data, error } = await supabase.from('orders')
        .select('*, vendor:vendor_id(full_name, phone, location, area)')
        .eq('driver_id', currentDriverId)
        .in('status', ['delivered', 'cancelled'])
        .order('status_updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      if (data) {
        const mapped = (data as any[]).map(mapDBOrderToUI);
        setTodayHistory(mapped as any);
        setCache('driver_today_history', mapped);
      }
    } catch (err) {
      console.error("DriverPage: fetchHistory failed", err);
    }
  }, [mapDBOrderToUI]);

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

  const manualSync = useCallback(async (payload?: any) => {
    if (!driverId || isRefreshingRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(async () => {
      if (!driverId || isRefreshingRef.current) return;
      if (payload?.source === 'broadcast' && payload?.new?.id === driverId) return;

      isRefreshingRef.current = true;
      setIsRefreshing(true);

      const safetyTimeout = setTimeout(() => {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }, 8000);

      try {
        await Promise.allSettled([
          withTimeout('sync.fetchOrders', fetchOrders(driverId), 5000),
          withTimeout('sync.fetchStats', fetchStats(driverId), 5000)
        ]);
        console.log("[DriverPage] Sync completed");
      } finally {
        clearTimeout(safetyTimeout);
        isRefreshingRef.current = false;
        setIsRefreshing(false);
        syncTimeoutRef.current = null;
      }
    }, 150);
  }, [driverId, fetchOrders, fetchStats]);

  const memoizedUserId = useMemo(() => driverId || undefined, [driverId]);

  const { lastSync, networkHealth } = useSync(memoizedUserId, (payload) => {
    if (!driverId) return;

    console.log("[DriverSync] Global sync update received:", payload?.source);

    if (payload?.source === 'app_resume_start' || payload?.source === 'app_resume_complete' || payload?.source === 'visibility_change') {
      isRefreshingRef.current = false;
      if (payload?.source === 'app_resume_start') {
        setIsRefreshing(true);
      } else {
        setIsRefreshing(false);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    }

    if (payload?.payload?.type === 'system_alert') {
      toastSuccess(payload.payload.message);
      return;
    }

    try {
      if (payload?.order) {
        console.log("[DriverSync] Partial update received for order:", payload.order.id);
        const mappedOrder = mapDBOrderToUI(payload.order);
        setOrders(prev => {
          const index = prev.findIndex(o => o.id === mappedOrder.id);
          if (index > -1) {
            if (JSON.stringify(prev[index]) === JSON.stringify(mappedOrder)) return prev;
            const newOrders = [...prev];
            newOrders[index] = { ...newOrders[index], ...mappedOrder };
            return newOrders;
          } else if (mappedOrder.status === 'pending' || mappedOrder.driverId === driverId) {
            return [mappedOrder, ...prev];
          }
          return prev;
        });

        if (Capacitor.isNativePlatform()) {
          dbService.saveOrder(payload.order).catch(() => {});
        }
        return; 
      }
    } catch (e) {
      console.error("[DriverSync] Partial update processing failed", e);
    }

    if (payload?.table === 'profiles' && (payload?.new?.is_online !== undefined)) {
      return;
    }

    if (!isRefreshingRef.current) {
      const isSilentSync = payload?.source === 'initial_subscribe' || payload?.source === 'wakeup_sync';
      if (isSilentSync) {
        Promise.allSettled([fetchOrders(driverId), fetchStats(driverId)]).catch(() => {});
      } else {
        manualSync(payload);
      }
    }
  }, 'driver');

  useEffect(() => {
    if (lastSync) {
      const date = new Date(lastSync);
      setLastSyncTime(date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [lastSync]);

  useEffect(() => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    if (lastOrderCount !== null && pendingOrders.length > lastOrderCount && isActive) {
      const newestOrder = pendingOrders[0];
      if (newestOrder) {
        console.log("AIVoice: Announcing new order", newestOrder.id);
        aiVoice.announceNewOrder(newestOrder.id, newestOrder.vendorArea);
        
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
          audio.play().catch(e => console.warn("Audio play failed", e));
          if (Capacitor.isNativePlatform()) {
            Haptics.notification({ type: NotificationType.Success }).catch(() => {});
            setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 500);
          }
        } catch (e) {}
      }
    }
    setLastOrderCount(orders.length);
  }, [orders, isActive, lastOrderCount]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (showDrawer) {
      document.body.classList.add('scroll-lock');
    } else {
      document.body.classList.remove('scroll-lock');
    }
    return () => document.body.classList.remove('scroll-lock');
  }, [showDrawer]);

  useEffect(() => {
    if (!driverId || orders.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      orders.forEach(async (order) => {
        if (order.status === 'assigned' && order.statusUpdatedAt) {
          const acceptedTime = new Date(order.statusUpdatedAt);
          const diffMs = now.getTime() - acceptedTime.getTime();
          const diffMins = diffMs / (1000 * 60);

          if (diffMins >= 15) {
            await supabase.from('orders').update({ 
              driver_id: null, 
              status: 'pending',
              status_updated_at: new Date().toISOString() 
            }).eq('id', order.id);
            
            setOrders(prev => prev.filter(o => o.id !== order.id));
            toastSuccess(`تم سحب الطلب #${order.id.slice(0, 8)} لعدم الاستلام خلال 15 دقيقة`);
          }
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [driverId, orders, toastSuccess]);

  useEffect(() => {
    let isMounted = true;
    
    const startTrackingSequence = async () => {
      if (!isActive || !driverId || !Capacitor.isNativePlatform() || !isMounted) return;

      try {
        if (driverId) {
          await supabase.from('profiles').update({ 
            is_online: true,
            last_location_update: new Date().toISOString()
          }).eq('id', driverId);
        }

        await KeepAwake.keepAwake().catch(err => console.warn("KeepAwake error:", err));
        
        if (!isMounted) return;

        if (!backgroundWatcherRef.current) {
          const bId = await startBackgroundTracking(driverId, driverName, 'driver', (loc) => {
            if (isMounted) setDriverLocation(loc);
          });
          if (isMounted && bId) {
            backgroundWatcherRef.current = bId;
          }
        }

        const heartbeatInterval = setInterval(async () => {
          if (!isMounted || !isActive) return;
          try {
            await supabase.from('profiles').update({
              is_online: true,
              last_location_update: new Date().toISOString()
            }).eq('id', driverId);
          } catch (e) { console.warn("Heartbeat failed", e); }
        }, 2 * 60 * 1000);

        return () => {
          clearInterval(heartbeatInterval);
        };
      } catch (err) {
        console.error("Native Tracking: Fatal sequence error", err);
      }
    };

    const stopTrackingSequence = async () => {
      try {
        await KeepAwake.allowSleep().catch(() => {});
        
        if (backgroundWatcherRef.current) {
          const id = backgroundWatcherRef.current;
          backgroundWatcherRef.current = null;
          await stopBackgroundTracking(id).catch(err => console.error("Stop BG error:", err));
        }
        
        if (foregroundWatcherRef.current) {
          const id = foregroundWatcherRef.current;
          foregroundWatcherRef.current = null;
          await stopForegroundTracking(id).catch(err => console.error("Stop FG error:", err));
        }

        await cleanupBroadcastChannel().catch(() => {});
      } catch (err) {
        console.error("Native Tracking: Stop error", err);
      }
    };

    if (isActive) {
      startTrackingSequence();
    } else {
      stopTrackingSequence();
    }

    return () => {
      isMounted = false;
      stopTrackingSequence();
    };
  }, [isActive, driverId, driverName]);

  useEffect(() => {
    const restoreState = async () => {
      let savedActive = null;
      let savedAuto = null;
      if (Capacitor.isNativePlatform()) {
        const [{ value: activeVal }, { value: autoVal }] = await Promise.all([
          Preferences.get({ key: 'driver_is_active' }),
          Preferences.get({ key: 'driver_auto_accept' })
        ]);
        savedActive = activeVal;
        savedAuto = autoVal;
      } else {
        savedActive = localStorage.getItem("driver_is_active");
        savedAuto = localStorage.getItem("driver_auto_accept");
      }
      if (savedActive !== null) setIsActive(savedActive === "true");
      if (savedAuto !== null) setAutoAccept(savedAuto === "true");
    };
    restoreState();

    const isCapacitor = Capacitor.isNativePlatform();
    const fallbackMs = isCapacitor ? 15000 : 5000;
    const hardFallback = setTimeout(() => {
      if (isCapacitor) {
        (window as any).Capacitor?.SplashScreen?.hide?.();
      }
      setLoading(false);
    }, fallbackMs);

    const setup = async () => {
      if (authLoading || !user) {
        if (!authLoading && !user) setLoading(false);
        return;
      }
      
      const currentDriverId = user.id;
      
      // V19.7.0: Set driverId and Name immediately
      setDriverId(currentDriverId);
      setDriverName(authProfile?.full_name || user.user_metadata?.full_name || "كابتن سكة");
      setSettingsData({
        name: authProfile?.full_name || user.user_metadata?.full_name || "",
        phone: authProfile?.phone || user.user_metadata?.phone || "",
        email: user.email || "",
        password: ""
      });

      try {
        // Load cached data for instant UI
        const [cachedOrders, cachedStats, cachedDebt, cachedHistory] = await Promise.all([
          getCache<Order[]>('driver_orders'),
          getCache<any>('driver_wallet'),
          getCache<Order[]>('driver_active_debt_orders'),
          getCache<Order[]>('driver_today_history')
        ]);
        
        if (cachedOrders) setOrders(cachedOrders);
        if (cachedDebt) setActiveDebtOrders(cachedDebt);
        if (cachedHistory) setTodayHistory(cachedHistory);
        if (cachedStats) {
          setVendorDebt(cachedStats.debt || 0);
          setBalance(cachedStats.balance || 0);
          setSystemBalance(cachedStats.system_balance || 0);
        }

        // Fresh fetch
        await Promise.allSettled([
          fetchOrders(currentDriverId),
          fetchStats(currentDriverId),
          fetchActiveDebtOrders(currentDriverId),
          fetchTodayHistory(currentDriverId)
        ]);
      } catch (e) {
        console.error("Driver initialization failed", e);
      } finally {
        setLoading(false);
      }
    };

    setup();
    return () => clearTimeout(hardFallback);
  }, [user?.id, authLoading]); // V19.7.0: Stable dependencies to prevent re-init loops

  useEffect(() => {
    if (!navigator.geolocation || !driverId || !isActive || Capacitor.isNativePlatform()) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastLocationUpdate < 2000) return;
        
        const newLocation = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0,
          accuracy: position.coords.accuracy || 0
        };
        setDriverLocation(newLocation);
        setLastLocationUpdate(now);

        sendLocationBroadcast(driverId, newLocation, driverName);

        try {
          if (isNaN(newLocation.lat) || isNaN(newLocation.lng)) return;

          const patchData = { 
            location: { ...newLocation, ts: now },
            is_online: true,
            last_location_update: new Date().toISOString()
          };

          await supabase.from('profiles').update(patchData).eq('id', driverId);
        } catch (e) {
          console.error("Location sync error:", e);
        }
      },
      (error) => console.warn("Geolocation watch error:", error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverId, isActive, lastLocationUpdate, driverName]);

  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      import("@capacitor/network").then(({ Network }) => {
        Network.getStatus().then(status => setIsOnline(status.connected));
        Network.addListener('networkStatusChange', status => setIsOnline(status.connected));
      });
    } else if (typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(async () => {
        if (!autoAccept || !driverId) return;
        
        try {
          const currentCustomersCount = ordersRef.current
            .filter(o => o.status === 'assigned' || o.status === 'in_transit')
            .reduce((acc, o) => acc + (Array.isArray(o.customers) ? o.customers.length : 1), 0);

          if (currentCustomersCount >= 3) return;

          const availableOrders = ordersRef.current.filter(o => o.status === 'pending' && !o.driverId);
          
          if (availableOrders.length > 0) {
            const firstOrder = availableOrders[0];
            const orderCustomers = Array.isArray(firstOrder.customers) ? firstOrder.customers.length : 1;
            if (currentCustomersCount + orderCustomers > 3) return;

            const { error } = await updateOrderStatus(firstOrder.id, 'assigned', driverId);
            if (!error) {
              toastSuccess('تم القبول التلقائي للطلب #' + firstOrder.id.slice(0,8));
              manualSync({ source: 'auto_accept' });
            }
          }
        } catch (err) {
          console.warn("Auto-accept poll failed", err);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isActive, autoAccept, driverId, toastSuccess, manualSync]);

  const toggleActive = async () => {
    if (actionLoading) return;
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
      
      const newStatus = !isActive;
      setActionLoading(true);
      setIsActive(newStatus);
      
      if (newStatus) {
        setMapMode(true);
        manualSync();
        forceReconnectRealtime().catch(() => {});
      }
      
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'driver_is_active', value: newStatus.toString() }).catch(() => {});
      } else {
        localStorage.setItem("driver_is_active", newStatus.toString());
      }
      
      if (driverId) {
        supabase.from('profiles').update({ 
          is_online: newStatus,
          updated_at: new Date().toISOString()
        }).eq('id', driverId).then(({ error }) => {
          if (error) console.warn("Online toggle: DB update failed", error);
        });
      }
      
      setTimeout(() => setActionLoading(false), 300);
    } catch (err) {
      console.error("Online toggle: Fatal error", err);
      setIsActive(!isActive);
      setActionLoading(false);
      toastError("حدث خطأ أثناء تبديل الحالة");
    }
  };

  const toggleAutoAccept = async () => {
    const newAuto = !autoAccept;
    if (newAuto) {
      const currentCustomersCount = orders
        .filter(o => o.status === 'assigned' || o.status === 'in_transit')
        .reduce((acc, o) => acc + (Array.isArray(o.customers) ? o.customers.length : 1), 0);
      
      if (currentCustomersCount >= 3) {
        toastError("لا يمكنك تفعيل القبول التلقائي لأنك وصلت للحد الأقصى (3 عملاء).");
        return;
      }
      fetchOrders();
    }

    setAutoAccept(newAuto);
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key: 'driver_auto_accept', value: newAuto.toString() }).catch(() => {});
    } else {
      localStorage.setItem('driver_auto_accept', newAuto.toString());
    }
    
    if (driverId) {
      supabase.from('profiles').update({ auto_accept: newAuto }).eq('id', driverId).catch(() => {});
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!driverId || actionLoading) return;
    setActionLoading(true);
    
    const currentCustomersCount = orders
      .filter(o => o.status === 'assigned' || o.status === 'in_transit')
      .reduce((acc, o) => acc + (Array.isArray(o.customers) ? o.customers.length : 1), 0);

    if (currentCustomersCount >= 3) {
      toastError("لقد وصلت للحد الأقصى من العملاء (3). يرجى توصيل الطلبات الحالية أولاً.");
      setActionLoading(false);
      return;
    }

    const originalOrders = [...orders];
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: 'assigned', priority: 2, driver_id: driverId } : o);
    setOrders(updatedOrders);

    try {
      const { error: dbError } = await updateOrderStatus(orderId, 'assigned', driverId);
      if (dbError) throw dbError;
      toastSuccess("تم قبول الطلب بنجاح! توجه للمحل للاستلام.");
      void Promise.allSettled([fetchOrders(driverId), fetchStats(driverId)]);
    } catch (err: any) {
      setOrders(originalOrders);
      toastError(err.message || "فشل قبول الطلب. حاول مرة أخرى.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickupOrder = async (orderId: string) => {
    if (!driverId || actionLoading) return;
    setActionLoading(true);

    const originalOrders = [...orders];
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'in_transit', isPickedUp: true, priority: 1 } : o));

    try {
      const { error: dbError } = await supabase.rpc('handle_order_pickup', {
        p_order_id: orderId,
        p_driver_id: driverId
      });
      if (dbError) throw dbError;
      toastSuccess("تم استلام الطلب وتسجيله مالياً! في الطريق...");
      void Promise.allSettled([fetchOrders(driverId), fetchStats(driverId), fetchActiveDebtOrders(driverId)]);
    } catch (err: any) {
      setOrders(originalOrders);
      toastError(err.message || "فشل تحديث الحالة. حاول مرة أخرى.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    if (!driverId || actionLoading) return;
    setActionLoading(true);

    const originalOrders = [...orders];
    setOrders(orders.filter(o => o.id !== orderId));

    try {
      const { error: dbError } = await supabase.rpc('complete_order_driver', {
        p_order_id: orderId,
        p_driver_id: driverId
      });
      if (dbError) throw dbError;
      toastSuccess("تم التوصيل بنجاح! مبروك...");
      void Promise.allSettled([fetchOrders(driverId), fetchStats(driverId), fetchActiveDebtOrders(driverId), fetchTodayHistory(driverId)]);
    } catch (err: any) {
      setOrders(originalOrders);
      toastError(err.message || "فشل إتمام الطلب. حاول مرة أخرى.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverCustomer = async (orderId: string, customerIndex: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !order.customers || actionLoading) return;
    setActionLoading(true);

    const newCustomers = [...order.customers];
    newCustomers[customerIndex] = { ...newCustomers[customerIndex], status: 'delivered', deliveredAt: new Date().toISOString() };

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, customers: newCustomers } : o));

    try {
      const { data: freshOrder, error: fetchError } = await supabase.from('orders').select('customer_details').eq('id', orderId).single();
      if (fetchError) throw fetchError;
      if (!freshOrder) throw new Error("لم يتم العثور على الطلب");

      const currentDetails = freshOrder.customer_details || {};
      const dbCustomers = currentDetails.customers || [];
      
      if (!dbCustomers || dbCustomers.length === 0) {
        throw new Error("لا يوجد تفاصيل عملاء لهذا الطلب لتحديثها");
      }

      if (customerIndex < 0 || customerIndex >= dbCustomers.length) {
        throw new Error("رقم العميل غير صحيح");
      }

      const updatedCustomers = [...dbCustomers];
      updatedCustomers[customerIndex] = { 
        ...updatedCustomers[customerIndex], 
        status: 'delivered', 
        deliveredAt: new Date().toISOString() 
      };

      const updatedDetails = { ...currentDetails, customers: updatedCustomers };
      const { error } = await supabase.from('orders').update({ customer_details: updatedDetails }).eq('id', orderId);
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, customers: updatedCustomers } : o));
      toastSuccess(`تم تسليم العميل ${updatedCustomers[customerIndex]?.name || "المختار"} بنجاح`);
    } catch (err: any) {
      console.error("handleDeliverCustomer error:", err);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, customers: order.customers } : o));
      toastError("فشل تحديث حالة العميل: " + (err.message || "خطأ غير معروف"));
      throw err; // Re-throw to let the UI know it failed
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    try {
      const { error } = await supabase.rpc('confirm_driver_payment', { p_order_id: orderId, p_driver_id: driverId });
      if (error) throw error;
      toastSuccess("تم تأكيد تسليم المبلغ للمحل بنجاح");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, driverConfirmedAt: new Date().toISOString() } : o));
      void fetchActiveDebtOrders(driverId!);
      void fetchStats(driverId!);
    } catch (err: any) {
      toastError(err.message || "فشل تأكيد تسليم المبلغ");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleRequestSettlement = async () => {
    if (!driverId || !settlementAmount) return toastError("الرجاء إدخال المبلغ المراد سداده");
    setRequestingSettlement(true);
    try {
      const { error: dbError } = await supabase.from('settlements').insert([{ 
        user_id: driverId, 
        amount: Number(settlementAmount), 
        status: 'pending', 
        method: 'Vodafone Cash' 
      }]);
      if (dbError) throw dbError;
      toastSuccess("تم إرسال طلب سداد المديونية بنجاح. سيتم التأكيد قريباً.");
      setShowSettlementModal(false);
      setSettlementAmount("");
      fetchStats(driverId);
    } catch (err: any) {
      toastError(`حدث خطأ أثناء إرسال الطلب: ${err.message || "حاول مرة أخرى"}`);
    } finally {
      setRequestingSettlement(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: settingsData.name, phone: settingsData.phone }).eq('id', user.id);
      if (error) throw error;
      setDriverName(settingsData.name);
      toastSuccess("تم تحديث البيانات بنجاح");
    } catch (err: any) {
      toastError("فشل تحديث البيانات: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestAIHelp = async (order: Order) => {
    try {
      setAnalyzingOrder(order.id);
      setShowAIHelper(true);
      setAIAnalysis(null);
      const res = await requestAIAnalysis('location_help', order, 'driver');
      setAIAnalysis(res);
    } catch (e) {
      setAIAnalysis({ content: "عذراً، لم أتمكن من تحليل العنوان حالياً. حاول مجدداً." });
    } finally {
      setAnalyzingOrder(null);
    }
  };

  const handleSendAIChat = async (text?: string) => {
    const msg = text || chatInput;
    if (!msg.trim() || isAISending) return;
    const userMsg = msg.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsAISending(true);
    try {
      const res = await requestAIAnalysis('chat', { message: userMsg, orderContext: orders.length > 0 ? orders[0] : null }, 'driver');
      if (res.analysis) {
        setChatMessages(prev => [...prev, { role: 'ai', content: res.analysis.content }]);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(res.analysis.content);
          utterance.lang = 'ar-SA';
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', content: "عذراً، واجهت مشكلة في الرد. حاول مرة أخرى." }]);
    } finally {
      setIsAISending(false);
    }
  };

  const startVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toastError("المتصفح لا يدعم التعرف على الصوت");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => { setIsListening(true); try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {} };
      recognition.onresult = (event: any) => handleSendAIChat(event.results[0][0].transcript);
      recognition.onerror = () => { setIsListening(false); toastError("فشل التعرف على الصوت"); };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (e) { setIsListening(false); }
  };

  const dismissBatteryAlert = async () => {
    setShowBatteryAlert(false);
    await Preferences.set({ key: 'battery_alert_dismissed', value: 'true' });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-slate-950 p-6 space-y-8" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <DriverStatsSkeleton />
      <div className="space-y-6">
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-10 flex-1 rounded-2xl" />
          <Skeleton className="h-10 flex-1 rounded-2xl" />
          <Skeleton className="h-10 flex-1 rounded-2xl" />
        </div>
        <ListSkeleton count={3} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 relative font-sans" dir="rtl">
      <Toast toasts={toasts} onRemove={removeToast} />
      
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500 text-white text-[10px] font-black py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-[100]"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            أنت الآن خارج التغطية - يتم عرض البيانات المخزنة محلياً
          </motion.div>
        )}
        {showBatteryAlert && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500 text-white p-3 px-4 flex flex-col gap-2 sticky top-0 z-[100] border-b border-amber-400/50 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 animate-spin-slow" />
                <p className="text-[10px] font-black leading-tight">
                  لضمان استمرار التتبع في الخلفية: يرجى تعطيل &quot;تحسين البطارية&quot; لتطبيق ستارت من إعدادات الهاتف.
                </p>
              </div>
              <button onClick={dismissBatteryAlert} className="bg-white/20 p-1.5 rounded-lg">
                <X className="w-3 h-3" />
              </button>
            </div>
            <button 
              onClick={() => {
                try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
                requestBatteryOptimizationExemption();
              }}
              className="w-full bg-white text-amber-600 py-2 rounded-xl text-[10px] font-black shadow-inner active:scale-95 transition-all"
            >
              فتح الإعدادات الآن لإصلاح المشكلة
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 dark:bg-blue-600/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 dark:bg-emerald-600/5 blur-[120px] animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col min-h-full">
        <DriverHeader
          driverName={driverName}
          lastSyncTime={lastSyncTime}
          isRefreshing={isRefreshing}
          isActive={isActive}
          isSurgeActive={isSurgeActive}
          networkHealth={networkHealth}
          onOpenDrawer={() => {
            try { Haptics.selectionChanged(); } catch(e) {}
            setShowDrawer(true);
          }}
          onToggleActive={toggleActive}
          onSync={manualSync}
          autoAccept={autoAccept}
          onToggleAutoAccept={toggleAutoAccept}
          activeView={activeTab}
          onOpenAIHelp={() => {
            setShowAIHelper(true);
            setAIAnalysis(null);
          }}
        />

        <main className="flex-1 relative overflow-y-auto">
          <AISupportBot role="driver" context={{ orders: orders.slice(0, 5), profile: authProfile }} />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Suspense fallback={<div className="p-4 space-y-4"><OrderSkeleton /><OrderSkeleton /></div>}>
                {activeTab === "orders" ? (
                  <DriverOrdersView
                    todayDeliveryFees={todayDeliveryFees}
                    vendorDebt={vendorDebt}
                    isActive={isActive}
                    driverLocation={driverLocation}
                    driverId={driverId}
                    orders={orders}
                    autoAccept={autoAccept}
                    onToggleAutoAccept={toggleAutoAccept}
                    onAcceptOrder={handleAcceptOrder}
                    onPickupOrder={handlePickupOrder}
                    onDeliverOrder={handleDeliverOrder}
                    onConfirmPayment={handleConfirmPayment}
                    onDeliverCustomer={handleDeliverCustomer}
                    onPreviewImage={setPreviewUrl}
                    mapMode={mapMode}
                    onToggleMapMode={() => setMapMode(!mapMode)}
                  />
                ) : activeTab === "wallet" ? (
                  <div className="p-4 md:p-6 space-y-6">
                    <DriverWalletView
                      todayDeliveryFees={todayDeliveryFees}
                      vendorDebt={vendorDebt}
                      systemBalance={systemBalance}
                      overallBalance={balance}
                      deliveredOrders={activeDebtOrders}
                      allHistory={todayHistory}
                      settlementHistory={settlementHistory}
                      onConfirmPayment={handleConfirmPayment}
                      onOpenSettlementModal={() => setShowSettlementModal(true)}
                    />
                  </div>
                ) : activeTab === "history" ? (
                  <div className="p-4 md:p-6 pb-24">
                    <DriverHistoryView history={todayHistory} onPreviewImage={setPreviewUrl} />
                  </div>
                ) : activeTab === "settings" ? (
                  <div className="p-4 md:p-6 space-y-6">
                    <DriverSettingsView
                      settingsData={settingsData}
                      savingSettings={actionLoading}
                      onBack={() => setActiveTab("orders")}
                      onSettingsDataChange={setSettingsData}
                      onSave={handleUpdateProfile}
                    />
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">جاري المزامنة...</p>
                  </div>
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <DriverDrawer
        showDrawer={showDrawer}
        onClose={() => setShowDrawer(false)}
        onSelectOrders={() => { setActiveTab("orders"); setShowDrawer(false); }}
        onSelectWallet={() => { setActiveTab("wallet"); setShowDrawer(false); }}
        onSelectHistory={() => { setActiveTab("history"); setShowDrawer(false); }}
        onSelectSettings={() => { setActiveTab("settings"); setShowDrawer(false); }}
        onSignOut={handleSignOut}
        onOpenAI={() => {
          if (orders.length > 0) handleRequestAIHelp(orders[0]);
          else { setShowAIHelper(true); setAIAnalysis(null); }
        }}
        driverName={driverName}
        activeView={activeTab}
      />

      <ImagePreviewModal url={previewUrl} show={!!previewUrl} onClose={() => setPreviewUrl(null)} />

      <AnimatePresence>
        {showAIHelper && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAIHelper(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-0 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-purple-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
                  <div>
                    <h3 className="text-lg font-black leading-tight">مساعد الملاحة الذكي</h3>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">AI Co-pilot Chat</p>
                  </div>
                </div>
                <button onClick={() => setShowAIHelper(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px] bg-slate-50 dark:bg-slate-950">
                {aiAnalysis && (
                  <div className="flex flex-col gap-2">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-2xl rounded-tr-none self-start max-w-[85%]">
                      <p className="text-xs font-bold text-purple-900 dark:text-purple-300 leading-relaxed text-right">{aiAnalysis.content}</p>
                    </div>
                    {aiAnalysis.ai_meta?.navigation_tips && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-2 max-w-[85%] self-start">
                        <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" /><p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-relaxed">{aiAnalysis.ai_meta.navigation_tips}</p>
                      </div>
                    )}
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, x: msg.role === 'user' ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} >
                    <div className={`p-4 rounded-2xl max-w-[85%] text-xs font-bold leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tl-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tr-none'}`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isAISending && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tr-none border border-slate-100 dark:border-slate-700 shadow-sm flex gap-1">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" /><span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button onClick={startVoiceInput} disabled={isAISending} className={`p-4 rounded-2xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}><Mic className="w-5 h-5" /></button>
                  <div className="flex-1 relative">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendAIChat()} placeholder="اسألني أي شيء..." disabled={isAISending} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 pr-4 pl-12 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 ring-purple-500/50 transition-all" />
                    <button onClick={() => handleSendAIChat()} disabled={!chatInput.trim() || isAISending} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-xl disabled:opacity-50 disabled:grayscale transition-all" >{isAISending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettlementModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettlementModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl overflow-hidden" >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500"><Wallet className="w-6 h-6" /></div>
                  <div><h3 className="text-xl font-black text-slate-900">تأكيد سداد مديونية</h3><p className="text-xs font-bold text-slate-400">إرسال طلب تأكيد سداد للشركة</p></div>
                </div>
                <button onClick={() => setShowSettlementModal(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">المبلغ المسدد (ج.م)</label>
                  <input type="number" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent border-none outline-none text-3xl font-black text-slate-900 placeholder:text-slate-200" />
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-blue-700 leading-relaxed">يرجى إدخال المبلغ الذي قمت بتحويله للشركة فعلياً. سيقوم المسؤول بمراجعة الطلب وتأكيده لتصفير مديونيتك.</p>
                </div>
                <button onClick={handleRequestSettlement} disabled={requestingSettlement || !settlementAmount} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3" >
                  {requestingSettlement ? <Loader2 className="w-6 h-6 animate-spin" /> : "إرسال طلب التأكيد"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
