"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Store, 
  Clock, 
  Truck, 
  CheckCircle, 
  Camera, 
  Banknote,
  ChevronLeft,
  Search,
  ArrowRight,
  Edit2,
  LogOut,
  XCircle,
  MapPin,
  AlertCircle,
  History,
  Wallet,
  ArrowUpRight,
  Settings,
  Phone,
  MessageCircle,
  ShieldCheck,
  Menu,
  X,
  Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-3xl flex items-center justify-center text-gray-400 font-bold">جاري تحميل الخريطة...</div>
});

import LocationMarker from "@/components/LocationMarker";
import { VENDOR_INSURANCE_FEE, calculateOrderFinancials, calculateDeliveryFee } from "@/lib/pricing";
import { getCurrentUser, getUserProfile, signOut, updateUserProfile } from "@/lib/auth";
import { getVendorOrders, createOrder, updateOrder, subscribeToOrders, subscribeToProfiles, subscribeToWallets, subscribeToSettlements, cancelOrder, deleteCanceledOrders, vendorCollectDebt, type Order as DBOrder } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import PushNotificationManager from "@/components/PushNotificationManager";
import { PremiumCard } from "@/components/PremiumCard";
import { AppLoader } from "@/components/AppLoader";
import { SyncIndicator } from "@/components/SyncIndicator";
import { useSync } from "@/hooks/useSync";

interface Order {
  id: string;
  customer: string;
  phone: string;
  address: string;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  driver: string | null;
  driverPhone?: string;
  amount: string;
  deliveryFee: string;
  time: string;
  createdAt: string; 
  isPickedUp: boolean;
  notes: string;
  prepTime: string;
  invoiceUrl?: string;
  vendorCollectedAt?: string | null;
  driverConfirmedAt?: string | null;
}

export default function VendorApp() {
  const router = useRouter();
  const { isSyncing, lastSync } = useSync();
  
  // Basic State
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState("محل");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorLocation, setVendorLocation] = useState<any>(null);
  const [activeView, setActiveView] = useState<"store" | "wallet" | "history" | "settings">("store");
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [balance, setBalance] = useState(0);
  const [companyCommission, setCompanyCommission] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [activityLog, setActivityLog] = useState<{id: string, text: string, time: string}[]>([]);

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

  const addActivity = (text: string) => {
    setActivityLog(prev => [{
      id: Math.random().toString(36).substring(2, 11),
      text,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }, ...prev].slice(0, 3));
  };

  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);

  const [appConfig, setAppConfig] = useState({ driver_commission: 15, vendor_commission: 20, vendor_fee: 1, safe_ride_fee: 1 });

  // Initialization & Auth Check
  useEffect(() => {
    let ordersSub: any;
    let profilesSub: any;
    let walletSub: any;
    let settlementsSub: any;

    const init = async () => {
      const user = await getCurrentUser();
      if (!user) { router.push("/login"); return; }
      
      const profile = await getUserProfile(user.id);
      if (!profile || profile.role !== 'vendor') { router.push("/login"); return; }

      setVendorId(user.id);
      setVendorName(profile.full_name || "محل");
      setVendorPhone(profile.phone || "");
      setVendorLocation((profile as any).location);
      setSettingsData({ 
        name: profile.full_name || "", 
        phone: profile.phone || "",
        area: (profile as any).area || ""
      });
      
      const updateData = async () => {
        const dbOrders = await getVendorOrders(user.id);
        setOrders(dbOrders.map(mapDBOrderToUI));
        const { data: walletData } = await supabase.from('wallets').select('system_balance').eq('user_id', user.id).single();
        if (walletData) setCompanyCommission(walletData.system_balance);
        const { data: settlementsData } = await supabase.from('settlements').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (settlementsData) {
          setSettlementHistory(settlementsData.map(s => ({
            id: s.id,
            amount: s.amount,
            status: s.status === 'approved' ? "تم السداد" : s.status === 'pending' ? "جاري المراجعة" : "مرفوض",
            date: new Date(s.created_at).toLocaleDateString('ar-EG')
          })));
        }
      };

      await updateData();

      // جلب إعدادات النظام
      const { data: config } = await supabase.from('app_config').select('*').single();
      if (config) {
        setAppConfig({
          driver_commission: config.driver_commission || 15,
          vendor_commission: config.vendor_commission || 20,
          vendor_fee: config.vendor_fee || 1,
          safe_ride_fee: config.safe_ride_fee || 1
        });
      }

      setLoading(false);

      // Real-time Subscriptions
      ordersSub = subscribeToOrders(() => updateData());
      profilesSub = subscribeToProfiles((payload) => {
        const { new: newProfile } = payload;
        if (newProfile && (newProfile.role || '').toLowerCase() === 'driver') {
          setOnlineDrivers(prev => {
            if (!newProfile.is_online) return prev.filter(d => d.id !== newProfile.id);
            let loc = newProfile.location;
            if (typeof loc === 'string') try { loc = JSON.parse(loc); } catch { loc = null; }
            if (!loc || typeof loc.lat !== 'number') return prev;

            const updated = { id: newProfile.id, name: newProfile.full_name, lat: loc.lat, lng: loc.lng, lastSeen: formatTime(newProfile.last_location_update || newProfile.updated_at) };
            const idx = prev.findIndex(d => d.id === newProfile.id);
            if (idx > -1) { const next = [...prev]; next[idx] = updated; return next; }
            return [...prev, updated];
          });
        }
      });
      walletSub = subscribeToWallets(user.id, () => updateData());
      settlementsSub = subscribeToSettlements(user.id, () => updateData());
    };

    init();
    return () => {
      if (ordersSub) supabase.removeChannel(ordersSub);
      if (profilesSub) supabase.removeChannel(profilesSub);
      if (walletSub) supabase.removeChannel(walletSub);
      if (settlementsSub) supabase.removeChannel(settlementsSub);
    };
  }, [router]);

  useEffect(() => {
    const pendingCollection = orders.reduce((acc, order) => {
      if (order.status === "delivered" && !order.vendorCollectedAt) {
        return acc + Number(order.amount.replace(/[^0-9.-]+/g, ""));
      }
      return acc;
    }, 0);
    setBalance(pendingCollection);
  }, [orders]);

  // --- Logic Helpers ---

  const mapDBOrderToUI = (db: any): Order => ({
    id: db.id,
    customer: db.customer_details?.name || "عميل",
    phone: db.customer_details?.phone || "",
    address: db.customer_details?.address || "عنوان غير محدد",
    status: db.status,
    driver: db.profiles?.full_name || (db.driver_id ? "كابتن (جاري الجلب...)" : null),
    driverPhone: db.profiles?.phone || "",
    amount: `${db.financials?.order_value || 0} ج.م`,
    deliveryFee: `${db.financials?.delivery_fee || 0} ج.م`,
    time: formatTime(db.created_at),
    createdAt: db.created_at || new Date().toISOString(),
    isPickedUp: db.status !== 'pending' && db.status !== 'assigned',
    notes: db.customer_details?.notes || "",
    prepTime: db.financials?.prep_time || "15",
    invoiceUrl: db.invoice_url,
    vendorCollectedAt: db.vendor_collected_at,
    driverConfirmedAt: db.driver_confirmed_at
  });

  const translateStatus = (status: string) => {
    const statuses: any = { pending: "جاري البحث عن طيار", assigned: "تم تعيين طيار", in_transit: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغي" };
    return statuses[status] || status;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
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
    const { error } = await updateUserProfile(vendorId, {
      full_name: settingsData.name,
      phone: settingsData.phone,
      area: settingsData.area
    });
    if (!error) {
      setVendorName(settingsData.name);
      setVendorPhone(settingsData.phone);
      alert("تم تحديث الملف الشخصي بنجاح!");
      setActiveView("store");
    } else {
      alert("حدث خطأ أثناء تحديث الملف الشخصي.");
    }
    setSavingSettings(false);
  };

  const handlePickCustomerLocation = () => {
    if (!navigator.geolocation) return alert("متصفحك لا يدعم تحديد الموقع.");
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
      alert("تم تحديد موقع العميل بنجاح!");
    }, () => alert("فشل تحديد الموقع. تأكد من تفعيل الـ GPS."));
  };

  const handleOpenForm = (order: Order | null = null) => {
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
    const { data, error } = await action;
    if (error) return alert(`خطأ: ${error.message}`);
    if (data) {
      const ui = mapDBOrderToUI(data as DBOrder);
      setOrders(prev => editingOrder ? prev.map(o => o.id === ui.id ? ui : o) : [ui, ...prev]);
      setShowOrderForm(false);
      addActivity(editingOrder ? "تم تعديل الطلب" : "تم إنشاء طلب جديد");
    }
  };

  const handleCollectDebt = async (orderId: string) => {
    const { error } = await vendorCollectDebt(orderId);
    if (!error) {
      addActivity(`تم تحصيل قيمة الطلب #${orderId.slice(0, 8)}`);
      // تحديث البيانات فوراً
      if (vendorId) {
        const dbOrders = await getVendorOrders(vendorId);
        setOrders(dbOrders.map(mapDBOrderToUI));
        const { data: walletData } = await supabase.from('wallets').select('system_balance').eq('user_id', vendorId).single();
        if (walletData) setCompanyCommission(walletData.system_balance);
      }
    } else {
      alert("حدث خطأ أثناء تأكيد التحصيل.");
    }
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendorId) return;
    setUploadingInvoice(true);
    try {
      const fileName = `${vendorId}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('invoices').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName);
      setInvoiceUrl(publicUrl);
    } catch (error: any) {
      alert("فشل رفع الفاتورة.");
    } finally { setUploadingInvoice(false); }
  };

  const handleCancelOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.isPickedUp) return alert("لا يمكن إلغاء الطلب بعد استلامه.");
    if (!confirm("إلغاء هذا الطلب؟")) return;
    const { data, error } = await cancelOrder(orderId);
    if (!error && data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data as DBOrder) : o));
      addActivity(`تم إلغاء الطلب #${orderId.slice(0, 8)}`);
    }
  };

  const handleClearCanceled = async () => {
    if (!vendorId || !confirm("حذف كافة السجلات الملغية نهائياً؟")) return;
    const { error } = await deleteCanceledOrders(vendorId);
    if (!error) setOrders(prev => prev.filter(o => o.status !== "cancelled"));
  };

  const handleUpdateLocation = async () => {
    if (!vendorId) return;
    setSavingLocation(true);
    const getLocation = (opt: PositionOptions) => new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, opt));
    try {
      let pos;
      try { pos = await getLocation({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }); }
      catch { pos = await getLocation({ enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }); }
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const { error } = await supabase.from('profiles').update({ location: loc, updated_at: new Date().toISOString() }).eq('id', vendorId);
      if (error) throw error;
      setVendorLocation(loc);
      alert("تم حفظ الموقع!");
    } catch (err: any) {
      alert("فشل تحديد الموقع.");
    } finally { setSavingLocation(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return setPasswordError("غير متطابقة");
    if (newPassword.length < 6) return setPasswordError("6 أحرف على الأقل");
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) setPasswordError(error.message);
    else { setShowPasswordModal(false); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); alert("تم التغيير!"); }
  };

  const handleSignOut = async () => { await signOut(); router.push("/login"); };

  // --- Render Functions ---

  const renderHeader = () => (
    <header className="bg-white p-6 shadow-sm flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button onClick={() => setShowDrawer(true)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">{vendorName}</h1>
          <p className="text-[10px] text-gray-400">لوحة تحكم المحل</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <SyncIndicator lastSync={lastSync} isSyncing={isSyncing} />
        <div className="relative group hidden sm:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-orange transition-colors" />
          <input type="text" placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-gray-100 pr-9 pl-3 py-2 rounded-xl text-xs border-none outline-none focus:ring-2 ring-brand-orange/20 w-32 transition-all" />
        </div>
      </div>
    </header>
  );

  const renderStoreView = () => {
    const filteredOrders = orders.filter(o => {
      const search = searchQuery.toLowerCase();
      const match = o.customer.toLowerCase().includes(search) || o.id.toLowerCase().includes(search);
      if (!match) return false;
      if (activeTab === "active") return o.status !== "delivered" && o.status !== "cancelled";
      return activeTab === "مكتمل" ? o.status === "delivered" : o.status === "cancelled";
    });

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {activityLog.length > 0 && (
            <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-[24px] p-3 flex flex-col gap-1 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-brand-orange animate-pulse" />
              <AnimatePresence mode="popLayout">
                {activityLog.map(log => (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-brand-orange" /><span className="text-[10px] font-bold text-gray-600">{log.text}</span></div>
                    <span className="text-[8px] font-bold text-gray-400">{log.time}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <PremiumCard
              title="مديونية الطيارين"
              value={balance.toLocaleString()}
              icon={<Wallet className="text-green-600 w-5 h-5" />}
              subtitle="ج.م"
              delay={0.1}
            />
            <PremiumCard
              title="الطيارين المتصلين"
              value={onlineDrivers.length}
              icon={<MapPin className="text-brand-orange w-5 h-5" />}
              subtitle="طيار"
              delay={0.2}
              className={showLiveMap ? "ring-2 ring-brand-orange" : ""}
            />
          </div>
          
          <PremiumCard
            title="عمولة الشركة المستحقة"
            value={companyCommission.toLocaleString()}
            icon={<ShieldCheck className="text-brand-red w-5 h-5" />}
            subtitle="ج.م"
            className="mt-4"
            delay={0.3}
          />
        </div>

        <AnimatePresence>
          {showLiveMap && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <LiveMap drivers={onlineDrivers} vendors={vendorLocation ? [{ id: vendorId || 'me', name: vendorName, lat: vendorLocation.lat, lng: vendorLocation.lng }] : []} center={vendorLocation ? [vendorLocation.lat, vendorLocation.lng] : undefined} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white p-1 rounded-2xl flex border border-gray-100 items-center">
          {["نشط", "مكتمل", "ملغي"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab === "نشط" ? "active" : tab)} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${(activeTab === "active" && tab === "نشط") || activeTab === tab ? "bg-brand-orange text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}>{tab}</button>
          ))}
        </div>

        <section className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200"><Truck className="w-12 h-12 text-gray-200 mx-auto mb-4" /><p className="text-sm text-gray-400 font-bold">لا توجد طلبات حالياً</p></div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredOrders.map(order => (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div><h3 className="font-bold text-gray-900">{order.customer}</h3><p className="text-[10px] text-gray-400 font-bold">#{order.id.slice(0, 8)}</p></div>
                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${order.status === "delivered" ? "bg-green-50 text-green-600" : order.status === "cancelled" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}>{translateStatus(order.status)}</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500"><MapPin className="w-3 h-3 text-gray-400" /><span>{order.address}</span></div>
                    <div className="flex items-center gap-2 text-xs text-gray-500"><Clock className="w-3 h-3 text-brand-orange" /><span>{order.time}</span></div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">{order.driver ? <div className="bg-brand-orange w-full h-full flex items-center justify-center text-white text-[10px] font-bold">{order.driver.charAt(0)}</div> : <Truck className="w-4 h-4 text-gray-400" />}</div><span className="text-xs font-bold text-gray-700">{order.driver || "بانتظار طيار..."}</span></div>
                    <span className="font-bold text-gray-900">{order.amount}</span>
                  </div>
                  
                  {/* Flexible Payment Confirmation Section */}
                  {!order.vendorCollectedAt && (
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      {order.driverConfirmedAt ? (
                        <button 
                          onClick={() => handleCollectDebt(order.id)} 
                          className="w-full bg-green-500 text-white py-4 rounded-2xl text-[10px] font-black hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                        >
                          <CheckCircle className="w-4 h-4" />
                          تأكيد استلام مبلغ المديونية ({order.amount})
                        </button>
                      ) : (
                        order.status === "delivered" && (
                          <div className="w-full bg-gray-50 text-gray-400 py-3 rounded-2xl text-[10px] font-bold flex items-center justify-center gap-2 border border-dashed border-gray-200">
                            <Clock className="w-4 h-4 text-gray-300" />
                            بانتظار قيام الطيار بطلب تسوية الدفع
                          </div>
                        )
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </section>
      </div>
    );
  };

  const handleRequestSettlement = async () => {
    if (!vendorId || !settlementAmount) return;
    const { error } = await supabase.from('settlements').insert([{ user_id: vendorId, amount: Number(settlementAmount), status: 'pending', method: 'Vodafone Cash' }]);
    if (!error) {
      alert("تم إرسال طلب التسوية بنجاح.");
      setShowSettlementModal(false);
      setSettlementAmount("");
      // تحديث البيانات
      const { data: walletData } = await supabase.from('wallets').select('system_balance').eq('user_id', vendorId).single();
      if (walletData) setCompanyCommission(walletData.system_balance);
      const { data: settlementsData } = await supabase.from('settlements').select('*').eq('user_id', vendorId).order('created_at', { ascending: false });
      if (settlementsData) {
        setSettlementHistory(settlementsData.map(s => ({
          id: s.id,
          amount: s.amount,
          status: s.status === 'approved' ? "تم السداد" : s.status === 'pending' ? "جاري المراجعة" : "مرفوض",
          date: new Date(s.created_at).toLocaleDateString('ar-EG')
        })));
      }
    } else {
      alert("حدث خطأ أثناء إرسال الطلب.");
    }
  };

  const renderWalletView = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">المحفظة المالية</h2>
      <div className="bg-gray-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">عمولة الشركة المستحقة</p>
          <h3 className="text-4xl font-black">{companyCommission.toLocaleString()} <span className="text-lg font-bold">ج.م</span></h3>
          <button onClick={() => setShowSettlementModal(true)} className="mt-6 w-full bg-white/10 hover:bg-white/20 py-3 rounded-2xl text-xs font-bold transition-colors border border-white/10">طلب تسوية مديونية</button>
        </div>
      </div>
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10"><p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">مستحقات لدى الطيارين</p><h3 className="text-4xl font-black text-gray-900">{balance.toLocaleString()} <span className="text-lg font-bold text-gray-400">ج.م</span></h3></div>
      </div>

      {/* Settlements History */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 pr-2">طلبات التسوية الأخيرة</h3>
        {settlementHistory.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-[32px] text-center border border-dashed border-gray-200">
            <p className="text-xs text-gray-400 font-bold">لا توجد طلبات تسوية سابقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {settlementHistory.map(s => (
              <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.status === 'تم السداد' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">تسوية مديونية</p>
                    <p className="text-[10px] text-gray-400 font-bold">{s.date}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-900">{s.amount} ج.م</p>
                  <p className={`text-[10px] font-bold ${s.status === 'تم السداد' ? 'text-green-600' : 'text-orange-600'}`}>{s.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6"><button onClick={() => setActiveView("store")} className="bg-white p-2 rounded-xl shadow-sm text-gray-400"><ArrowRight className="w-5 h-5" /></button><h2 className="text-2xl font-bold text-gray-900">إعدادات المحل</h2></div>
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-6 shadow-sm">
        <div><label className="text-xs font-bold text-gray-400 block mb-2">اسم المحل</label><input type="text" value={settingsData.name} onChange={(e) => setSettingsData({...settingsData, name: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold text-gray-800" /></div>
        <div><label className="text-xs font-bold text-gray-400 block mb-2">رقم الهاتف</label><input type="tel" value={settingsData.phone} onChange={(e) => setSettingsData({...settingsData, phone: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold text-gray-800" /></div>
        <button onClick={handleUpdateProfile} disabled={savingSettings} className="w-full bg-brand-orange text-white py-5 rounded-2xl font-bold shadow-lg disabled:opacity-50">{savingSettings ? "جاري الحفظ..." : "حفظ التغييرات"}</button>
      </div>
    </div>
  );

  const renderHistoryView = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">سجل العمليات</h2>
      <div className="space-y-4">
        {orders.filter(o => o.status === "delivered" || o.status === "cancelled").map(order => (
          <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.status === "delivered" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}><History className="w-5 h-5" /></div><div><p className="text-sm font-bold text-gray-800">{order.customer}</p><p className="text-[10px] text-gray-400">{order.time} • {order.amount}</p></div></div>
            <span className={`text-[10px] font-bold ${order.status === "delivered" ? "text-green-600" : "text-red-600"}`}>{translateStatus(order.status)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDrawer = () => (
    <AnimatePresence>
      {showDrawer && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDrawer(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed top-0 right-0 bottom-0 w-72 bg-white z-[101] shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange"><Store className="w-6 h-6" /></div><div><p className="font-bold text-gray-900 text-sm">{vendorName}</p></div></div><button onClick={() => setShowDrawer(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="flex-1 p-4 space-y-2">
              <button onClick={() => { setActiveView("store"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "store" ? "bg-brand-orange/10 text-brand-orange" : "hover:bg-gray-50 text-gray-700"}`}><Store className="w-5 h-5" /><span className="text-sm font-bold">الرئيسية والطلبات</span></button>
              <button onClick={() => { setActiveView("wallet"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "wallet" ? "bg-brand-orange/10 text-brand-orange" : "hover:bg-gray-50 text-gray-700"}`}><Wallet className="w-5 h-5" /><span className="text-sm font-bold">المحفظة المالية</span></button>
              <button onClick={() => { setActiveView("history"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "history" ? "bg-brand-orange/10 text-brand-orange" : "hover:bg-gray-50 text-gray-700"}`}><History className="w-5 h-5" /><span className="text-sm font-bold">سجل العمليات</span></button>
              <button onClick={() => { setActiveView("settings"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "settings" ? "bg-brand-orange/10 text-brand-orange" : "hover:bg-gray-50 text-gray-700"}`}><Settings className="w-5 h-5" /><span className="text-sm font-bold">إعدادات الحساب</span></button>
              <div className="h-px bg-gray-100 my-4" />
              <button onClick={() => { setShowDrawer(false); handleUpdateLocation(); }} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl transition-colors"><MapPin className="w-5 h-5 text-gray-400" /><span className="text-sm font-bold text-gray-700">تحديث موقع المحل</span></button>
            </div>
            <div className="p-4 border-t border-gray-100"><button onClick={handleSignOut} className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors"><LogOut className="w-5 h-5" /><span className="text-sm font-bold">تسجيل الخروج</span></button></div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (loading) return <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-20"><div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4" /><p className="text-sm text-gray-400 font-bold">جاري تحميل البيانات...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative overflow-hidden font-sans" dir="rtl">
      <PushNotificationManager userId={vendorId} />
      {renderHeader()}
      {renderDrawer()}
      <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
        {activeView === "store" ? renderStoreView() : activeView === "wallet" ? renderWalletView() : activeView === "settings" ? renderSettingsView() : renderHistoryView()}
      </main>
      {activeView === "store" && <button onClick={() => handleOpenForm()} className="fixed bottom-8 left-6 bg-brand-orange text-white w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center active:scale-95 transition-all z-30"><Plus className="w-8 h-8" /></button>}
      
      <AnimatePresence>
        {showOrderForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md mx-auto rounded-t-[40px] p-8 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-900">{editingOrder ? "تعديل الطلب" : "طلب طيار جديد"}</h2><button onClick={() => setShowOrderForm(false)} className="bg-gray-100 p-2 rounded-full"><X className="w-5 h-5" /></button></div>
              <div className="space-y-4">
                <input type="text" value={formData.customer} onChange={(e) => setFormData({...formData, customer: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-orange" placeholder="اسم العميل" />
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-orange" placeholder="رقم الهاتف" />
                <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-orange" placeholder="العنوان بالتفصيل" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={formData.orderValue} onChange={(e) => setFormData({...formData, orderValue: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-orange" placeholder="قيمة الأوردر" />
                  <input type="number" value={formData.deliveryFee} onChange={(e) => setFormData({...formData, deliveryFee: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-orange" placeholder="سعر التوصيل" />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={handlePickCustomerLocation} className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${formData.customerCoords ? "bg-green-600 text-white shadow-lg shadow-green-100" : "bg-gray-900 text-white"}`}><MapPin size={20} />{formData.customerCoords ? "تم تحديد الموقع" : "تحديد موقع العميل"}</button>
                  <label className={`flex-1 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold cursor-pointer border-2 border-dashed ${invoiceUrl ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}><input type="file" className="hidden" accept="image/*" onChange={handleInvoiceUpload} /><Camera className="w-6 h-6" /><span className="text-xs">{invoiceUrl ? "تم الرفع" : "رفع الفاتورة"}</span></label>
                </div>
                <button onClick={handleSaveOrder} disabled={!formData.customer || !formData.orderValue || uploadingInvoice} className="w-full bg-brand-orange text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-50">{editingOrder ? "حفظ التعديلات" : "إرسال الطلب الآن"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-sm:max-w-xs max-w-sm rounded-[40px] p-8 shadow-2xl relative">
              <button onClick={() => setShowPasswordModal(false)} className="absolute top-6 left-6 text-gray-400">×</button>
              <h2 className="text-xl font-black mb-6 text-right">تغيير كلمة السر</h2>
              <div className="space-y-4">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة السر الجديدة" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-orange font-bold text-right" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تأكيد كلمة السر" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 ring-brand-orange font-bold text-right" />
                {passwordError && <p className="text-red-500 text-xs font-bold text-right">{passwordError}</p>}
                <button onClick={handleChangePassword} disabled={changingPassword} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-lg">{changingPassword ? "جاري التغيير..." : "حفظ التغييرات"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settlement Modal */}
      <AnimatePresence>
        {showSettlementModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-sm:max-w-xs max-w-sm rounded-[40px] p-8 shadow-2xl relative">
              <button onClick={() => setShowSettlementModal(false)} className="absolute top-6 left-6 text-gray-400">×</button>
              <h2 className="text-xl font-black mb-6 text-right">طلب تسوية مديونية</h2>
              <div className="space-y-4">
                <div className="text-right">
                  <label className="text-xs font-bold text-gray-400 block mb-2">المبلغ المراد سداده</label>
                  <input type="number" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold text-right" placeholder="0.00" />
                </div>
                <button onClick={handleRequestSettlement} className="w-full bg-brand-orange text-white py-4 rounded-2xl font-bold shadow-lg">إرسال الطلب</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
