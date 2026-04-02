"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics } from "@capacitor/haptics";
import { useAuth } from "@/components/AuthProvider";
import { CardSkeleton, OrderSkeleton } from "@/components/ui/Skeleton";
import { 
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";

import { calculateOrderFinancials, calculateDeliveryFee } from "@/lib/pricing";
import { getCurrentUser, getUserProfile, signOut, updateUserProfile } from "@/lib/auth";
import { getVendorOrders, createOrder, updateOrder, vendorCollectDebt } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import PushNotificationManager from "@/components/PushNotificationManager";
import { AppLoader } from "@/components/AppLoader";
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
  const router = useRouter();
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
    const hardFallback = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const init = async () => {
      if (authLoading) return;

      // Prevent redundant setup
      if (vendorId === (user?.id || null) && vendorName !== "محل") {
        return;
      }

      try {
        if (user && authProfile) {
          if (vendorId !== user.id || vendorName !== (authProfile.full_name || "محل")) {
            setVendorId(user.id);
            setVendorName(authProfile.full_name || "محل");
            setVendorLocation((authProfile.location as VendorLocation | undefined) || null);
            setSettingsData({ 
              name: authProfile.full_name || "", 
              phone: authProfile.phone || "",
              area: authProfile.area || ""
            });
            
            void Promise.allSettled([
              withTimeout('updateData', updateData(user.id), 10000),
              withTimeout('fetchConfig', (async () => {
                const { data: config } = await supabase.from('app_config').select('*').single();
                if (config) {
                  setAppConfig({
                    driver_commission: config.driver_commission || 15,
                    vendor_commission: config.vendor_commission || 20,
                    vendor_fee: config.vendor_fee || 1,
                    safe_ride_fee: config.safe_ride_fee || 1
                  });
                }
              })(), 10000)
            ]);
          }
          setLoading(false);
          return;
        }

        const currentUser = await withTimeout('getCurrentUser', getCurrentUser(), 5000);
        if (currentUser) {
          const profile = await withTimeout('getUserProfile', getUserProfile(currentUser.id), 5000);
          if (profile) {
            setVendorId(currentUser.id);
            setVendorName(profile.full_name || "محل");
            setVendorLocation((profile.location as VendorLocation | undefined) || null);
            setSettingsData({ 
              name: profile.full_name || "", 
              phone: profile.phone || "",
              area: profile.area || ""
            });
            void updateData(currentUser.id);
          }
        }
      } catch (e) {
        console.error("VendorPage: Init error", e);
      } finally {
        clearTimeout(hardFallback);
        setLoading(false);
      }
    };

    init();
    return () => clearTimeout(hardFallback);
  }, [user, authProfile, authLoading]);

  useEffect(() => {
    const pendingCollection = orders.reduce((acc, order) => {
      if (order.status === "delivered" && !order.vendorCollectedAt) {
        return acc + Number(order.amount.replace(/[^0-9.-]+/g, ""));
      }
      return acc;
    }, 0);
    setBalance(pendingCollection);
  }, [orders]);

  const updateData = async (uid: string) => {
    setIsSyncing(true);
    setLastSync(new Date());
    try {
      const [dbOrders, walletRes, settlementsRes, driversRes] = await Promise.all([
        getVendorOrders(uid),
        supabase.from('wallets').select('system_balance').eq('user_id', uid).single(),
        supabase.from('settlements').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'driver').eq('is_online', true)
      ]);

      if (dbOrders) setOrders(dbOrders.map(mapDBOrderToUI));
      if (walletRes.data) setCompanyCommission(walletRes.data.system_balance);
      if (settlementsRes.data) {
        setSettlementHistory(settlementsRes.data.map(s => ({
          id: s.id,
          amount: s.amount,
          status: s.status === 'approved' ? "تم السداد" : s.status === 'pending' ? "جاري المراجعة" : "مرفوض",
          date: new Date(s.created_at).toLocaleDateString('ar-EG')
        })));
      }
      if (driversRes.data) {
        const drivers = driversRes.data
          .map((d) => ({
            id: d.id,
            name: d.full_name,
            lat: d.location?.lat,
            lng: d.location?.lng
          }))
          .filter((d): d is OnlineDriver => typeof d.lat === "number" && typeof d.lng === "number");
        setOnlineDrivers(drivers);
      }
    } catch (err) {
      console.error("VendorPage: Update error", err);
    }
    setIsSyncing(false);
  };

  // --- Logic Helpers ---

  const mapDBOrderToUI = (db: VendorDBOrder): Order => ({
    id: db.id,
    customer: db.customer_details?.name || "عميل",
    phone: db.customer_details?.phone || "",
    address: db.customer_details?.address || "عنوان غير محدد",
    status: db.status,
    driver: db.profiles?.full_name || (db.driver_id ? "كابتن (جاري الجلب...)" : null),
    driverPhone: db.profiles?.phone || "",
    amount: `${db.financials?.order_value || 0} ج.م`,
    deliveryFee: `${db.financials?.delivery_fee || 0} ج.م`,
    time: formatVendorTime(db.created_at || ""),
    createdAt: db.created_at || new Date().toISOString(),
    isPickedUp: db.status !== 'pending' && db.status !== 'assigned',
    notes: db.customer_details?.notes || "",
    prepTime: db.financials?.prep_time || "15",
    invoiceUrl: db.invoice_url,
    vendorCollectedAt: db.vendor_collected_at,
    driverConfirmedAt: db.driver_confirmed_at
  });

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

  const handleOpenForm = async (order: Order | null = null) => {`n    try { await Haptics.impact({ style: "light" }); } catch(e) {}
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

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const getLocation = (opt: PositionOptions) => new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, opt));
    try {
      let pos;
      try { pos = await getLocation({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }); }
      catch { pos = await getLocation({ enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }); }
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const { error: dbError } = await supabase.from('profiles').update({ location: loc, updated_at: new Date().toISOString() }).eq('id', vendorId);
      if (dbError) throw dbError;
      setVendorLocation(loc);
      success("تم تحديث موقع المحل بنجاح!");
    } catch {
      error("فشل تحديد الموقع. تأكد من تفعيل الـ GPS.");
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
    <AuthGuard allowedRoles={["vendor"]}>
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
          />
        ) : activeView === "wallet" ? (
          <WalletView
            companyCommission={companyCommission}
            balance={balance}
            settlementHistory={settlementHistory}
            onOpenSettlementModal={() => setShowSettlementModal(true)}
          />
        ) : activeView === "settings" ? (
          <VendorSettingsView
            settingsData={settingsData}
            savingSettings={savingSettings}
            onBack={() => setActiveView("store")}
            onSettingsDataChange={setSettingsData}
            onSave={handleUpdateProfile}
          />
        ) : (
          <HistoryView orders={orders} />
        )}
      </main>

      {activeView === "store" && (
        <button 
          onClick={() => handleOpenForm()} 
          className="fixed bottom-8 left-6 bg-brand-orange text-white w-14 h-14 rounded-2xl shadow-xl shadow-orange-200 flex items-center justify-center active:scale-95 transition-all z-30"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}
      
      <OrderFormModal
        show={showOrderForm}
        editingOrder={editingOrder}
        formData={formData}
        invoiceUrl={invoiceUrl}
        uploadingInvoice={uploadingInvoice}
        isSaving={isSavingOrder}
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
    </AuthGuard>
  );
}