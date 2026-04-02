"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { Haptics } from "@capacitor/haptics";
import { getCurrentUser, getUserProfile, signOut } from "@/lib/auth";
import { getAvailableOrders } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { AppLoader } from "@/components/AppLoader";
import { CardSkeleton, OrderSkeleton } from "@/components/ui/Skeleton";
import AuthGuard from "@/components/AuthGuard";
import Toast from "@/components/Toast";
import { useSync } from "@/hooks/useSync";
import { useToast } from "@/hooks/useToast";
import type { Order, DBDriverOrder } from "./types";
import DriverHeader from "./components/DriverHeader";
import DriverOrdersView from "./components/DriverOrdersView";
import DriverDrawer from "./components/DriverDrawer";
import DriverWalletView from "./components/DriverWalletView";
import DriverHistoryView from "./components/DriverHistoryView";

export default function DriverApp() {
  const { toasts, removeToast } = useToast();
  
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  
  // Basic State
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("كابتن");
  const [isActive, setIsActive] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "wallet" | "history">("orders");
  const [todayDeliveryFees, setTodayDeliveryFees] = useState(0);
  const [vendorDebt, setVendorDebt] = useState(0);
  const [isRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

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
              withTimeout('fetchStats', fetchStats(user.id), 10000)
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
      const { data: ordersDebtData } = await supabase.from('orders').select('financials').eq('driver_id', currentDriverId).eq('status', 'delivered').is('vendor_collected_at', null);
      
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: todayOrders } = await supabase.from('orders').select('financials').eq('driver_id', currentDriverId).eq('status', 'delivered').gte('created_at', startOfToday.toISOString());
      
      const { data: settlementsData } = await supabase.from('settlements').select('*').eq('user_id', currentDriverId).order('created_at', { ascending: false });

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

  async function fetchOrders() {
    const data = await getAvailableOrders();
    if (data) {
      setOrders(data.map(mapDBOrderToUI));
    }
  }

  function mapDBOrderToUI(db: DBDriverOrder): Order {
    const distanceValue = db.distance || 2.5;
    const vendorProfile = db.profiles || {};
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
      coords: vendorProfile.location || { lat: 30.0444, lng: 31.2357 },
      prepTime: db.financials.prep_time,
      isPickedUp: db.status === 'in_transit' || db.status === 'delivered',
      priority: db.status === 'in_transit' ? 1 : (db.status === 'assigned' ? 2 : 3),
      vendorCollectedAt: db.vendor_collected_at,
      driverConfirmedAt: db.driver_confirmed_at
    };
  }

  // Sync with useSync hook
  useSync(driverId || undefined, () => {
    if (driverId) {
      void Promise.allSettled([
        withTimeout('sync.fetchOrders', fetchOrders(), 15000),
        withTimeout('sync.fetchStats', fetchStats(driverId), 15000)
      ]);
    }
  });

  const toggleActive = async () => {
    try {
      await Haptics.impact({ style: 'light' });
    } catch (e) {}
    const newStatus = !isActive;
    setIsActive(newStatus);
    if (typeof window !== "undefined") {
      localStorage.setItem("driver_is_active", newStatus.toString());
    }
    if (driverId) {
      await supabase.from('profiles').update({ is_online: newStatus }).eq('id', driverId);
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
      <div className="min-h-screen bg-[#0f172a] flex flex-col font-sans overflow-hidden relative" dir="rtl">
        {/* Premium Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[#0f172a]" />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.15, 0.1],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/4 -right-1/4 w-full h-full bg-blue-600/20 rounded-full blur-[120px]" 
          />
          <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay" />
        </div>

        <Toast toasts={toasts} onRemove={removeToast} />

        <div className="relative z-10 flex flex-col h-full flex-1">
          <DriverHeader
            driverName={driverName}
            lastSyncTime={lastSyncTime}
            isRefreshing={isRefreshing}
            isActive={isActive}
            onOpenDrawer={() => {
              try { Haptics.selection(); } catch(e) {}
              setShowDrawer(true);
            }}
            onToggleActive={toggleActive}
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
                    <DriverOrdersView
                      todayDeliveryFees={todayDeliveryFees}
                      vendorDebt={vendorDebt}
                      isActive={isActive}
                      driverLocation={driverLocation}
                      driverId={driverId}
                      orders={orders}
                    />
                  ) : activeTab === "wallet" ? (
                    <DriverWalletView
                      todayDeliveryFees={todayDeliveryFees}
                      vendorDebt={vendorDebt}
                      orders={orders}
                    />
                  ) : activeTab === "history" ? (
                    <DriverHistoryView orders={orders} />
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
