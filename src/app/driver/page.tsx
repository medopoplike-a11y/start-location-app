"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Preferences } from "@capacitor/preferences";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { Capacitor } from "@capacitor/core";
import { getCurrentUser, getUserProfile, signOut } from "@/lib/auth";
import { getAvailableOrders, getDriverActiveOrders, updateOrderStatus } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { getCache, setCache } from "@/lib/native-utils";
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
  const { toasts, removeToast, success: toastSuccess, error: toastError } = useToast();
  
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
  const [vendorDebt, setVendorDebt] = useState<number>(0);
  const [systemBalance, setSystemBalance] = useState<number>(0);
  const [autoAccept, setAutoAccept] = useState(false);

  // Handle Body Scroll Lock when drawer is open
  useEffect(() => {
    if (showDrawer) {
      document.body.classList.add('scroll-lock');
    } else {
      document.body.classList.remove('scroll-lock');
    }
    return () => document.body.classList.remove('scroll-lock');
  }, [showDrawer]);

  // 4. Pickup Timeout Check (15 minutes)
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
            console.log(`Order ${order.id} timed out (15 mins since acceptance)`);
            // Unassign order
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
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [driverId, orders, toastSuccess]);

  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [isRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(0);
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

  // 2. KeepAwake: Prevent screen from turning off while online
  useEffect(() => {
    if (isActive && typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      KeepAwake.keepAwake().catch(() => {});
      return () => {
        KeepAwake.allowSleep().catch(() => {});
      };
    }
  }, [isActive]);

  // 3. Persistent state for isActive using Native Preferences
  useEffect(() => {
    const saveState = async () => {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'driver_is_active', value: isActive ? "true" : "false" });
      } else {
        localStorage.setItem("driver_is_active", isActive ? "true" : "false");
      }
    };
    saveState();
  }, [isActive]);

  useEffect(() => {
    const restoreState = async () => {
      let savedActive = null;
      let savedAuto = null;
      if (Capacitor.isNativePlatform()) {
        const { value: activeVal } = await Preferences.get({ key: 'driver_is_active' });
        const { value: autoVal } = await Preferences.get({ key: 'driver_auto_accept' });
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

    // Mobile-optimized fallback: Detect Capacitor, extend timeout
    const isCapacitor = typeof window !== 'undefined' && Capacitor.isNativePlatform();
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
      // 1. Try to load initial data from cache for instant display
      const [cachedName, cachedOrders, cachedStats, cachedDelivered, cachedHistory] = await Promise.all([
        getCache<string>('driver_name'),
        getCache<Order[]>('driver_orders'),
        getCache<any>('driver_stats'),
        getCache<DBDriverOrder[]>('driver_delivered_orders'),
        getCache<DBDriverOrder[]>('driver_today_history')
      ]);

      if (cachedName) setDriverName(cachedName);
      if (cachedOrders && cachedOrders.length > 0) {
        setOrders(cachedOrders);
      }
      if (cachedStats) {
        if (cachedStats.vendorDebt) setVendorDebt(cachedStats.vendorDebt);
        if (cachedStats.todayDeliveryFees) setTodayDeliveryFees(cachedStats.todayDeliveryFees);
        if (cachedStats.systemBalance) setSystemBalance(cachedStats.systemBalance);
      }
      if (cachedDelivered) setDeliveredOrders(cachedDelivered);
      if (cachedHistory) setTodayHistory(cachedHistory);

      // If we have cached orders or stats, we can hide the loader earlier
      if ((cachedOrders && cachedOrders.length > 0) || cachedStats) {
        setLoading(false);
      }

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
            toastSuccess(`أهلاً بك يا كابتن ${authProfile.full_name || ""}!`);
            
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
        const now = Date.now();
        // Limit updates to once every 20 seconds to save battery
        if (now - lastLocationUpdate < 20000) return;
        
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setDriverLocation(newLocation);
        setLastLocationUpdate(now);

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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverId, isActive, lastLocationUpdate]);

  async function fetchStats(currentDriverId: string) {
    setLastSyncTime(new Date());
    try {
      const { data: walletData } = await supabase.from('wallets').select('debt, system_balance').eq('user_id', currentDriverId).single();
      const { data: uncollectedDeliveredOrders } = await supabase
        .from('orders')
        .select('financials')
        .eq('driver_id', currentDriverId)
        .eq('status', 'delivered')
        .is('vendor_collected_at', null);
      
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: todayOrders } = await supabase.from('orders').select('financials').eq('driver_id', currentDriverId).eq('status', 'delivered').gte('created_at', startOfToday.toISOString());
      
      const { data: configData } = await supabase.from('app_config').select('surge_pricing_active').maybeSingle();
      if (configData) setIsSurgeActive(!!configData.surge_pricing_active);

      let finalBalance = systemBalance;
      let finalDebt = vendorDebt;
      let finalFees = todayDeliveryFees;

      if (walletData) {
        finalBalance = walletData.system_balance || 0;
        setSystemBalance(finalBalance);
      }
      if (uncollectedDeliveredOrders) {
        finalDebt = uncollectedDeliveredOrders.reduce((acc, order) => acc + (order.financials.order_value || 0), 0);
        setVendorDebt(finalDebt);
      }
      if (todayOrders) {
        finalFees = todayOrders.reduce((acc, order) => acc + (order.financials.delivery_fee || 0), 0);
        setTodayDeliveryFees(finalFees);
      }

      // Update cache in one go
      setCache('driver_stats', { 
        vendorDebt: finalDebt, 
        todayDeliveryFees: finalFees,
        systemBalance: finalBalance 
      });

      // Re-add settlementsData processing
      const { data: settlementsData } = await supabase.from('settlements').select('*').eq('driver_id', currentDriverId).order('created_at', { ascending: false });
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
      const uiOrders = merged.map(mapDBOrderToUI);
      setOrders(uiOrders);
      setCache('driver_orders', uiOrders); // Always cache current orders
    } catch (err) {
      console.error("fetchOrders error:", err);
    }
  }

  const [isOnline, setIsOnline] = useState(true);

  // Monitor network status
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
      import("@capacitor/network").then(({ Network }) => {
        Network.getStatus().then(status => setIsOnline(status.connected));
        Network.addListener('networkStatusChange', status => setIsOnline(status.connected));
      });
    } else {
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

  async function fetchDeliveredOrders(currentDriverId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles:vendor_id(full_name, phone, location, area)')
        .eq('driver_id', currentDriverId)
        .eq('status', 'delivered')
        .is('vendor_collected_at', null) // Only show orders where debt is not yet collected by vendor
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDeliveredOrders(data || []);
      setCache('driver_delivered_orders', data || []);
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
      setCache('driver_today_history', data || []);
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
      statusUpdatedAt: db.status_updated_at || db.created_at || undefined,
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
  useSync(driverId || undefined, () => {
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
    } catch { }
    const newStatus = !isActive;
    setIsActive(newStatus);
    if (typeof window !== "undefined") {
      if (Capacitor.isNativePlatform()) {
        Preferences.set({ key: 'driver_is_active', value: newStatus.toString() }).catch(() => {});
      } else {
        localStorage.setItem("driver_is_active", newStatus.toString());
      }
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
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key: 'driver_auto_accept', value: newAuto.toString() }).catch(() => {});
    } else {
      localStorage.setItem('driver_auto_accept', newAuto.toString());
    }
    if (newAuto && isActive && driverId && pollInterval === null) {
      // start poll
      const interval = setInterval(async () => {
        if (!isActive || !driverId) {
          clearInterval(interval);
          setPollInterval(null);
          return;
        }
        const newOrders = await getAvailableOrders();
        if (newOrders.length > 0) {
          const firstOrder = newOrders[0];
          // Check if already assigned to someone else
          if (firstOrder.driver_id) return;
          
          await updateOrderStatus(firstOrder.id, 'assigned', driverId);
          toastSuccess('تم القبول التلقائي للطلب #' + firstOrder.id.slice(0,8));
          void fetchOrders(driverId);
        }
      }, 5000);
      setPollInterval(interval);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!driverId) {
      toastError("فشل تحديد هوية الطيار. يرجى إعادة تسجيل الدخول.");
      return;
    }
    
    // Optimistic Update: Update UI immediately
    const originalOrders = [...orders];
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: 'assigned', priority: 2, driver_id: driverId } : o);
    setOrders(updatedOrders);
    setCache('driver_orders', updatedOrders); // Immediate cache update for native feel

    try {
      // 1. Check if order is still pending to avoid race conditions
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('status, driver_id')
        .eq('id', orderId)
        .single();

      if (fetchError || !currentOrder) {
        throw new Error("لم يتم العثور على الطلب أو حدث خطأ في الاتصال");
      }

      if (currentOrder.status !== 'pending' || currentOrder.driver_id) {
        throw new Error("عذراً، هذا الطلب تم قبوله من قبل طيار آخر.");
      }

      // 2. Perform the update with a condition (double check)
      const { error: dbError } = await supabase
        .from('orders')
        .update({ 
          status: 'assigned', 
          driver_id: driverId,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('status', 'pending'); // Ensure it's still pending during update

      if (dbError) throw dbError;
      
      toastSuccess("تم قبول الطلب بنجاح! بالتوفيق.");
      
      // Update data in background
      await Promise.allSettled([fetchOrders(driverId), fetchStats(driverId)]);
    } catch (err: any) {
      // Rollback on error
      setOrders(originalOrders);
      toastError(err.message || "فشل قبول الطلب. حاول مرة أخرى.");
      console.error("handleAcceptOrder error:", err);
    }
  };

  const handlePickupOrder = async (orderId: string) => {
    if (!driverId) return;

    // Optimistic Update
    const originalOrders = [...orders];
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: 'in_transit', isPickedUp: true, priority: 1 } : o);
    setOrders(updatedOrders);
    setCache('driver_orders', updatedOrders);
    toastSuccess("تم استلام الطلب! في الطريق...");

    try {
      const { error: dbError } = await updateOrderStatus(orderId, 'in_transit', driverId);
      if (dbError) throw dbError;
      
      void Promise.allSettled([fetchOrders(driverId), fetchStats(driverId)]);
    } catch (err) {
      setOrders(originalOrders);
      toastError("فشل تحديث الحالة. حاول مرة أخرى.");
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    if (!driverId) return;

    // Optimistic Update: Remove from active orders
    const originalOrders = [...orders];
    const updatedOrders = orders.filter(o => o.id !== orderId);
    setOrders(updatedOrders);
    setCache('driver_orders', updatedOrders);
    toastSuccess("تم التوصيل بنجاح! مبروك...");

    try {
      const { error: dbError } = await updateOrderStatus(orderId, 'delivered', driverId);
      if (dbError) throw dbError;
      
      void Promise.allSettled([
        fetchOrders(driverId), 
        fetchStats(driverId),
        fetchDeliveredOrders(driverId),
        fetchTodayHistory(driverId)
      ]);
    } catch (err) {
      setOrders(originalOrders);
      toastError("فشل إتمام الطلب. حاول مرة أخرى.");
    }
  };

  const handleDeliverCustomer = async (orderId: string, customerIndex: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !order.customers) return;

    const newCustomers = [...order.customers];
    newCustomers[customerIndex] = {
      ...newCustomers[customerIndex],
      status: 'delivered',
      deliveredAt: new Date().toISOString()
    };

    // Update the local state first for responsiveness
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, customers: newCustomers } : o));

    try {
      // Get current customer_details from DB to be safe
      const { data: dbOrder } = await supabase.from('orders').select('customer_details').eq('id', orderId).single();
      if (dbOrder) {
        const updatedDetails = {
          ...dbOrder.customer_details,
          customers: newCustomers
        };
        const { error } = await supabase.from('orders').update({ customer_details: updatedDetails }).eq('id', orderId);
        if (error) throw error;
        toastSuccess(`تم تسليم العميل ${newCustomers[customerIndex].name} بنجاح`);
      }
    } catch (err) {
      console.error('Deliver customer failed:', err);
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
        </AnimatePresence>

        <div className="relative z-10 flex flex-col min-h-full">

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

          <main className="p-4 space-y-6 pb-24">
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
                      onDeliverCustomer={handleDeliverCustomer}
                    />
                  ) : activeTab === "wallet" ? (
                    <DriverWalletView
                      todayDeliveryFees={todayDeliveryFees}
                      vendorDebt={vendorDebt}
                      systemBalance={systemBalance}
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

