"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CardSkeleton, OrderSkeleton } from "@/components/ui/Skeleton";
import { 
  Plus
} from "lucide-react";

import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { calculateOrderFinancials, calculateDeliveryFee } from "@/lib/pricing";
import { getCurrentUser, getUserProfile, signOut, updateUserProfile } from "@/lib/auth";
import { getVendorOrders, createOrder, updateOrder, vendorCollectDebt, cancelOrder } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import PushNotificationManager from "@/components/PushNotificationManager";
import AuthGuard from "@/components/AuthGuard";
import Toast from "@/components/Toast";
import { useSync } from "@/hooks/useSync";
import { useToast } from "@/hooks/useToast";
import type { Order, VendorLocation, OnlineDriver, SettlementHistoryItem, VendorDBOrder } from "./types";
import { formatVendorTime } from "./utils";
import VendorHeader from "./components/VendorHeader";
import StoreView from "./components/StoreView";
import WalletView from "./components/WalletView";
import VendorSettingsView from "./components/SettingsView";
import HistoryView from "./components/HistoryView";
import VendorDrawer from "./components/VendorDrawer";
import OrderFormModal from "./components/OrderFormModal";
import VendorAccountModals from "./components/VendorAccountModals";

export default function VendorApp() {
  return (
    <AuthGuard allowedRoles={["vendor", "admin"]}>
      <VendorContent />
    </AuthGuard>
  );
}

function VendorContent() {
  const { toasts, removeToast, success, error } = useToast();
  
  const { user, profile: authProfile, loading: authLoading } = useAuth();

  // Basic State
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState("محل");
  const [vendorLocation, setVendorLocation] = useState<VendorLocation | null>(null);
  const [activeView, setActiveView] = useState<"store" | "wallet" | "history" | "settings">("store");
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

  const [formData, setFormData] = useState({
    customer: "",
    phone: "",
    address: "",
    orderValue: "",
    deliveryFee: "30",
    notes: "",
    prepTime: "15",
    customerCoords: null as { lat: number, lng: number } | null
  });

  const [settingsData, setSettingsData] = useState({ name: "", phone: "", area: "" });

  // useSync hook for real-time updates
  useSync(vendorId || undefined, () => {
    if (vendorId) {
      updateData(vendorId);
    }
  });

  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [requestingSettlement, setRequestingSettlement] = useState(false);
  const [settlementHistory, setSettlementHistory] = useState<SettlementHistoryItem[]>([]);

  const [appConfig, setAppConfig] = useState({ driver_commission: 15, vendor_commission: 20, vendor_fee: 1, safe_ride_fee: 1 });

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
              window.location.assign("/login/");
            } else {
              router.replace("/login/");
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
                safe_ride_fee: configData.safe_ride_fee || 1
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

  const updateData = async (uid: string) => {
    if (!uid) return;
    setIsSyncing(true);
    setLastSync(new Date());
    try {
      const [dbOrders, walletRes, settlementsRes, driversRes] = await Promise.allSettled([
        getVendorOrders(uid),
        supabase.from('wallets').select('system_balance').eq('user_id', uid).single(),
        supabase.from('settlements').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'driver').eq('is_online', true)
      ]);

      if (dbOrders.status === 'fulfilled' && dbOrders.value) {
        setOrders(dbOrders.value.map(mapDBOrderToUI));
        const deliveredCommission = dbOrders.value
          .filter((o: any) => o.status === 'delivered' && !o.vendor_collected_at)
          .reduce((sum: number, o: any) => sum + (o.financials?.system_commission || 0), 0);
        setCompanyCommission(deliveredCommission);
      }

      if (walletRes.status === 'fulfilled' && walletRes.value.data) {
        setCompanyCommission(walletRes.value.data.system_balance || 0);
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
    }
    setIsSyncing(false);
  };

  // --- Logic Helpers ---
  const handleCancelOrder = async (orderId: string) => {
    try {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    } catch (e) {}
    
    // Safety check for confirm on native
    const shouldCancel = typeof window !== 'undefined' && window.confirm ? window.confirm('هل أنت متأكد من إلغاء الطلب؟') : true;
    if (!shouldCancel) return;

    const { error: cancelErr } = await cancelOrder(orderId);
    if (!cancelErr) {
      success('تم إلغاء الطلب بنجاح');
      if (vendorId) updateData(vendorId);
    } else {
      error('خطأ في الإلغاء');
    }
  };

  const mapDBOrderToUI = (db: VendorDBOrder): Order => {
    // Robust mapping with safety checks
    const financials = db.financials || { order_value: 0, delivery_fee: 0 };
    const customer = db.customer_details || { name: "عميل", address: "عنوان غير محدد" };

    return {
      id: db.id,
      customer: customer.name || "عميل",
      phone: customer.phone || "",
      address: customer.address || "عنوان غير محدد",
      status: db.status || 'pending',
      driver: db.driver?.full_name || (db.driver_id ? "كابتن (جاري التحديث...)" : null),
      driverPhone: db.driver?.phone || "",
      amount: `${financials.order_value || 0} ج.م`,
      deliveryFee: `${financials.delivery_fee || 0} ج.م`,
      time: formatVendorTime(db.created_at || ""),
      createdAt: db.created_at || new Date().toISOString(),
      isPickedUp: db.status !== 'pending' && db.status !== 'assigned',
      notes: customer.notes || "",
      prepTime: financials.prep_time || "15",
      invoiceUrl: db.invoice_url,
      vendorCollectedAt: db.vendor_collected_at,
      driverConfirmedAt: db.driver_confirmed_at,
      financials: db.financials ? {
        order_value: financials.order_value,
        delivery_fee: financials.delivery_fee,
        system_commission: financials.system_commission,
        vendor_commission: financials.vendor_commission,
        driver_earnings: financials.driver_earnings,
        insurance_fee: financials.insurance_fee,
        prep_time: financials.prep_time,
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
        customerCoords: null
      });
    } else {
      setEditingOrder(null);
      setInvoiceUrl(null);
      setFormData({ customer: "", phone: "", address: "", orderValue: "", deliveryFee: "30", notes: "", prepTime: "15", customerCoords: null });
    }
    setShowOrderForm(true);
  };

  const handleSaveOrder = async () => {
    if (!vendorId) return;
    setIsSavingOrder(true);
    try {
      let distance = 2.5; 
      if (vendorLocation?.lat && formData.customerCoords) {
        distance = Math.round(calculateDistance(vendorLocation.lat, vendorLocation.lng, formData.customerCoords.lat, formData.customerCoords.lng) * 10) / 10;
      }

      const manualDeliveryFee = Number(formData.deliveryFee);
      const calculated = calculateOrderFinancials(distance, 0, manualDeliveryFee, {
        driverCommissionPct: appConfig.driver_commission,
        vendorCommissionPct: appConfig.vendor_commission,
        driverInsuranceFee: appConfig.safe_ride_fee,
        vendorInsuranceFee: appConfig.vendor_fee
      });
      const orderData = {
        vendor_id: vendorId,
        driver_id: null,
        status: 'pending' as const,
        distance,
        customer_details: { name: formData.customer, phone: formData.phone, address: formData.address, notes: formData.notes, coords: formData.customerCoords },
        financials: { 
          order_value: Number(formData.orderValue), 
          delivery_fee: manualDeliveryFee, 
          prep_time: formData.prepTime, 
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
        setShowOrderForm(false);
        success(editingOrder ? "تم تعديل الطلب بنجاح" : "تم إنشاء طلب جديد بنجاح");
        addActivityLocal(editingOrder ? "تم تعديل الطلب" : "تم إنشاء طلب جديد");
      }
    } catch (err) {
      error("حدث خطأ أثناء حفظ الطلب. حاول مرة أخرى.");
      console.error("Order save error:", err);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleCollectDebt = async (orderId: string) => {
    const { error: dbError } = await vendorCollectDebt(orderId);
    if (!dbError) {
      success(`تم تحصيل قيمة الطلب #${orderId.slice(0, 8)} بنجاح`);
      addActivityLocal(`تم تحصيل قيمة الطلب #${orderId.slice(0, 8)}`);
      if (vendorId) {
        updateData(vendorId);
      }
    } else {
      error("حدث خطأ أثناء تأكيد التحصيل.");
    }
  };

  const handleInvoiceUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendorId) return;
    setUploadingInvoice(true);
    try {
      const fileName = `${vendorId}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error: dbError } = await supabase.storage.from('invoices').upload(fileName, file);
      if (dbError) throw dbError;
      const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName);
      setInvoiceUrl(publicUrl);
      success("تم رفع الفاتورة بنجاح");
    } catch {
      error("فشل رفع الفاتورة. حاول مرة أخرى.");
    } finally { setUploadingInvoice(false); }
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
      <PushNotificationManager userId={vendorId ?? null} />
      
      <VendorHeader
        vendorName={vendorName}
        lastSync={lastSync}
        isSyncing={isSyncing}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenDrawer={() => setShowDrawer(true)}
        onSync={() => vendorId && updateData(vendorId)}
      />

      <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
        {activeView === "store" ? (
          <StoreView
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

          />
        ) : activeView === "wallet" ? (
          <WalletView
            companyCommission={companyCommission}
            balance={balance}
            settlementHistory={settlementHistory}
            commissionDetails={{
              totalDeliveryFees: orders.filter(o => o.status === "delivered").reduce((acc, o) => acc + Number(o.deliveryFee.replace(/[^0-9.-]+/g, "")), 0),
              orderCount: orders.filter(o => o.status === "delivered").length,
              commissionRate: appConfig.driver_commission / 100,
              commissionPerOrder: appConfig.vendor_fee || 1,
            }}
            onOpenSettlementModal={() => setShowSettlementModal(true)}
          />
        ) : activeView === "settings" ? (
          <VendorSettingsView
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
          <HistoryView orders={orders} />
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

      
      <OrderFormModal
        show={showOrderForm}
        editingOrder={editingOrder}
        formData={formData}
        invoiceUrl={invoiceUrl}
        uploadingInvoice={uploadingInvoice}
        isSaving={isSavingOrder}
        hasVendorLocation={!!(vendorLocation?.lat && vendorLocation?.lng)}
        onClose={() => setShowOrderForm(false)}
        onFormDataChange={setFormData}
        onPickCustomerLocation={handlePickCustomerLocation}
        onInvoiceUpload={handleInvoiceUpload}
        onSave={handleSaveOrder}
      />

      <VendorAccountModals
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

      <VendorDrawer
        showDrawer={showDrawer}
        vendorName={vendorName}
        activeView={activeView}
        onClose={() => setShowDrawer(false)}
        onChangeView={setActiveView}
        onUpdateLocation={handleUpdateLocation}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
