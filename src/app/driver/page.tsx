"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { getCurrentUser, getUserProfile, signOut } from "@/lib/auth";
import { getAvailableOrders, getDriverActiveOrders, updateOrderStatus } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { AppLoader } from "@/components/AppLoader";
import { CardSkeleton, OrderSkeleton } from "@/components/ui/Skeleton";
import AuthGuard from "@/components/AuthGuard";
import Toast from "@/components/Toast";
import { useSync } from "@/hooks/useSync";
import { useToast } from "@/hooks/useToast";
import type { Order, DBDriverOrder } from "./types";
import DriverHeader from "./components/DriverHeader";
import DriverOperationsHub from "./components/DriverOperationsHub";
import DriverDrawer from "./components/DriverDrawer";
import DriverWalletView from "./components/DriverWalletView";

export default function DriverApp() {
  const { toasts, removeToast, success: toastSuccess } = useToast();
  
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  
  // Basic State
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("كابتن");
  const [isActive, setIsActive] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "wallet">("orders");
  const [todayDeliveryFees, setTodayDeliveryFees] = useState(0);
const [vendorDebt, setVendorDebt] = useState(0);
  const [autoAccept, setAutoAccept] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [isRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [deliveredOrders, setDeliveredOrders] = useState<DBDriverOrder[]>([]);
  const [todayHistory, setTodayHistory] = useState<DBDriverOrder[]>([]);
  const [isSurgeActive, setIsSurgeActive] = useState(false);

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
    if (typeof window !== "undefined") {
      const savedActive = localStorage.getItem("driver_is_active");
      if (savedActive !== null) setIsActive(savedActive === "true");
    }

    // Mobile-optimized fallback: Detect Capacitor, extend timeout
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
    const fallbackMs = isCapacitor ? 15000 : 5000; // 15s mobile, 5s web
    const hardFallback = setTimeout(() => {
      console.log(`DriverPage: Hard fallback triggered (${fallbackMs/1000}s, Capacitor: ${isCapacitor})`);
      
      // Auto-hide splashscreen on mobile
      if (isCapacitor) {
        (window as any).Capacitor?.SplashScreen?.hide?.();
      }
      
      setLoading(false);
    }, fallbackMs);

    const setup = async () => {
      if (authLoading) return; // Wait for AuthProvider

      // Prevent redundant setup if we already have the driverId set
      if (driverId === (user?.id || null) && driverName !== "كابتن") {
        return;
      }

      try {
        // Use user and profile from AuthProvider if available
        if (user && authProfile) {
          if (driverId !== user.id || driverName !== (authProfile.full_name || "كابتن")) {
            console.log("DriverPage: Using profile from AuthProvider");
            setDriverId(user.id);
            setDriverName(authProfile.full_name || "كابتن");
            
            void Promise.allSettled([
              withTimeout('fetchOrders', fetchOrders(), 10000),
              withTimeout('fetchStats', fetchStats(user.id), 10000),
              withTimeout('fetchDelivered', fetchDeliveredOrders(user.id), 10000),
              withTimeout('fetchHistory', fetchTodayHistory(user.id), 10000),
            ]);
          }
          setLoading(false);
          return;
        }

        // Only if AuthProvider failed or didn't provide data
        console.log("DriverPage: Falling back to manual fetch");
        const currentUser = await withTimeout('getCurrentUser', getCurrentUser(), isCapacitor ? 10000 : 5000);
        if (currentUser) {
          const profile = await withTimeout('getUserProfile', getUserProfile(currentUser.id, currentUser.email), isCapacitor ? 10000 : 5000);
          if (profile) {
            setDriverId(currentUser.id);
            setDriverName(profile.full_name || "كابتن");
            void Promise.allSettled([
              withTimeout('fetchOrders', fetchOrders(), 10000),
              withTimeout('fetchStats', fetchStats(currentUser.id), 10000)
            ]);
          }
        }
      } catch (e) {
        console.error("DriverPage: Setup error", e);
      } finally {
        clearTimeout(hardFallback);
        setLoading(false);
      }
    };

    setup();
    return () => clearTimeout(hardFallback);
  }, [user, authProfile, authLoading]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation || !driverId || !isActive) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setDriverLocation(newLocation);

        await supabase.from('profiles').update({ 
          location: newLocation,
          is_online: true,
          last_location_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', driverId);
      },
      (error) => {
        if (error.code === 1) {
          setIsActive(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverId, isActive]);

  async function fetchStats(currentDriverId: string) {
    setLastSyncTime(new Date());
    try {
      const { data: walletData } = await supabase.from('wallets').select('debt, system_balance').eq('user_id', currentDriverId).single();
      const { data: ordersDebtData } = await supabase.from('orders').select('financials').eq('driver_id', currentDriverId).eq('status', 'in_transit').is('vendor_collected_at', null);
      
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: todayOrders } = await supabase.from('orders').select('financials').eq('driver_id', currentDriverId).eq('status', 'delivered').gte('created_at', startOfToday.toISOString());
      
      const { data: configData } = await supabase.from('app_config').select('surge_pricing_active').maybeSingle();
      if (configData) setIsSurgeActive(!!configData.surge_pricing_active);

      if (walletData) void walletData.system_balance;
      if (ordersDebtData) setVendorDebt(ordersDebtData.reduce((acc, order) => acc + (order.financials.order_value || 0), 0));
      if (todayOrders) setTodayDeliveryFees(todayOrders.reduce((acc, order) => acc + (order.financials.delivery_fee || 0), 0));
      if (settlementsData) {
        void settlementsData.map(s => ({
          id: s.id,
          vendor: "تسوية مديونية",
          amount: s.amount,
          status: s.status === 'approved' ? "تم السداد" : s.status === 'pending' ? "جاري المراجعة" : "مرفوض",
          date: new Date(s.created_at).toLocaleDateString('ar-EG')
        }));
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  async function fetchOrders(explicitDriverId?: string) {
    const activeDriverId = explicitDriverId ?? driverId;
    try {
      const [pending, active] = await Promise.all([
        getAvailableOrders(),
        activeDriverId ? getDriverActiveOrders(activeDriverId) : Promise.resolve([]),
      ]);
      const seen = new Set<string>();
      const merged = [...active, ...pending].filter((o) => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });
      setOrders(merged.map(mapDBOrderToUI));
    } catch (err) {
      console.error("fetchOrders error:", err);
    }
  }

  async function fetchDeliveredOrders(currentDriverId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles:vendor_id(full_name, phone, location, area)')
        .eq('driver_id', currentDriverId)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDeliveredOrders(data || []);
    } catch (err) {
      console.error("fetchDeliveredOrders error:", err);
    }
  }

  async function fetchTodayHistory(currentDriverId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles:vendor_id(full_name, phone, location, area)')
        .eq('driver_id', currentDriverId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTodayHistory(data || []);
    } catch (err) {
      console.error("fetchTodayHistory error:", err);
    }
  }

  function mapDBOrderToUI(db: DBDriverOrder): Order {
    const distanceValue = db.distance || 2.5;
    const vendorProfile = db.profiles || {};
    const vendorCoords = vendorProfile.location || null;
    const customerCoords = db.customer_details.coords || null;
    return {
      id: db.id,
      vendor: vendorProfile.full_name || "محل غير معروف",
      vendorId: db.vendor_id,
      vendorPhone: vendorProfile.phone || "",
      customer: db.customer_details.name,
      customerPhone: db.customer_details.phone || "",
      address: db.customer_details.address,
      distanceValue: distanceValue,
      distance: `${distanceValue} كم`,
      fee: `${db.financials.delivery_fee} ج.م`,
      status: db.status,
      coords: vendorCoords,
      vendorCoords,
      customerCoords,
      prepTime: db.financials.prep_time,
      isPickedUp: db.status === 'in_transit' || db.status === 'delivered',
      priority: db.status === 'in_transit' ? 1 : (db.status === 'assigned' ? 2 : 3),
      vendorCollectedAt: db.vendor_collected_at,
      driverConfirmedAt: db.driver_confirmed_at,
      orderValue: db.financials.order_value,
      financials: {
        order_value: db.financials.order_value,
        delivery_fee: db.financials.delivery_fee,
        system_commission: db.financials.system_commission,
        driver_earnings: db.financials.driver_earnings,
        prep_time: db.financials.prep_time,
      },
    };
  }

  const manualSync = async () => {
    if (!driverId) return;
    void Promise.allSettled([
      withTimeout('sync.fetchOrders', fetchOrders(driverId), 15000),
      withTimeout('sync.fetchStats', fetchStats(driverId), 15000),
      withTimeout('sync.fetchDelivered', fetchDeliveredOrders(driverId), 15000),
      withTimeout('sync.fetchHistory', fetchTodayHistory(driverId), 15000),
    ]);
  };

  // Sync with useSync hook
  const { triggerUpdate } = useSync(driverId || undefined, () => {
    if (driverId) {
      void Promise.allSettled([
        withTimeout('sync.fetchOrders', fetchOrders(driverId), 15000),
        withTimeout('sync.fetchStats', fetchStats(driverId), 15000),
        withTimeout('sync.fetchDelivered', fetchDeliveredOrders(driverId), 15000),
        withTimeout('sync.fetchHistory', fetchTodayHistory(driverId), 15000),
      ]);
    }
  });

  const toggleActive = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
    } catch (e) {}
    const newStatus = !isActive;
    setIsActive(newStatus);
    if (typeof window !== "undefined") {
      localStorage.setItem("driver_is_active", newStatus.toString());
    }
    if (driverId) {
      await supabase.from('profiles').update({ is_online: newStatus }).eq('id', driverId);
    }
    if (newStatus && autoAccept && pollInterval === null) {
      const interval = setInterval(async () => {
        if (driverId) {
          const newOrders = await getAvailableOrders();
          if (newOrders.length > 0) {
            const firstOrder = newOrders[0];
            await updateOrderStatus(firstOrder.id, 'assigned', driverId);
            toastSuccess('تم القبول التلقائي للطلب #' + firstOrder.id.slice(0,8));
          }
        }
      }, 5000);
      setPollInterval(interval);
    } else if (!newStatus && pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  };

  const toggleAutoAccept = () => {
    const newAuto = !autoAccept;
    setAutoAccept(newAuto);
    localStorage.setItem('driver_auto_accept', newAuto.toString());
    if (newAuto && isActive && driverId && pollInterval === null) {
      // start poll
      const interval = setInterval(async () => {
        const newOrders = await getAvailableOrders();
        if (newOrders.length > 0) {
          const firstOrder = newOrders[0];
          await updateOrderStatus(firstOrder.id, 'assigned', driverId);
          toastSuccess('تم القبول التلقائي');
        }
      }, 5000);
      setPollInterval(interval);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!driverId) return;
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'assigned' as const } : o));
    const { error } = await updateOrderStatus(orderId, 'assigned', driverId);
    if (!error) {
      toastSuccess('تم قبول الطلب بنجاح!');
      await fetchOrders(driverId);
    } else {
      await fetchOrders(driverId);
    }
  };

  const handlePickupOrder = async (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'in_transit' as const, isPickedUp: true } : o));
    const { error } = await updateOrderStatus(orderId, 'in_transit');
    if (!error) {
      toastSuccess('تم تأكيد الاستلام من المحل — المديونية سُجّلت في محفظتك');
    }
    if (driverId) {
      await fetchOrders(driverId);
      void fetchStats(driverId);
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    const { error } = await updateOrderStatus(orderId, 'delivered');
    if (!error) {
      toastSuccess('تم التوصيل بنجاح! يمكنك الآن تأكيد تسليم المبلغ للمحل من محفظتك.');
    }
    if (driverId) {
      await fetchOrders(driverId);
      void fetchStats(driverId);
      void fetchDeliveredOrders(driverId);
      void fetchTodayHistory(driverId);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    if (!driverId) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ driver_confirmed_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('driver_id', driverId)
        .eq('status', 'delivered');
      
      if (error) throw error;
      
      toastSuccess('تم تأكيد تسليم المبلغ! بانتظار تأكيد المحل.');
      void fetchDeliveredOrders(driverId);
    } catch (err) {
      console.error('Confirm Payment failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f3f4f6] p-6 space-y-8" dir="rtl">
      <div className="grid grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="space-y-4">
        <OrderSkeleton />
        <OrderSkeleton />
      </div>
    </div>
  );

    return (
      <AuthGuard allowedRoles={["driver"]}>
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-emerald-50 flex flex-col font-sans" dir="rtl">
        <Toast toasts={toasts} onRemove={removeToast} />

        <div className="relative z-10 flex flex-col h-full flex-1">

          <DriverHeader
            driverName={driverName}
            lastSyncTime={lastSyncTime}
            isRefreshing={isRefreshing}
            isActive={isActive}
            isSurgeActive={isSurgeActive}
            onOpenDrawer={() => {
              try { Haptics.selectionChanged(); } catch(e) {}
              setShowDrawer(true);
            }}
            onToggleActive={toggleActive}
            onSync={manualSync}
          />

          <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Suspense fallback={<AppLoader />}>
                  {activeTab === "orders" ? (
                    <DriverOperationsHub
                      todayDeliveryFees={todayDeliveryFees}
                      vendorDebt={vendorDebt}
                      isActive={isActive}
                      driverLocation={driverLocation}
                      driverId={driverId}
                      orders={orders}
                      todayHistory={todayHistory}
                      autoAccept={autoAccept}
                      onToggleAutoAccept={toggleAutoAccept}
                      onAcceptOrder={handleAcceptOrder}
                      onPickupOrder={handlePickupOrder}
                      onDeliverOrder={handleDeliverOrder}
                    />
                  ) : activeTab === "wallet" ? (
                    <DriverWalletView
                      todayDeliveryFees={todayDeliveryFees}
                      vendorDebt={vendorDebt}
                      orders={orders}
                      deliveredOrders={deliveredOrders}
                      allHistory={todayHistory}
                      onConfirmPayment={handleConfirmPayment}
                    />
                  ) : (
                    <div className="text-center py-20">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
                      />
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
          onSignOut={handleSignOut}
        />
      </div>
    </AuthGuard>
  );
}

