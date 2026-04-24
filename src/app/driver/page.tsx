"use client";

import React, { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Preferences } from "@capacitor/preferences";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { Capacitor } from "@capacitor/core";
import { getCurrentUser, getUserProfile, signOut, updateUserAccount } from "@/lib/auth";
import { fetchOrders, updateOrderStatus } from "@/lib/api/orders";
import { supabase } from "@/lib/supabaseClient";
import { requestAIAnalysis } from "@/lib/api/ai";
import { getCache, setCache, startBackgroundTracking, stopBackgroundTracking, startForegroundTracking, stopForegroundTracking, sendLocationBroadcast, cleanupBroadcastChannel, requestBatteryOptimizationExemption } from "@/lib/native-utils";
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
import DriverSettingsView from "./components/DriverSettingsView";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import { Wallet, X, Loader2, Settings, Bot, MapPin, Send, Mic, MessageSquare, AlertCircle } from "lucide-react";

// V17.7.8: Standard Class Error Boundary for radical stability
class DriverErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("DriverErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center" dir="rtl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">عذراً، حدث خطأ في الواجهة</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-md">
            حدث خطأ غير متوقع أثناء عرض واجهة الطيار. تم عزل الخطأ لضمان عدم انهيار التطبيق بالكامل.
          </p>
          <div className="flex flex-col w-full gap-3 max-w-xs">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
            >
              إعادة محاولة التشغيل
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function DriverApp() {
  return (
    <DriverErrorBoundary>
      <DriverPageContent />
    </DriverErrorBoundary>
  );
}

function DriverPageContent() {
  const { toasts, removeToast, success: toastSuccess, error: toastError } = useToast();
  
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  
  // Basic State
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("كابتن");
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
  const [balance, setBalance] = useState<number>(0); // Overall Earnings
  const [autoAccept, setAutoAccept] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [aiAnalysis, setAIAnalysis] = useState<any>(null);
  
  // V1.7.5: AI Chat States
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', content: string}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAISending, setIsAISending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAISending]);

  const handleSendAIChat = async (text?: string) => {
    const msg = text || chatInput;
    if (!msg.trim() || isAISending) return;

    const userMsg = msg.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsAISending(true);

    try {
      const res = await requestAIAnalysis('chat', { 
        message: userMsg,
        orderContext: orders.length > 0 ? orders[0] : null
      }, 'driver');

      if (res.analysis) {
        setChatMessages(prev => [...prev, { role: 'ai', content: res.analysis.content }]);
        // Optional: Speak the response
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

      recognition.onstart = () => {
        setIsListening(true);
        triggerHaptic(ImpactStyle.Medium);
      };

      recognition.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        handleSendAIChat(speechToText);
      };

      recognition.onerror = () => {
        setIsListening(false);
        toastError("فشل التعرف على الصوت");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };
  const [analyzingOrder, setAnalyzingOrder] = useState<string | null>(null);

  const handleRequestAIHelp = async (order: Order) => {
    try {
      setAnalyzingOrder(order.id);
      setShowAIHelper(true);
      setAIAnalysis(null);
      
      const { requestAIAnalysis } = await import("@/lib/api/ai");
      const res = await requestAIAnalysis('location_help', order, 'driver');
      setAIAnalysis(res);
    } catch (e) {
      console.error("AI: Help request failed", e);
      setAIAnalysis({ content: "عذراً، لم أتمكن من تحليل العنوان حالياً. حاول مجدداً." });
    } finally {
      setAnalyzingOrder(null);
    }
  };
  const [settlementAmount, setSettlementAmount] = useState("");
  const [requestingSettlement, setRequestingSettlement] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [settingsData, setSettingsData] = useState({ name: "", phone: "", email: "", password: "" });
  const [rating, setRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const backgroundWatcherRef = useRef<string | null>(null);
  const foregroundWatcherRef = useRef<string | null>(null);
  const ordersRef = useRef<Order[]>([]);

  const [showBatteryAlert, setShowBatteryAlert] = useState(false);

  // V17.4.7: Removed redundant onAppResume → manualSync wiring.
  // useSync already handles app resume (visibility + Capacitor appStateChange)
  // and triggers a fresh fetch via the page's onUpdate callback. Calling
  // manualSync from a second listener caused 2-3 overlapping refreshes on every
  // return-from-background, which produced the "stale/scattered data" feel.

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Preferences.get({ key: 'battery_alert_dismissed' }).then(({ value }) => {
        if (value !== 'true') setShowBatteryAlert(true);
      });
    }
  }, []);

  const dismissBatteryAlert = async () => {
    setShowBatteryAlert(false);
    await Preferences.set({ key: 'battery_alert_dismissed', value: 'true' });
  };

  // Keep ordersRef in sync with orders state
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(0);
  const [activeDebtOrders, setActiveDebtOrders] = useState<Order[]>([]);
  const [todayHistory, setTodayHistory] = useState<Order[]>([]);
  const [isSurgeActive, setIsSurgeActive] = useState(false);
  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);
  const [mapMode, setMapMode] = useState(false); // New state for Full Map Mode

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

  // 2. KeepAwake & Tracking: Prevent screen from turning off while online
  useEffect(() => {
    let isMounted = true;
    
    const startTrackingSequence = async () => {
      if (!isActive || !driverId || !Capacitor.isNativePlatform() || !isMounted) return;

      try {
        console.log("Native Tracking: Initializing sequence...");
        
        // 0. Set Online Status in DB immediately (V0.9.87)
        if (driverId) {
          await supabase.from('profiles').update({ 
            is_online: true,
            last_location_update: new Date().toISOString()
          }).eq('id', driverId);
        }

        // 1. Keep Awake
        await KeepAwake.keepAwake().catch(err => console.warn("KeepAwake error:", err));
        
        if (!isMounted) return;

        // 2. Background Tracking (Plugin-based - Handles both FG/BG)
        if (!backgroundWatcherRef.current) {
          const bId = await startBackgroundTracking(driverId, driverName, 'driver', (loc) => {
            if (isMounted) setDriverLocation(loc);
          });
          if (isMounted && bId) {
            backgroundWatcherRef.current = bId;
            console.log("Native Tracking: Background watcher started", bId);
          }
        }

        if (!isMounted) return;

        // 4. Manual Heartbeat: Ensure online status stays fresh in DB even if stationary
        const heartbeatInterval = setInterval(async () => {
          if (!isMounted || !isActive) return;
          try {
            await supabase.from('profiles').update({
              is_online: true,
              last_location_update: new Date().toISOString()
            }).eq('id', driverId);
          } catch (e) { console.warn("Heartbeat failed", e); }
        }, 2 * 60 * 1000); // Every 2 minutes

        return () => {
          clearInterval(heartbeatInterval);
        };
      } catch (err) {
        console.error("Native Tracking: Fatal sequence error", err);
      }
    };

    const stopTrackingSequence = async () => {
      console.log("Native Tracking: Stopping sequence...");
      
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

        // Clean up the persistent broadcast channel when driver goes offline
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
  }, [isActive, driverId]);

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
      const [cachedOrders, cachedStats, cachedDebt, cachedHistory] = await Promise.all([
        getCache<Order[]>('driver_orders'),
        getCache<any>('driver_stats'),
        getCache<DBDriverOrder[]>('driver_active_debt_orders'),
        getCache<DBDriverOrder[]>('driver_today_history')
      ]);
      
      if (cachedOrders) setOrders(cachedOrders);
      if (cachedDebt) setActiveDebtOrders(cachedDebt);
      if (cachedHistory) setTodayHistory(cachedHistory);
      if (cachedStats) {
        setVendorDebt(cachedStats.vendorDebt || 0);
        setTodayDeliveryFees(cachedStats.todayDeliveryFees || 0);
        setSystemBalance(cachedStats.systemBalance || 0);
        setBalance(cachedStats.balance || 0);
      }

      if (authLoading) return;
      if (!user) { setLoading(false); return; }
      
      const currentDriverId = user.id;
      setDriverId(currentDriverId);
      setDriverName(user.user_metadata?.full_name || "كابتن سكة");
      setSettingsData({
        name: user.user_metadata?.full_name || "",
        phone: user.user_metadata?.phone || "",
        email: user.email || "",
        password: ""
      });

      try {
        setLoading(true);
        // V0.9.95: Single clean initialization
        await Promise.allSettled([
          fetchOrders(currentDriverId),
          fetchStats(currentDriverId),
          fetchActiveDebtOrders(currentDriverId),
          fetchTodayHistory(currentDriverId)
        ]);
      } catch (e) {
      console.error("Driver initialization failed", e);
      // V17.7.7: Radical recovery - if initialization fails, unblock UI but log error
      setLoading(false);
    } finally {
      setLoading(false);
    }
    };

    setup();
    return () => clearTimeout(hardFallback);
  }, [user, authProfile, authLoading]); // V0.9.68: Removed isActive to prevent full reload on toggle

  useEffect(() => {
    // Web-only Location Tracker: If on native, we use the specialized tracking sequence instead
    if (typeof navigator === "undefined" || !navigator.geolocation || !driverId || !isActive || Capacitor.isNativePlatform()) return;

    console.log("Web Tracking: Starting navigator.geolocation watcher...");
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        // V17.8.0: Faster web tracking interval (2 seconds) for smoother map movement.
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

        // 1. Broadcast immediately via persistent singleton (no channel-leak)
        sendLocationBroadcast(driverId, newLocation, driverName);

        // 2. Persist to DB (V16.9.3: Improved robustness and validation)
        try {
          if (isNaN(newLocation.lat) || isNaN(newLocation.lng)) {
            console.warn("[DriverV16.9.3] Invalid location coords skipped");
            return;
          }

          const patchData = { 
            location: { ...newLocation, ts: now },
            is_online: true,
            last_location_update: new Date().toISOString()
          };

          const { error: patchError } = await supabase.from('profiles').update(patchData).eq('id', driverId);
          
          if (patchError) {
            console.error("[DriverV16.9.3] Profile update failed:", patchError);
          }
        } catch (e) {
          console.error("[DriverV16.9.3] Exception during location sync:", e);
        }
      },
      (error) => {
        console.warn("Geolocation watch error:", error);
        // Don't auto-offline on temporary errors
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverId, isActive, lastLocationUpdate]);

  const fetchStats = async (currentDriverId: string) => {
    setLastSyncTime(new Date());
    try {
      // V0.9.92: Improved Wallet Fetching with Auto-Creation fallback
      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('debt, system_balance, balance')
        .eq('user_id', currentDriverId)
        .maybeSingle();
      
      if (!walletData && !walletError) {
        console.log("DriverPage: Wallet not found, creating one...");
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: currentDriverId, balance: 0, debt: 0, system_balance: 0 })
          .select()
          .single();
        if (!createError) walletData = newWallet;
      }

      const { data: uncollectedOrders } = await supabase
        .from('orders')
        .select('financials')
        .eq('driver_id', currentDriverId)
        .in('status', ['in_transit', 'delivered']) 
        .is('vendor_collected_at', null);
      
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const { data: todayOrders } = await supabase.from('orders')
        .select('financials')
        .eq('driver_id', currentDriverId)
        .eq('status', 'delivered')
        .gte('status_updated_at', startOfToday.toISOString());
      
      const { data: configData } = await supabase.from('app_config').select('surge_pricing_active').maybeSingle();
      if (configData) setIsSurgeActive(!!configData.surge_pricing_active);

      // V17.7.7: Industrial-grade numeric sanitation
      const finalBalance = Number(walletData?.system_balance || 0);
      const finalOverallBalance = Number(walletData?.balance || 0);
      
      // V1.2.1: Use uncollectedOrders sum for real-time accuracy, fallback to wallet debt
      let finalDebt = Number(walletData?.debt || 0);
      if (uncollectedOrders && Array.isArray(uncollectedOrders)) {
        const ordersSum = uncollectedOrders.reduce((acc, o) => acc + Number(o.financials?.order_value || 0), 0);
        if (ordersSum > 0 || uncollectedOrders.length === 0) {
          finalDebt = ordersSum;
        }
      }
      
      let finalFees = 0;
      if (todayOrders && Array.isArray(todayOrders)) {
        finalFees = todayOrders.reduce((acc, o) => {
          const earnings = Number(o?.financials?.driver_earnings || 0);
          return acc + (isNaN(earnings) ? 0 : earnings);
        }, 0);
      }

      setSystemBalance(finalBalance);
       setBalance(finalOverallBalance);
       setVendorDebt(finalDebt);
       setTodayDeliveryFees(finalFees);
 
       // V0.9.92: Re-add settlements data fetching
       const { data: settlementsData } = await supabase.from('settlements').select('*').eq('user_id', currentDriverId).order('created_at', { ascending: false });
       if (settlementsData) {
         const history = settlementsData.map(s => ({
           id: s.id,
           amount: s.amount,
           status: s.status === 'approved' ? "تم السداد" : (s.status === 'pending' ? "جاري المراجعة" : "مرفوض"),
           date: new Date(s.created_at).toLocaleDateString('ar-EG')
         }));
         setSettlementHistory(history);
       }

    } catch (err) {
      console.error("DriverPage: fetchStats failed", err);
    }
  };

  const handleUpdateProfile = async () => {
    if (!driverId) return;
    setActionLoading(true);
    try {
      const { error: dbError } = await updateUserAccount({
        full_name: settingsData.name,
        phone: settingsData.phone,
        email: settingsData.email,
        password: settingsData.password
      });
      if (!dbError) {
        setDriverName(settingsData.name);
        // Refresh local data from DB to ensure UI reflects the latest saved changes
        if (driverId) {
          fetchStats(driverId);
          // Also fetch the profile specifically to update the settingsData
          const profile = await getUserProfile(driverId);
          if (profile) {
            setSettingsData({
              name: profile.full_name || "",
              phone: profile.phone || "",
              email: profile.email || "",
              password: ""
            });
          }
        }
        toastSuccess("تم تحديث الملف الشخصي بنجاح!");
        setActiveTab("orders");
      } else {
        throw dbError;
      }
    } catch (err: any) {
      toastError(`حدث خطأ أثناء التحديث: ${err.message || "حاول مرة أخرى"}`);
    } finally {
      setActionLoading(false);
    }
  };

  async function fetchOrders(explicitDriverId?: string) {
    const activeDriverId = explicitDriverId ?? driverId;
    try {
      const { fetchOrders: fetchUnifiedOrders } = await import("@/lib/api/orders");
      const [pending, active, completedToday] = await Promise.all([
        fetchUnifiedOrders({ role: 'driver', status: ['pending'] }),
        activeDriverId ? fetchUnifiedOrders({ role: 'driver', userId: activeDriverId, status: ['assigned', 'in_transit'] }) : Promise.resolve([]),
        activeDriverId ? fetchTodayHistoryData(activeDriverId) : Promise.resolve([]),
      ]);
      
      const seen = new Set<string>();
      const merged = [...(active || []), ...(pending || []), ...(completedToday || [])].filter((o) => {
        if (!o || seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });
      
      const uiOrders = merged.map(mapDBOrderToUI);
      setOrders(uiOrders);
      setCache('driver_orders', uiOrders);
    } catch (err) {
      console.error("fetchOrders error:", err);
    }
  }

  async function fetchTodayHistoryData(currentDriverId: string) {
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     const { data } = await supabase
       .from('orders')
       .select('*, vendor:vendor_id(full_name, phone, location, area)')
       .eq('driver_id', currentDriverId)
       .eq('status', 'delivered')
       .gte('status_updated_at', today.toISOString()); // Use status_updated_at
     return data || [];
   }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).requestAIHelp = handleRequestAIHelp;
    }
  }, [handleRequestAIHelp]);

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

  function mapDBOrderToUI(db: any): Order {
    try {
      if (!db) throw new Error("Null order data");
      const distanceValue = Number(db.distance) || 2.5;
      
      // Robustly handle joined profile data
      const rawProfiles = db.profiles || db.vendor || db.profile;
      const vendorProfile = (Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles) || {};
      
      // Fallback to top-level fields if join data is missing
      const vendorName = vendorProfile.full_name || db.vendor_name || "محل غير معروف";
      const vendorPhone = vendorProfile.phone || db.vendor_phone || "";
      const vendorArea = vendorProfile.area || db.vendor_area || "";
      
      // Safely parse location if it's a string
      let vendorCoords = vendorProfile.location || db.vendor_location || null;
      if (typeof vendorCoords === 'string') {
        try { vendorCoords = JSON.parse(vendorCoords); } catch { vendorCoords = null; }
      }
      
      let customerCoords = db.customer_details?.coords || null;
      if (typeof customerCoords === 'string') {
        try { customerCoords = JSON.parse(customerCoords); } catch { customerCoords = null; }
      }

      // Ensure coords are numbers if they exist (V17.7.5 Stability Fix)
      const ensureCoords = (c: any) => {
        if (!c || typeof c !== 'object') return null;
        const lat = Number(c.lat || c.latitude);
        const lng = Number(c.lng || c.longitude);
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
        distanceValue: distanceValue,
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
        customers: db.customer_details?.customers || [],
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
      return {
        id: db?.id || "error",
        vendor: "خطأ في البيانات",
        vendorId: "",
        driverId: "",
        customer: "خطأ",
        address: "خطأ",
        distanceValue: 0,
        distance: "0 كم",
        fee: "0",
        status: "pending",
        coords: null,
        vendorCoords: null,
        customerCoords: null,
        prepTime: "0",
        isPickedUp: false,
        priority: 4
      } as Order;
    }
  }

  async function fetchActiveDebtOrders(currentDriverId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, vendor:vendor_id(full_name, phone, location, area)')
        .eq('driver_id', currentDriverId)
        .in('status', ['assigned', 'in_transit', 'delivered']) // V0.9.40: Include assigned to allow pickup settlement
        .is('vendor_collected_at', null) 
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        // V17.7.5: Robust mapping for active debt orders
        const mapped = (data || []).map(mapDBOrderToUI).filter(o => o.id !== 'error');
        setActiveDebtOrders(mapped as any);
        setCache('driver_active_debt_orders', mapped);
      }
    } catch (err) {
      console.error("fetchActiveDebtOrders error:", err);
    }
  }

  const fetchTodayHistory = async (currentDriverId: string) => {
    try {
      // V0.9.92: Fetch more history (last 50 orders) instead of just today
      const { data, error } = await supabase.from('orders')
        .select('*, vendor:vendor_id(full_name, phone, location, area)')
        .eq('driver_id', currentDriverId)
        .in('status', ['delivered', 'cancelled'])
        .order('status_updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      if (data) {
        // V17.7.5: Map history through unified mapper to ensure UI stability
        const mapped = (data as any[]).map(mapDBOrderToUI);
        setTodayHistory(mapped as any);
        setCache('driver_today_history', mapped);
      }
    } catch (err) {
      console.error("DriverPage: fetchHistory failed", err);
    }
  };

  const isRefreshingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const manualSync = async (payload?: any) => {
    if (!driverId || isRefreshingRef.current) return;
    
    // V1.1.2: Debounce manualSync to prevent rapid consecutive fetches
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(async () => {
      if (!driverId || isRefreshingRef.current) return;
      
      // V0.9.95: Skip full refresh for self-location broadcast to prevent UI stutter
      if (payload?.source === 'broadcast' && payload?.new?.id === driverId) return;

      isRefreshingRef.current = true;
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          await supabase.auth.refreshSession();
        }
      } catch (e) {
        console.warn("manualSync: Session check failed", e);
      }

      const table = payload?.table;
      const isOrderUpdate = table === 'orders' || !table;
      const isProfileUpdate = table === 'profiles' || !table;
      const isWalletUpdate = table === 'wallets' || !table;
      
      try {
        const tasks: Promise<any>[] = [];
        if (isOrderUpdate) {
          tasks.push(withTimeout('sync.fetchOrders', fetchOrders(driverId), 10000));
        }
        if (isProfileUpdate || isWalletUpdate) {
          tasks.push(withTimeout('sync.fetchStats', fetchStats(driverId), 10000));
        }
        
        await Promise.allSettled(tasks);
      } finally {
        isRefreshingRef.current = false;
        syncTimeoutRef.current = null;
      }
    }, 100); // V17.8.0: 100ms for ultra-low latency updates.
  };

  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);

  // V17.7.0: Memoized Driver ID to prevent re-subscriptions in useSync
  const memoizedUserId = useMemo(() => driverId || undefined, [driverId]);

  // V17.2.7: Unified Sync Engine
  useSync(memoizedUserId, (payload) => {
    // V17.4.6: Explicit 'driver' role so order subscription only fires for
    // this driver's own orders — eliminates flood from other drivers/vendors.
    if (!driverId) return;

    console.log("[DriverSync] Global sync update received:", payload?.source);

    // 1. Reset locks on resume/focus
    if (payload?.source === 'app_resume_start' || payload?.source === 'app_resume_complete' || payload?.source === 'visibility_change') {
      isRefreshingRef.current = false;
      if (payload?.source === 'app_resume_start') {
        setIsRefreshing(true); // Show loader during recovery
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    }

    if (payload?.isHardSync && payload?.source === 'app_resume_start') {
      // V17.6.1: If hard sync is needed, show cached data first while clearing stale state
      setOrders([]); // Clear memory, fetchOrders(preferCache: true) will refill it from SQLite
    }

    // 2. Handle global alerts
    if (payload?.payload?.type === 'system_alert') {
      toastSuccess(payload.payload.message);
      return;
    }

    // V17.4.9: Snappy Partial Updates
    // If we have the full order object in the payload, inject it into local state
    // immediately to avoid an expensive fetch cycle.
    if (payload?.order) {
      console.log("[DriverSync] Partial update received for order:", payload.order.id);
      const mappedOrder = mapDBOrderToUI(payload.order);
      setOrders(prev => {
        const index = prev.findIndex(o => o.id === mappedOrder.id);
        if (index > -1) {
          // Skip update if data is identical (Render Optimization)
          if (JSON.stringify(prev[index]) === JSON.stringify(mappedOrder)) return prev;
          
          // Update existing
          const newOrders = [...prev];
          newOrders[index] = { ...newOrders[index], ...mappedOrder };
          return newOrders;
        } else if (mappedOrder.status === 'pending' || mappedOrder.driver_id === driverId) {
          // Add new if relevant
          return [mappedOrder, ...prev];
        }
        return prev;
      });
      
      // Still trigger a silent background sync to keep SQLite in sync
      if (Capacitor.isNativePlatform()) {
        dbService.saveOrder(payload.order).catch(() => {});
      }
      return; // Skip full manualSync
    }

    // 3. Trigger full data refresh for general events
    // V17.7.9: Skip sync for status changes to avoid the 'Reload' effect
    if (payload?.table === 'profiles' && (payload?.new?.is_online !== undefined)) {
      console.log("[DriverSync] Status update received, skipping full refresh for UX.");
      return;
    }

    if (!isRefreshingRef.current) {
      manualSync(payload);
    }
  }, 'driver');

  // Sound notification logic
  useEffect(() => {
    // Only proceed if we have a previous count and new orders were actually added
    if (lastOrderCount !== null && orders.length > lastOrderCount) {
      // Since orders are sorted by created_at DESC, new orders are at the beginning
      const newOrders = orders.slice(0, orders.length - lastOrderCount);
      const hasNewPending = newOrders.some(o => o.status === 'pending');
      
      if (hasNewPending) {
        console.log("DriverPage: New pending order detected, playing sound...");
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
          audio.play().catch(e => console.warn("Audio play failed (normal browser behavior)", e));
          
          if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
            Haptics.notification({ type: NotificationType.Success }).catch(() => {});
          }
        } catch (e) {}
      }
    }
    setLastOrderCount(orders.length);
  }, [orders.length]);

  // Handle Camera Restore after OS kills activity
  useEffect(() => {
    const checkRestoredResult = async () => {
      if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
      
      const { App } = await import("@capacitor/app");
      await App.addListener('appRestoredResult', async (result) => {
        if (result.pluginId === 'Camera' && result.methodName === 'getPhoto' && result.data) {
          console.log("DriverPage: Restored Camera result detected!");
          // Driver doesn't usually upload photos in this specific view but 
          // keeping the infrastructure for future proofing/stability.
        }
      });
    };
    checkRestoredResult();
  }, []);

  const toggleActive = async () => {
    if (actionLoading) return;

    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
      
      const newStatus = !isActive;
      setActionLoading(true);
      
      // 1. Update UI and Local State immediately for responsiveness (Optimistic)
      // V17.7.9: Skip full re-render and prevent global sync loops
      setIsActive(newStatus);
      
      if (typeof window !== "undefined") {
        if (Capacitor.isNativePlatform()) {
          await Preferences.set({ key: 'driver_is_active', value: newStatus.toString() }).catch(() => {});
        } else {
          localStorage.setItem("driver_is_active", newStatus.toString());
        }
      }
      
      // 2. Background DB Update (V0.9.74 - NON-BLOCKING UI)
      if (driverId) {
        // V17.7.9: Use a SILENT update that doesn't trigger useSync's profile listener
        // to avoid the 'Reload' effect caused by immediate manualSync trigger.
        supabase.from('profiles').update({ 
          is_online: newStatus,
          updated_at: new Date().toISOString()
        }).eq('id', driverId).then(({ error }) => {
          if (error) console.warn("Online toggle: DB update failed", error);
        });
      }
      
      // V17.8.0: Ultra-fast unlock delay for zero-lag feel
      setTimeout(() => setActionLoading(false), 100);
      
    } catch (err) {
      console.error("Online toggle: Fatal error", err);
      setIsActive(!isActive); // Rollback UI on fatal catch
      setActionLoading(false);
      toastError("حدث خطأ أثناء تبديل الحالة");
    }
  };

  const toggleAutoAccept = async () => {
    const newAuto = !autoAccept;
    
    // If turning on, check if already at limit
    if (newAuto) {
      const currentCustomersCount = orders
        .filter(o => o.status === 'assigned' || o.status === 'in_transit')
        .reduce((acc, o) => acc + (Array.isArray(o.customers) ? o.customers.length : 1), 0);
      
      if (currentCustomersCount >= 3) {
        toastError("لا يمكنك تفعيل القبول التلقائي لأنك وصلت للحد الأقصى (3 عملاء).");
        return;
      }
      
      // V1.0.3: Force an immediate fetch when turning on to catch any pending orders
      fetchOrders(driverId || undefined);
    }

    setAutoAccept(newAuto);
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key: 'driver_auto_accept', value: newAuto.toString() }).catch(() => {});
    } else {
      localStorage.setItem('driver_auto_accept', newAuto.toString());
    }
    
    if (driverId) {
      try {
        const { error } = await supabase.from('profiles').update({ auto_accept: newAuto }).eq('id', driverId);
        if (error) throw error;
      } catch (err) {
        console.warn("Auto-accept: DB sync failed", err);
        // We keep local state updated anyway for better UX
      }
    }
  };

  // Manage Polling for Auto-Accept
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    // V1.0.3: Improved auto-accept polling - more robust and faster (3s)
    if (isActive && autoAccept && driverId) {
      console.log("Auto-accept: Poll active");
      interval = setInterval(async () => {
        try {
          // 1. Double check session validity before acting
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) return;

          // 2. Customer count check (Limit to 3)
          const currentCustomersCount = ordersRef.current
            .filter(o => o.status === 'assigned' || o.status === 'in_transit')
            .reduce((acc, o) => acc + (Array.isArray(o.customers) ? o.customers.length : 1), 0);

          if (currentCustomersCount >= 3) return;

          // 3. Find available orders from current memory
          const availableOrders = ordersRef.current.filter(o => o.status === 'pending' && !o.driverId);
          
          if (availableOrders.length > 0) {
            const firstOrder = availableOrders[0];
            
            // Limit check per specific order
            const orderCustomers = Array.isArray(firstOrder.customers) ? firstOrder.customers.length : 1;
            if (currentCustomersCount + orderCustomers > 3) return;

            console.log(`Auto-accept: Attempting to accept #${firstOrder.id.slice(0,8)}`);
            
            // Use updateOrderStatus for consistent logic
            const { error } = await updateOrderStatus(firstOrder.id, 'assigned', driverId);

            if (!error) {
              toastSuccess('تم القبول التلقائي للطلب #' + firstOrder.id.slice(0,8));
              // Trigger a sync to update UI immediately
              manualSync({ source: 'auto_accept' });
            }
          }
        } catch (err) {
          console.warn("Auto-accept poll failed", err);
        }
      }, 3000); // 3 seconds for better responsiveness
    }

    return () => {
      if (interval) {
        console.log("Auto-accept: Poll stopped");
        clearInterval(interval);
      }
    };
  }, [isActive, autoAccept, driverId]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!driverId) {
      toastError("فشل تحديد هوية الطيار. يرجى إعادة تسجيل الدخول.");
      return;
    }
    
    // 1. Check current customer count (limit to 3)
    const currentCustomersCount = orders
      .filter(o => o.status === 'assigned' || o.status === 'in_transit')
      .reduce((acc, o) => acc + (Array.isArray(o.customers) ? o.customers.length : 1), 0);

    if (currentCustomersCount >= 3) {
      toastError("لقد وصلت للحد الأقصى من العملاء (3). يرجى توصيل الطلبات الحالية أولاً.");
      return;
    }

    // Optimistic Update: Update UI immediately
    const originalOrders = [...orders];
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: 'assigned', priority: 2, driver_id: driverId } : o);
    setOrders(updatedOrders);
    setCache('driver_orders', updatedOrders); // Immediate cache update for native feel

    try {
      // V0.9.77: Using robust updateOrderStatus which handles race conditions in one step
      const { error: dbError } = await updateOrderStatus(orderId, 'assigned', driverId);

      if (dbError) throw dbError;
      
      toastSuccess("تم قبول الطلب بنجاح! توجه للمحل للاستلام.");
      
      // Update data in background (V0.9.77 - Non-blocking)
      void Promise.allSettled([fetchOrders(driverId), fetchStats(driverId)]);
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

    try {
      console.log("DriverPage: Updating order status to in_transit for", orderId);
      
      // V1.0.3: Using robust RPC with error checking
      const { data, error: dbError } = await supabase.rpc('handle_order_pickup', {
        p_order_id: orderId,
        p_driver_id: driverId
      });

      if (dbError) {
        console.error("DriverPage: RPC Error", dbError);
        throw dbError;
      }
      
      toastSuccess("تم استلام الطلب وتسجيله مالياً! في الطريق...");
      
      // Background Updates (Non-blocking)
      void Promise.allSettled([
        fetchOrders(driverId), 
        fetchStats(driverId),
        fetchActiveDebtOrders(driverId)
      ]);
    } catch (err: any) {
      console.error("DriverPage: handlePickupOrder failed", err);
      setOrders(originalOrders);
      // V1.0.3: More descriptive error message from DB if available
      toastError(err.message || "فشل تحديث الحالة. حاول مرة أخرى.");
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    if (!driverId) return;

    // Optimistic Update: Remove from active orders
    const originalOrders = [...orders];
    const updatedOrders = orders.filter(o => o.id !== orderId);
    setOrders(updatedOrders);
    setCache('driver_orders', updatedOrders);

    try {
      console.log("DriverPage: Delivering order", orderId);
      
      // V1.0.5: Using RPC for reliable delivery status update
      const { data, error: dbError } = await supabase.rpc('complete_order_driver', {
        p_order_id: orderId,
        p_driver_id: driverId
      });

      if (dbError) throw dbError;
      
      console.log("DriverPage: Delivered successfully", data);
      toastSuccess("تم التوصيل بنجاح! مبروك...");
      
      // Background Updates (Non-blocking)
      void Promise.allSettled([
        fetchOrders(driverId), 
        fetchStats(driverId),
        fetchActiveDebtOrders(driverId),
        fetchTodayHistory(driverId)
      ]);
    } catch (err: any) {
      console.error("DriverPage: handleDeliverOrder failed", err);
      setOrders(originalOrders);
      toastError(err.message || "فشل إتمام الطلب. حاول مرة أخرى.");
    }
  };

  const handleDeliverCustomer = async (orderId: string, customerIndex: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !order.customers) return;

    // V17.8.1: Stability Guard - Prevent double action
    if (actionLoading) return;
    setActionLoading(true);

    const newCustomers = [...order.customers];
    newCustomers[customerIndex] = {
      ...newCustomers[customerIndex],
      status: 'delivered',
      deliveredAt: new Date().toISOString()
    };

    // Update the local state first for responsiveness
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, customers: newCustomers } : o));

    try {
      // V17.8.1: ATOMIC UPDATE - Fetch fresh customer_details from DB to prevent data loss
      // if multiple drivers or sync events are happening.
      const { data: freshOrder, error: fetchError } = await supabase
        .from('orders')
        .select('customer_details')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const updatedDetails = {
        ...(freshOrder.customer_details || {}),
        customers: newCustomers
      };

      const { error } = await supabase.from('orders').update({ 
        customer_details: updatedDetails
      }).eq('id', orderId);

      if (error) throw error;
      toastSuccess(`تم تسليم العميل ${newCustomers[customerIndex].name} بنجاح`);
    } catch (err: any) {
      console.error('Deliver customer failed:', err);
      // Rollback UI on error
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, customers: order.customers } : o));
      toastError("فشل تحديث حالة العميل: " + (err.message || "خطأ غير معروف"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    try {
      // V0.9.77: Non-blocking background sync
      const { data, error } = await supabase.rpc('confirm_driver_payment', {
        p_order_id: orderId,
        p_driver_id: driverId
      });

      if (error) throw error;
      
      toastSuccess("تم تأكيد تسليم المبلغ للمحل بنجاح");
      
      // Update local state immediately
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, driverConfirmedAt: new Date().toISOString() } : o));
      
      // Background refreshes
      void fetchActiveDebtOrders(driverId!);
      void fetchStats(driverId!);
    } catch (err: any) {
      console.error("Error confirming payment:", err);
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
      console.error("Settlement error:", err);
    } finally {
      setRequestingSettlement(false);
    }
  };

  // V17.7.5: Robust Error Recovery
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center" dir="rtl">
        <AlertCircle className="w-16 h-16 text-red-500 mb-6 opacity-50" />
        <h1 className="text-xl font-black text-white mb-2">عذراً، حدث خطأ غير متوقع</h1>
        <p className="text-slate-400 text-xs mb-8">واجه النظام مشكلة تقنية مفاجئة في واجهة الطيار.</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full max-w-xs bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all"
        >
          إعادة محاولة التشغيل
        </button>
      </div>
    );
  }

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
                    لضمان استمرار التتبع في الخلفية: يرجى تعطيل "تحسين البطارية" (Battery Optimization) لتطبيق ستارت من إعدادات الهاتف.
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

        {/* Background Gradients for Glass Effect */}
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
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
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
                      <DriverHistoryView 
                        history={todayHistory} 
                        onPreviewImage={setPreviewUrl}
                      />
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
            onSelectSettings={() => { setActiveTab("settings"); setShowDrawer(false); }}
            onSignOut={handleSignOut}
            onOpenAI={() => {
              if (orders.length > 0) {
                handleRequestAIHelp(orders[0]);
              } else {
                setShowAIHelper(true);
                setAIAnalysis(null);
              }
            }}
            driverName={driverName}
            activeView={activeTab}
          />

        <ImagePreviewModal
          url={previewUrl}
          show={!!previewUrl}
          onClose={() => setPreviewUrl(null)}
        />

        {/* V1.4.2: AI Helper Modal */}
        <AnimatePresence>
          {showAIHelper && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAIHelper(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-0 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-purple-600 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black leading-tight">مساعد الملاحة الذكي</h3>
                      <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">AI Co-pilot Chat</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAIHelper(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Chat Messages Area */}
                <div 
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px] bg-slate-50 dark:bg-slate-950"
                >
                  {/* Initial Analysis Result (if exists) */}
                  {aiAnalysis && (
                    <div className="flex flex-col gap-2">
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-2xl rounded-tr-none self-start max-w-[85%]">
                        <p className="text-xs font-bold text-purple-900 dark:text-purple-300 leading-relaxed text-right">
                          {aiAnalysis.content}
                        </p>
                      </div>
                      {aiAnalysis.ai_meta?.navigation_tips && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-2 max-w-[85%] self-start">
                          <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-relaxed">
                            {aiAnalysis.ai_meta.navigation_tips}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat History */}
                  {chatMessages.map((msg, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: msg.role === 'user' ? -10 : 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`p-4 rounded-2xl max-w-[85%] text-xs font-bold leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-tl-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tr-none'
                      }`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing Indicator */}
                  {isAISending && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tr-none border border-slate-100 dark:border-slate-700 shadow-sm flex gap-1">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input Area */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={startVoiceInput}
                      disabled={isAISending}
                      className={`p-4 rounded-2xl transition-all ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendAIChat()}
                        placeholder="اسألني أي شيء..."
                        disabled={isAISending}
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 pr-4 pl-12 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 ring-purple-500/50 transition-all"
                      />
                      <button 
                        onClick={() => handleSendAIChat()}
                        disabled={!chatInput.trim() || isAISending}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-xl disabled:opacity-50 disabled:grayscale transition-all"
                      >
                        {isAISending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Settlement Modal */}
        <AnimatePresence>
          {showSettlementModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettlementModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl overflow-hidden"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">تأكيد سداد مديونية</h3>
                      <p className="text-xs font-bold text-slate-400">إرسال طلب تأكيد سداد للشركة</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSettlementModal(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">المبلغ المسدد (ج.م)</label>
                    <input 
                      type="number" 
                      value={settlementAmount}
                      onChange={(e) => setSettlementAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent border-none outline-none text-3xl font-black text-slate-900 placeholder:text-slate-200"
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <Wallet className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-blue-700 leading-relaxed">
                      يرجى إدخال المبلغ الذي قمت بتحويله للشركة فعلياً. سيقوم المسؤول بمراجعة الطلب وتأكيده لتصفير مديونيتك.
                    </p>
                  </div>

                  <button 
                    onClick={handleRequestSettlement}
                    disabled={requestingSettlement || !settlementAmount}
                    className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {requestingSettlement ? <Loader2 className="w-6 h-6 animate-spin" /> : "إرسال طلب التأكيد"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AuthGuard>
  );
}

