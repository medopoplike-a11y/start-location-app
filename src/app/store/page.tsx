"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CardSkeleton, OrderSkeleton } from "@/components/ui/Skeleton";
import { 
  Plus
} from "lucide-react";

import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { calculateOrderFinancials, calculateDeliveryFee } from "@/lib/pricing";
import { getCurrentUser, getUserProfile, signOut, updateUserProfile } from "@/lib/auth";
import { getVendorOrders, createOrder, updateOrder, vendorCollectDebt, cancelOrder } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { getCache, setCache } from "@/lib/native-utils";
import AuthGuard from "@/components/AuthGuard";
import Toast from "@/components/Toast";
import { useSync } from "@/hooks/useSync";
import { useToast } from "@/hooks/useToast";
import type { Order, VendorLocation, OnlineDriver, SettlementHistoryItem, VendorDBOrder } from "./types";
import { formatVendorTime } from "./utils";
import StoreHeader from "./components/StoreHeader";
import StoreOrdersHub from "./components/StoreOrdersHub";
import WalletView from "./components/WalletView";
import StoreSettingsView from "./components/SettingsView";
import StoreDrawer from "./components/StoreDrawer";
import OrderFormView from "./components/OrderFormView";
import StoreAccountModals from "./components/StoreAccountModals";
import CameraScanner from "@/components/CameraScanner";

export default function StoreApp() {
  return (
    <AuthGuard allowedRoles={["vendor", "admin"]}>
      <StoreContent />
    </AuthGuard>
  );
}

function StoreContent() {
  const router = useRouter();
  const { toasts, removeToast, success, error } = useToast();
  
  const { user, profile: authProfile, loading: authLoading } = useAuth();

  // Basic State
  const [vendorId, setVendorId] = useState<string | null>(null);
  const vendorIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    vendorIdRef.current = vendorId;
  }, [vendorId]);
  const [vendorName, setVendorName] = useState("محل");
  const [vendorLocation, setVendorLocation] = useState<VendorLocation | null>(null);
  const [activeView, setActiveView] = useState<"store" | "wallet" | "settings" | "order-form">("store");
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [balance, setBalance] = useState(0);
  const [companyCommission, setCompanyCommission] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Handle Body Scroll Lock when drawer is open
  useEffect(() => {
    if (showDrawer) {
      document.body.classList.add('scroll-lock');
    } else {
      document.body.classList.remove('scroll-lock');
    }
    return () => document.body.classList.remove('scroll-lock');
  }, [showDrawer]);

  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showLiveMap] = useState(false);
  const [activityLog, setActivityLog] = useState<{id: string, text: string, time: string}[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [showInAppCamera, setShowInAppCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<"form" | "quick">("form");
  const [activeCaptureIndex, setActiveCaptureIndex] = useState<number | null>(null);
  const [quickUploadOrderId, setQuickUploadOrderId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer: "",
    phone: "",
    address: "",
    orderValue: "",
    deliveryFee: "30",
    notes: "",
    prepTime: "15",
    customerCoords: null as { lat: number, lng: number } | null,
    customers: [] as Array<{
      name: string;
      phone: string;
      address: string;
      orderValue: string;
      deliveryFee: string;
      prepTime: string;
      invoiceUrl?: string;
      isUploading?: boolean;
    }>
  });

  // KeepAwake: Prevent screen from turning off in Store view
  useEffect(() => {
    if (activeView === "store" && typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      KeepAwake.keepAwake().catch(() => {});
      return () => {
        KeepAwake.allowSleep().catch(() => {});
      };
    }
  }, [activeView]);

  // Persistence: Save form state to Native Preferences (more reliable than localStorage)
  useEffect(() => {
    const saveState = async () => {
      if (activeView === "order-form") {
        const state = JSON.stringify({ formData, editingOrder, invoiceUrl, showOrderForm: true });
        if (Capacitor.isNativePlatform()) {
          await Preferences.set({ key: 'pending_order_form_v2', value: state });
        } else {
          localStorage.setItem('pending_order_form_v2', state);
        }
      } else {
        if (Capacitor.isNativePlatform()) {
          await Preferences.remove({ key: 'pending_order_form_v2' });
        } else {
          localStorage.removeItem('pending_order_form_v2');
        }
      }
    };
    saveState();
  }, [formData, editingOrder, invoiceUrl, activeView]);

  // Persistence: Restore form state
  useEffect(() => {
    const restoreState = async () => {
      let saved = null;
      if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key: 'pending_order_form_v2' });
        saved = value;
      } else {
        saved = localStorage.getItem('pending_order_form_v2');
      }

      if (saved) {
        try {
          const { formData: sFormData, editingOrder: sEditingOrder, invoiceUrl: sInvoiceUrl, showOrderForm: sShowOrderForm } = JSON.parse(saved);
          if (sShowOrderForm) {
            setFormData(sFormData);
            setEditingOrder(sEditingOrder);
            setInvoiceUrl(sInvoiceUrl);
            setActiveView("order-form");
          }
        } catch (e) {
          console.error("Failed to restore form state", e);
        }
      }
    };
    restoreState();
  }, []);

  // Handle Camera Restore after OS kills activity
  useEffect(() => {
    const checkRestoredResult = async () => {
      if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
      
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener('appRestoredResult', async (result) => {
        if (result.pluginId === 'Camera' && result.methodName === 'getPhoto' && result.data) {
          console.log("StorePage: Restored Camera result detected!");
          
          // Wait for vendorId if not yet available
          let attempts = 0;
          while (!vendorIdRef.current && attempts < 15) {
            await new Promise(r => setTimeout(r, 600));
            attempts++;
          }

          if (!vendorIdRef.current) {
            console.error("StorePage: Could not restore camera result, vendorId not found");
            return;
          }

          if (result.data.webPath) {
            try {
              // Check if it was a quick upload
              const { value: quickOrderId } = await Preferences.get({ key: 'pending_quick_upload_id' });
              
              if (quickOrderId) {
                console.log("StorePage: Restoring Quick Upload for order:", quickOrderId);
                await processQuickUpload(result.data.webPath, quickOrderId);
              } else {
                console.log("StorePage: Restoring Modal Upload");
                const response = await fetch(result.data.webPath);
                const blob = await response.blob();
                const file = new File([blob], `restored-camera-${Date.now()}.jpg`, { type: "image/jpeg" });
                await processUpload(file);
              }
            } catch (err) {
              console.error("Failed to process restored camera image", err);
              error("فشل استعادة ومعالجة الصورة");
            } finally {
              await Preferences.remove({ key: 'pending_quick_upload_id' });
            }
          }
        }
      });
      return () => handle.remove();
    };
    checkRestoredResult();
  }, []); // Only once on mount

  const [settingsData, setSettingsData] = useState({ name: "", phone: "", area: "" });

  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);

  // useSync hook for real-time updates
  useSync(vendorId || undefined, () => {
    if (vendorId) {
      updateData(vendorId);
    }
  });

  // Sound notification logic
  useEffect(() => {
    // Only proceed if we have a previous count and new orders were actually added
    if (lastOrderCount !== null && orders.length > lastOrderCount) {
      // Since orders are sorted by created_at DESC, new orders are at the beginning
      const newOrders = orders.slice(0, orders.length - lastOrderCount);
      const hasNewPending = newOrders.some(o => o.status === 'pending');
      
      if (hasNewPending) {
        console.log("StorePage: New pending order detected, playing sound...");
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
          audio.play().catch(e => console.warn("Audio play failed (normal browser behavior)", e));
          
          if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
            import("@capacitor/haptics").then(({ Haptics, ImpactStyle }) => {
              Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
            }).catch(() => {});
          }
        } catch (audioErr) {
          console.error("StorePage: Audio playback error", audioErr);
        }
      }
    }
    setLastOrderCount(orders.length);
  }, [orders]);

  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [requestingSettlement, setRequestingSettlement] = useState(false);
  const [settlementHistory, setSettlementHistory] = useState<SettlementHistoryItem[]>([]);

  const [appConfig, setAppConfig] = useState({ 
    driver_commission: 15, 
    vendor_commission: 20, 
    vendor_commission_type: 'percentage' as 'percentage' | 'fixed',
    vendor_commission_value: 0,
    vendor_fee: 1, 
    safe_ride_fee: 1,
    surge_pricing_active: false,
    surge_pricing_multiplier: 1.0
  });

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

  // Initialization & Auth Check
  useEffect(() => {
    console.log("StorePage: Init effect started", { authLoading, hasUser: !!user, hasProfile: !!authProfile });
    let isMounted = true;
    
    // Radical Fix: Automatic rescue if stuck in loading for too long
    const hardFallback = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("StorePage: Hard fallback triggered (timeout) - Forcing stop loading");
        setLoading(false);
      }
    }, 15000);

    const init = async () => {
      // 1. Load cached data for instant display
      const [cachedName, cachedOrders, cachedBalance] = await Promise.all([
        getCache<string>('vendor_name'),
        getCache<Order[]>('vendor_orders'),
        getCache<number>('vendor_balance')
      ]);
      
      if (cachedName) setVendorName(cachedName);
      if (cachedOrders && cachedOrders.length > 0) {
        setOrders(cachedOrders);
        setLoading(false); // Hide loader if we have data
      }
      if (cachedBalance !== null) setBalance(cachedBalance);

      if (authLoading) return;

      try {
        const currentUser = user || await withTimeout('getCurrentUser', getCurrentUser(), 5000).catch(() => null);
        if (!currentUser || !isMounted) {
          console.log("StorePage: No user found in init, letting AuthGuard handle it");
          if (isMounted) setLoading(false);
          return;
        }

        const profile = authProfile || await withTimeout('getUserProfile', getUserProfile(currentUser.id), 5000).catch(() => null);
        console.log("StorePage: Profile fetched", { role: profile?.role });

        if (profile && isMounted) {
          const role = (profile.role || '').toLowerCase();
          if (role !== 'vendor' && role !== 'admin') {
            console.warn("StorePage: Unauthorized role", role);
            if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
              window.location.assign("/login");
            } else {
              router.replace("/login");
            }
            return;
          }

          setVendorId(currentUser.id);
          setVendorName(profile.full_name || "محل");
          
          let loc = profile.location;
          if (typeof loc === 'string') {
            try { loc = JSON.parse(loc); } catch { loc = null; }
          }
          setVendorLocation((loc as VendorLocation | undefined) || null);
          
          setSettingsData({ 
            name: profile.full_name || "", 
            phone: profile.phone || "",
            area: profile.area || ""
          });

          // Update appConfig with vendor's specific commission
          setAppConfig(prev => ({
            ...prev,
            vendor_commission_type: (profile as any).commission_type || 'percentage',
            vendor_commission_value: (profile as any).commission_value || 0,
            vendor_commission: (profile as any).commission_type === 'percentage' ? ((profile as any).commission_value || 20) : prev.vendor_commission
          }));
          
          console.log("StorePage: Fetching dashboard data...");
          await updateData(currentUser.id).catch(err => console.error("Initial updateData failed", err));

          // Fetch config
          try {
            const { data: configData } = await supabase.from('app_config').select('*').maybeSingle();
            if (configData && isMounted) {
              setAppConfig({
                driver_commission: configData.driver_commission || 15,
                vendor_commission: configData.vendor_commission || 20,
                vendor_fee: configData.vendor_fee || 1,
                safe_ride_fee: configData.safe_ride_fee || 1,
                surge_pricing_active: !!configData.surge_pricing_active,
                surge_pricing_multiplier: configData.surge_pricing_multiplier || 1.0
              });
            }
          } catch (configErr) {
            console.error("Fetch config failed", configErr);
          }
        } else {
          console.error("StorePage: No profile found for user", currentUser.id);
          // Don't hang forever if profile missing
          if (isMounted) setLoading(false);
        }
      } catch (e) {
        console.error("StorePage: Init error", e);
      } finally {
        if (isMounted) {
          clearTimeout(hardFallback);
          setLoading(false);
        }
      }
    };

    init();
    return () => {
      isMounted = false;
      clearTimeout(hardFallback);
    };
  }, [user, authProfile, authLoading, router]);

  useEffect(() => {
    if (!orders || !Array.isArray(orders)) return;
    const pendingCollection = orders.reduce((acc, order) => {
      if ((order.status === "delivered" || order.status === "in_transit") && !order.vendorCollectedAt) {
        const amount = Number(order.amount?.replace(/[^0-9.-]+/g, "") || 0);
        return acc + (isNaN(amount) ? 0 : amount);
      }
      return acc;
    }, 0);
    setBalance(pendingCollection);
  }, [orders]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateData = async (uid: string) => {
    if (!uid || isSyncing) return;
    
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSyncing(true);
    setLastSync(new Date());

    const safetyTimeout = setTimeout(() => {
      setIsSyncing(false);
      abortControllerRef.current = null;
    }, 12000);

    try {
      const [dbOrders, walletRes, settlementsRes, driversRes] = await Promise.allSettled([
        getVendorOrders(uid),
        supabase.from('wallets').select('system_balance').eq('user_id', uid).single(),
        supabase.from('settlements').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'driver').eq('is_online', true)
      ]);

      if (dbOrders.status === 'fulfilled' && dbOrders.value) {
        setOrders(dbOrders.value.map(mapDBOrderToUI));
        
        // حساب العمولة المستحقة محلياً كاحتياطي في حال تأخر تحديث قاعدة البيانات
        const calculatedCommission = dbOrders.value
          .filter((o: any) => o.status === 'delivered' && !o.vendor_collected_at)
          .reduce((sum: number, o: any) => {
            const vndComm = o.financials?.vendor_commission || 0;
            const insFee = o.financials?.insurance_fee || 0;
            return sum + vndComm + (insFee / 2);
          }, 0);
        
        setCompanyCommission(calculatedCommission);
      }

      // إذا كانت قيمة المحفظة في قاعدة البيانات موجودة، نستخدم القيمة الأكبر لضمان الدقة
      if (walletRes.status === 'fulfilled' && walletRes.value.data) {
        const dbBalance = walletRes.value.data.system_balance || 0;
        setCompanyCommission(prev => Math.max(prev, dbBalance));
      }

      if (settlementsRes.status === 'fulfilled' && settlementsRes.value.data) {
        setSettlementHistory(settlementsRes.value.data.map(s => ({
          id: s.id,
          amount: s.amount,
          status: s.status === 'approved' ? "تم السداد" : s.status === 'pending' ? "جاري المراجعة" : "مرفوض",
          date: s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : "تاريخ غير معروف"
        })));
      }

      if (driversRes.status === 'fulfilled' && driversRes.value.data) {
        const drivers = driversRes.value.data
          .map((d) => {
            let loc = d.location;
            if (typeof loc === 'string') {
              try { loc = JSON.parse(loc); } catch { loc = null; }
            }
            return {
              id: d.id,
              name: d.full_name || "سائق",
              lat: (loc as any)?.lat,
              lng: (loc as any)?.lng
            };
          })
          .filter((d): d is OnlineDriver => typeof d.lat === "number" && typeof d.lng === "number");
        setOnlineDrivers(drivers);
      }
    } catch (err) {
      console.error("VendorPage: Update error", err);
    } finally {
      clearTimeout(safetyTimeout);
      setIsSyncing(false);
    }
  };

  // --- Logic Helpers ---
  const handleCancelOrder = async (orderId: string) => {
    try {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    } catch (e) {}
    
    // Safety check for confirm on native
    const shouldCancel = typeof window !== 'undefined' && window.confirm ? window.confirm('هل أنت متأكد من إلغاء الطلب؟') : true;
    if (!shouldCancel) return;

    // Optimistic Update
    const originalOrders = [...orders];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    success('تم إلغاء الطلب بنجاح');

    try {
      const { error: cancelErr } = await cancelOrder(orderId);
      if (cancelErr) throw cancelErr;
      
      if (vendorId) updateData(vendorId);
    } catch (err) {
      setOrders(originalOrders);
      error('خطأ في الإلغاء. حاول مرة أخرى.');
    }
  };

  const mapDBOrderToUI = (db: VendorDBOrder): Order => {
    // Robust mapping with safety checks
    const financials = db.financials || { order_value: 0, delivery_fee: 0 };
    const customerDetails = db.customer_details || { name: "عميل", address: "عنوان غير محدد" };

    return {
      id: db.id,
      customer: customerDetails.name || "عميل",
      phone: (customerDetails as any).phone || "",
      address: customerDetails.address || "عنوان غير محدد",
      status: db.status || 'pending',
      driver: db.driver?.full_name || (db.driver_id ? "كابتن (جاري التحديث...)" : null),
      driverPhone: db.driver?.phone || "",
      amount: `${financials.order_value || 0} ج.م`,
      deliveryFee: `${financials.delivery_fee || 0} ج.م`,
      time: formatVendorTime(db.created_at || ""),
      createdAt: db.created_at || new Date().toISOString(),
      isPickedUp: db.status === 'in_transit' || db.status === 'delivered',
      notes: (customerDetails as any).notes || "",
      prepTime: String((financials as any).prep_time || "15"),
      invoiceUrl: db.invoice_url,
      vendorCollectedAt: db.vendor_collected_at,
      driverConfirmedAt: db.driver_confirmed_at,
      customers: customerDetails.customers,
      financials: db.financials ? {
        order_value: Number(financials.order_value || 0),
        delivery_fee: Number(financials.delivery_fee || 0),
        system_commission: Number((financials as any).system_commission || 0),
        vendor_commission: Number((financials as any).vendor_commission || 0),
        driver_earnings: Number((financials as any).driver_earnings || 0),
        insurance_fee: Number((financials as any).insurance_fee || 0),
        prep_time: String((financials as any).prep_time || "15"),
      } : undefined,
    };
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const handleUpdateProfile = async () => {
    if (!vendorId) return;
    setSavingSettings(true);
    const { error: dbError } = await updateUserProfile(vendorId, {
      full_name: settingsData.name,
      phone: settingsData.phone,
      area: settingsData.area
    });
    if (!dbError) {
      setVendorName(settingsData.name);
      success("تم تحديث الملف الشخصي بنجاح!");
      setActiveView("store");
    } else {
      error("حدث خطأ أثناء تحديث الملف الشخصي.");
    }
    setSavingSettings(false);
  };

  const handlePickCustomerLocation = () => {
    if (!navigator.geolocation) return error("متصفحك لا يدعم تحديد الموقع.");
    navigator.geolocation.getCurrentPosition((position) => {
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setFormData(prev => {
        let fee = prev.deliveryFee;
        if (vendorLocation) {
          const dist = calculateDistance(vendorLocation.lat, vendorLocation.lng, coords.lat, coords.lng);
          fee = Math.ceil(calculateDeliveryFee(dist)).toString();
        }
        return { ...prev, customerCoords: coords, deliveryFee: fee };
      });
      success("تم تحديد موقع العميل بنجاح!");
    }, () => error("فشل تحديد الموقع. تأكد من تفعيل الـ GPS."));
  };

  const handleOpenForm = async (order: Order | null = null) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
    } catch(e) {}
    if (order) {
      setEditingOrder(order);
      setInvoiceUrl(order.invoiceUrl || null);
      setFormData({
        customer: order.customer,
        phone: order.phone || "",
        address: order.address,
        orderValue: order.amount.replace(/[^0-9.-]+/g, ""),
        deliveryFee: order.deliveryFee.replace(/[^0-9.-]+/g, ""),
        notes: order.notes || "",
        prepTime: order.prepTime || "15",
        customerCoords: null,
        customers: order.customers ? order.customers.map((c, i) => ({
          id: (c as any).id || Math.random().toString(36).substring(2, 9),
          name: c.name,
          phone: c.phone || "",
          address: c.address,
          orderValue: String(c.orderValue),
          deliveryFee: String(c.deliveryFee),
          prepTime: String((c as any).prepTime || order.prepTime || "15"),
          invoiceUrl: c.invoice_url
        })) : [{
          id: Math.random().toString(36).substring(2, 9),
          name: order.customer,
          phone: order.phone || "",
          address: order.address,
          orderValue: order.amount.replace(/[^0-9.-]+/g, ""),
          deliveryFee: order.deliveryFee.replace(/[^0-9.-]+/g, ""),
          prepTime: order.prepTime || "15",
          invoiceUrl: order.invoiceUrl
        }]
      });
    } else {
      setEditingOrder(null);
      setInvoiceUrl(null);
      setFormData({ 
        customer: "", 
        phone: "", 
        address: "", 
        orderValue: "", 
        deliveryFee: "30", 
        notes: "", 
        prepTime: "15", 
        customerCoords: null,
        customers: [{ 
          id: Math.random().toString(36).substring(2, 9),
          name: "", phone: "", address: "", orderValue: "", deliveryFee: "30", prepTime: "15", invoiceUrl: "" 
        }]
      });
    }
    setShowOrderForm(false);
    setActiveView("order-form");
  };

  const handleSaveOrder = async () => {
    if (!vendorId) return;
    setIsSavingOrder(true);
    try {
      let distance = 2.5; 
      if (vendorLocation?.lat && formData.customerCoords) {
        distance = Math.round(calculateDistance(vendorLocation.lat, vendorLocation.lng, formData.customerCoords.lat, formData.customerCoords.lng) * 10) / 10;
      }

      // Use the new multi-stop pricing calculation
      const manualDeliveryFees = formData.customers.map(c => Number(c.deliveryFee) || 0);
      const calculated = calculateOrderFinancials(
        formData.customers.length,
        manualDeliveryFees,
        {
          driverCommissionPct: appConfig.driver_commission,
          vendorCommissionPct: appConfig.vendor_commission,
          vendorCommissionFixed: appConfig.vendor_commission_value,
          vendorCommissionType: appConfig.vendor_commission_type,
          driverInsuranceFee: appConfig.safe_ride_fee,
          vendorInsuranceFee: appConfig.vendor_fee,
          surgePricingActive: appConfig.surge_pricing_active,
          surgePricingMultiplier: appConfig.surge_pricing_multiplier
        }
      );

      const totalOrderValue = formData.customers.reduce((acc, c) => acc + (Number(c.orderValue) || 0), 0);
      const totalDeliveryFee = formData.customers.reduce((acc, c) => acc + (Number(c.deliveryFee) || 0), 0);
      const maxPrepTime = formData.customers.reduce((max, c) => Math.max(max, Number(c.prepTime) || 0), 0) || Number(formData.prepTime) || 15;

      const orderData = {
        vendor_id: vendorId,
        driver_id: null,
        status: 'pending' as const,
        distance,
        customer_details: { 
          name: formData.customers[0]?.name || "سكة", // Default for legacy support
          phone: formData.customers[0]?.phone || "",
          address: formData.customers[0]?.address || "",
          notes: formData.notes, 
          coords: formData.customerCoords,
          customers: formData.customers.map(c => ({
            name: c.name,
            phone: c.phone,
            address: c.address,
            orderValue: Number(c.orderValue),
            deliveryFee: Number(c.deliveryFee),
            prepTime: c.prepTime,
            status: 'pending' as const,
            invoice_url: c.invoiceUrl
          }))
        },
        financials: { 
          order_value: totalOrderValue, 
          delivery_fee: totalDeliveryFee, 
          prep_time: String(maxPrepTime), 
          system_commission: calculated.systemCommission, 
          vendor_commission: calculated.vendorCommission,
          driver_earnings: calculated.driverEarnings, 
          insurance_fee: calculated.insuranceFundTotal 
        },
        invoice_url: invoiceUrl || undefined
      };

      const action = editingOrder ? updateOrder(editingOrder.id, orderData) : createOrder(orderData);
      const { data, error: dbError } = await action;
      if (dbError) {
        error(`خطأ: ${dbError.message}`);
        return; 
      }
      if (data) {
        const ui = mapDBOrderToUI(data as VendorDBOrder);
        setOrders(prev => editingOrder ? prev.map(o => o.id === ui.id ? ui : o) : [ui, ...prev]);
        setActiveView("store");
        success(editingOrder ? "تم تعديل السكة بنجاح" : "تم إنشاء سكة جديدة بنجاح");
        addActivityLocal(editingOrder ? "تم تعديل السكة" : "تم إنشاء سكة جديدة");
      }
    } catch (err) {
      error("حدث خطأ أثناء حفظ الطلب. حاول مرة أخرى.");
      console.error("Order save error:", err);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleCollectDebt = async (orderId: string) => {
    // Optimistic Update
    const originalOrders = [...orders];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, vendorCollectedAt: new Date().toISOString() } : o));
    success(`تم تحصيل قيمة الطلب #${orderId.slice(0, 8)} بنجاح`);

    try {
      const { error: dbError } = await vendorCollectDebt(orderId);
      if (dbError) throw dbError;
      
      addActivityLocal(`تم تحصيل قيمة الطلب #${orderId.slice(0, 8)}`);
      if (vendorId) {
        updateData(vendorId);
      }
    } catch (err) {
      setOrders(originalOrders);
      error("حدث خطأ أثناء تأكيد التحصيل.");
    }
  };

  const handleCameraCapture = async (customerIndex?: number) => {
    setCameraMode("form");
    setActiveCaptureIndex(customerIndex !== undefined ? customerIndex : null);
    setShowInAppCamera(true);
  };

  const handleQuickInvoiceUpload = async (order: Order) => {
    setQuickUploadOrderId(order.id);
    setCameraMode("quick");
    setActiveCaptureIndex(null);
    setShowInAppCamera(true);
  };

  const handleInAppCapture = async (base64Data: string) => {
    const timestamp = Date.now();
    // Convert base64 to Uint8Array
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const uint8Array = new Uint8Array(byteNumbers);
    
    if (cameraMode === "form") {
      // If we have an activeCaptureIndex, update the specific customer
      if (activeCaptureIndex !== null) {
        setFormData(prev => {
          const newCustomers = [...prev.customers];
          if (newCustomers[activeCaptureIndex]) {
            newCustomers[activeCaptureIndex] = { ...newCustomers[activeCaptureIndex], isUploading: true };
          }
          return { ...prev, customers: newCustomers };
        });
      } else {
        setUploadingInvoice(true);
      }

      try {
        const currentVendorId = vendorIdRef.current || user?.id;
        if (!currentVendorId) throw new Error("معرف المتجر غير متوفر");

        const fileName = `${currentVendorId}/${timestamp}${activeCaptureIndex !== null ? `_cust_${activeCaptureIndex}` : ''}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(fileName, uint8Array, {
            contentType: 'image/jpeg',
            cacheControl: '3600'
          });
        
        if (uploadError) throw new Error(uploadError.message);
        
        const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName);
        
        if (activeCaptureIndex !== null) {
          setFormData(prev => {
            const newCustomers = [...prev.customers];
            if (newCustomers[activeCaptureIndex]) {
              newCustomers[activeCaptureIndex] = { 
                ...newCustomers[activeCaptureIndex], 
                invoiceUrl: publicUrl,
                isUploading: false 
              };
            }
            return { ...prev, customers: newCustomers };
          });
        } else {
          setInvoiceUrl(publicUrl);
        }
        success("تم التقاط ورفع الفاتورة بنجاح");
      } catch (err: any) {
        error(`فشل رفع الفاتورة: ${err.message}`);
        if (activeCaptureIndex !== null) {
          setFormData(prev => {
            const newCustomers = [...prev.customers];
            if (newCustomers[activeCaptureIndex]) {
              newCustomers[activeCaptureIndex] = { ...newCustomers[activeCaptureIndex], isUploading: false };
            }
            return { ...prev, customers: newCustomers };
          });
        }
      } finally {
        setUploadingInvoice(false);
        setActiveCaptureIndex(null);
        setQuickUploadOrderId(null);
        setShowInAppCamera(false);
      }
    } else if (cameraMode === "quick" && quickUploadOrderId) {
      setUploadingInvoice(true);
      try {
        const currentVendorId = vendorIdRef.current || user?.id;
        if (!currentVendorId) throw new Error("معرف المتجر غير متوفر");

        const fileName = `${currentVendorId}/${timestamp}_quick_${quickUploadOrderId}.jpg`;
        console.log("Attempting quick upload to storage:", fileName);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(fileName, uint8Array, {
            contentType: 'image/jpeg', 
            cacheControl: '3600'
          });
        
        if (uploadError) {
          console.error("Quick Storage upload error:", uploadError);
          throw new Error(uploadError.message || "خطأ في تخزين الصورة");
        }
        
        const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName);
        const { error: updateError } = await updateOrder(quickUploadOrderId, { invoice_url: publicUrl });
        if (updateError) throw updateError;
        
        setOrders(prev => prev.map(o => o.id === quickUploadOrderId ? { ...o, invoiceUrl: publicUrl } : o));
        success("تم تحديث الطلب بالفاتورة بنجاح");
      } catch (err: any) {
        console.error("Quick in-app upload error details:", err);
        const errorMsg = err.message || JSON.stringify(err);
        error(`فشل رفع الفاتورة السريع: ${errorMsg}`);
      } finally {
        setUploadingInvoice(false);
        setQuickUploadOrderId(null);
        setShowInAppCamera(false);
      }
    }
  };

  const handleUpdateLocation = async () => {
    if (!vendorId) return;
    setUpdatingLocation(true);
    const getLocation = (opt: PositionOptions) => new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, opt));
    try {
      let pos;
      try { pos = await getLocation({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }); }
      catch { pos = await getLocation({ enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }); }
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const { error: dbError } = await supabase.from('profiles').update({ location: loc }).eq('id', vendorId);
      if (dbError) throw dbError;
      setVendorLocation(loc);
      success("تم تحديث موقع المحل بنجاح!");
    } catch {
      error("فشل تحديد الموقع. تأكد من تفعيل الـ GPS.");
    } finally {
      setUpdatingLocation(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return setPasswordError("كلمات السر غير متطابقة");
    if (newPassword.length < 6) return setPasswordError("كلمة السر يجب أن تكون 6 أحرف على الأقل");
    setChangingPassword(true);
    const { error: dbError } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (dbError) setPasswordError(dbError.message);
    else { 
      setShowPasswordModal(false); 
      setNewPassword(""); 
      setConfirmPassword(""); 
      setPasswordError("");
      success("تم تغيير كلمة السر بنجاح!");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const addActivityLocal = (text: string) => {
    setActivityLog(prev => [{
      id: Math.random().toString(36).substring(2, 11),
      text,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }, ...prev].slice(0, 3));
  };

  const handleRequestSettlement = async () => {
    if (!vendorId || !settlementAmount) return error("الرجاء إدخال المبلغ المراد سداده");
    setRequestingSettlement(true);
    try {
      const { error: dbError } = await supabase.from('settlements').insert([{ user_id: vendorId, amount: Number(settlementAmount), status: 'pending', method: 'Vodafone Cash' }]);
      if (dbError) throw dbError;
      success("تم إرسال طلب التسوية بنجاح. سيتم السداد قريباً.");
      setShowSettlementModal(false);
      setSettlementAmount("");
      if (vendorId) updateData(vendorId);
    } catch (err) {
      error("حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.");
      console.error("Settlement error:", err);
    } finally {
      setRequestingSettlement(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f3f4f6] p-6 space-y-8" dir="rtl">
      <div className="bg-white/40 h-16 rounded-2xl animate-pulse mb-6" />
      <div className="grid grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <CardSkeleton className="mt-4" />
      <div className="space-y-4 mt-8">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        <OrderSkeleton />
        <OrderSkeleton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col font-sans selection:bg-brand-orange/10" dir="rtl">
      <div className="silver-live-bg" />
    <Toast toasts={toasts} onRemove={removeToast} />
      
      <StoreHeader
        vendorName={vendorName}
        lastSync={lastSync}
        isSyncing={isSyncing}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenDrawer={() => setShowDrawer(true)}
        onSync={() => vendorId && updateData(vendorId)}
        onResetSync={() => setIsSyncing(false)}
        isSurgeActive={appConfig.surge_pricing_active}
      />

      <main className="p-4 space-y-6 pb-24 min-h-full">
        {activeView === "store" ? (
          <StoreOrdersHub
            orders={orders}
            searchQuery={searchQuery}
            activeTab={activeTab}
            activityLog={activityLog}
            balance={balance}
            onlineDrivers={onlineDrivers}
            companyCommission={companyCommission}
            showLiveMap={showLiveMap}
            vendorLocation={vendorLocation}
            vendorId={vendorId}
            vendorName={vendorName}
            onSetActiveTab={setActiveTab}
            onCollectDebt={handleCollectDebt}
            onCancelOrder={handleCancelOrder}
            onEditOrder={handleOpenForm}
            onQuickInvoiceUpload={handleQuickInvoiceUpload}
            uploadingInvoice={uploadingInvoice}
            quickUploadOrderId={quickUploadOrderId}
          />
        ) : activeView === "wallet" ? (
          <WalletView
            companyCommission={companyCommission}
            balance={balance}
            settlementHistory={settlementHistory}
            commissionDetails={{
              totalDeliveryFees: orders.filter(o => o.status === "delivered" && !o.vendorCollectedAt).reduce((acc, o) => acc + Number(o.deliveryFee.replace(/[^0-9.-]+/g, "")), 0),
              orderCount: orders.filter(o => o.status === "delivered" && !o.vendorCollectedAt).length,
              commissionRate: appConfig.vendor_commission / 100,
              commissionPerOrder: appConfig.vendor_fee || 1,
              commissionType: appConfig.vendor_commission_type,
              commissionValue: appConfig.vendor_commission_value,
            }}
            onOpenSettlementModal={() => setShowSettlementModal(true)}
          />
        ) : activeView === "settings" ? (
          <StoreSettingsView
            settingsData={settingsData}
            savingSettings={savingSettings}
            vendorLocation={vendorLocation}
            updatingLocation={updatingLocation}
            onBack={() => setActiveView("store")}
            onSettingsDataChange={setSettingsData}
            onSave={handleUpdateProfile}
            onUpdateLocation={handleUpdateLocation}
          />
        ) : (
          <OrderFormView
            editingOrder={editingOrder}
            formData={formData}
            invoiceUrl={invoiceUrl}
            uploadingInvoice={uploadingInvoice}
            isSaving={isSavingOrder}
            hasVendorLocation={!!(vendorLocation?.lat && vendorLocation?.lng)}
            onBack={() => setActiveView("store")}
            onFormDataChange={setFormData}
            onPickCustomerLocation={handlePickCustomerLocation}
            onCameraCapture={handleCameraCapture}
            onSave={handleSaveOrder}
          />
        )}
      </main>

{activeView === "store" && (
        <motion.button 
          onClick={() => handleOpenForm()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 hover:bg-green-600 text-white w-48 h-16 rounded-3xl shadow-2xl shadow-green-200 flex items-center justify-center gap-3 font-black text-lg active:scale-95 transition-all z-40"
        >
          <Plus className="w-6 h-6" />
          إضافة طلب جديد
        </motion.button>
      )}

      <AnimatePresence>
        {showInAppCamera && (
          <CameraScanner
            onCapture={handleInAppCapture}
            onClose={() => {
              setShowInAppCamera(false);
              setQuickUploadOrderId(null);
            }}
          />
        )}
      </AnimatePresence>

      <StoreAccountModals
        showPasswordModal={showPasswordModal}
        showSettlementModal={showSettlementModal}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        passwordError={passwordError}
        changingPassword={changingPassword}
        settlementAmount={settlementAmount}
        requestingSettlement={requestingSettlement}
        onClosePasswordModal={() => setShowPasswordModal(false)}
        onCloseSettlementModal={() => setShowSettlementModal(false)}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSettlementAmountChange={setSettlementAmount}
        onChangePassword={handleChangePassword}
        onRequestSettlement={handleRequestSettlement}
      />

      {activeView !== "order-form" && (
        <StoreDrawer
          showDrawer={showDrawer}
          vendorName={vendorName}
          activeView={activeView === "order-form" ? "store" : activeView}
          onClose={() => setShowDrawer(false)}
          onChangeView={(view) => setActiveView(view as any)}
          onUpdateLocation={handleUpdateLocation}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}
