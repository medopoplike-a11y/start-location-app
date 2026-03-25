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
  loading: () => <div className="h-[300px] w-full bg-brand-card animate-pulse rounded-3xl flex items-center justify-center text-gray-500 font-bold border border-brand-border">جاري تحميل الخريطة...</div>
});

import LocationMarker from "@/components/LocationMarker";
import { VENDOR_INSURANCE_FEE, calculateOrderFinancials, calculateDeliveryFee } from "@/lib/pricing";
import { getCurrentUser, getUserProfile, signOut, updateUserProfile } from "@/lib/auth";
import { getVendorOrders, createOrder, updateOrder, subscribeToOrders, subscribeToProfiles, subscribeToWallets, subscribeToSettlements, cancelOrder, deleteCanceledOrders, vendorCollectDebt, type Order as DBOrder } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import PushNotificationManager from "@/components/PushNotificationManager";

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

  const handleRequestSettlement = async () => {
    if (!vendorId || !settlementAmount) return;
    const { error } = await supabase.from('settlements').insert([{ user_id: vendorId, amount: Number(settlementAmount), status: 'pending', method: 'Vodafone Cash' }]);
    if (!error) {
      alert("تم إرسال طلب التسوية بنجاح.");
      setShowSettlementModal(false);
      setSettlementAmount("");
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

  if (loading) return <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center py-20"><div className="w-10 h-10 border-4 border-brand-warning border-t-transparent rounded-full animate-spin mb-4" /><p className="text-sm text-gray-500 font-bold">جاري تحميل البيانات...</p></div>;

  return (
    <div className="min-h-screen bg-brand-dark text-white flex flex-col max-w-md mx-auto relative overflow-hidden font-sans selection:bg-brand-warning/10" dir="rtl">
      <PushNotificationManager userId={vendorId} />
      
      {/* Updated Header */}
      <header className="bg-brand-card/80 backdrop-blur-md p-6 shadow-lg border-b border-brand-border flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowDrawer(true)} className="p-2 hover:bg-brand-muted rounded-xl transition-colors">
            <Menu className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">{vendorName}</h1>
            <p className="text-[10px] text-gray-400">لوحة تحكم المحل</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-warning transition-colors" />
            <input type="text" placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-brand-muted pr-9 pl-3 py-2 rounded-xl text-xs border border-brand-border outline-none focus:ring-2 ring-brand-warning/20 w-32 text-white transition-all focus:bg-transparent" />
          </div>
        </div>
      </header>

      {/* Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDrawer(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed top-0 right-0 bottom-0 w-72 bg-brand-card z-[101] shadow-2xl flex flex-col border-l border-brand-border">
              <div className="p-6 border-b border-brand-border flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-brand-warning/10 rounded-xl flex items-center justify-center text-brand-warning"><Store className="w-6 h-6" /></div><div><p className="font-bold text-white text-sm">{vendorName}</p></div></div><button onClick={() => setShowDrawer(false)} className="p-2 hover:bg-brand-muted rounded-full"><X className="w-5 h-5 text-gray-400" /></button></div>
              <div className="flex-1 p-4 space-y-2">
                <button onClick={() => { setActiveView("store"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "store" ? "bg-brand-warning/10 text-brand-warning" : "hover:bg-brand-muted text-gray-400"}`}><Store className="w-5 h-5" /><span className="text-sm font-bold">الرئيسية والطلبات</span></button>
                <button onClick={() => { setActiveView("wallet"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "wallet" ? "bg-brand-warning/10 text-brand-warning" : "hover:bg-brand-muted text-gray-400"}`}><Wallet className="w-5 h-5" /><span className="text-sm font-bold">المحفظة المالية</span></button>
                <button onClick={() => { setActiveView("history"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "history" ? "bg-brand-warning/10 text-brand-warning" : "hover:bg-brand-muted text-gray-400"}`}><History className="w-5 h-5" /><span className="text-sm font-bold">سجل العمليات</span></button>
                <button onClick={() => { setActiveView("settings"); setShowDrawer(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "settings" ? "bg-brand-warning/10 text-brand-warning" : "hover:bg-brand-muted text-gray-400"}`}><Settings className="w-5 h-5" /><span className="text-sm font-bold">إعدادات الحساب</span></button>
                <div className="h-px bg-brand-border my-4" />
                <button onClick={() => { setShowDrawer(false); handleUpdateLocation(); }} className="w-full flex items-center gap-3 p-4 hover:bg-brand-muted rounded-2xl transition-colors"><MapPin className="w-5 h-5 text-gray-400" /><span className="text-sm font-bold text-gray-300">تحديث موقع المحل</span></button>
              </div>
              <div className="p-4 border-t border-brand-border"><button onClick={handleSignOut} className="w-full flex items-center gap-3 p-4 text-brand-secondary hover:bg-brand-secondary/10 rounded-2xl transition-colors"><LogOut className="w-5 h-5" /><span className="text-sm font-bold">تسجيل الخروج</span></button></div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
        {activeView === "store" ? (
          <div className="space-y-6">
            <div className="space-y-4">
              {activityLog.length > 0 && (
                <div className="bg-brand-card/50 backdrop-blur-md border border-brand-border rounded-[24px] p-3 flex flex-col gap-1 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-brand-warning animate-pulse" />
                  <AnimatePresence mode="popLayout">
                    {activityLog.map(log => (
                      <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-brand-warning" /><span className="text-[10px] font-bold text-gray-300">{log.text}</span></div>
                        <span className="text-[8px] font-bold text-gray-500">{log.time}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <section onClick={() => setActiveView("wallet")} className="bg-brand-card p-5 rounded-[32px] border border-brand-border shadow-lg cursor-pointer active:scale-95 transition-all">
                  <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 bg-brand-success/10 rounded-lg flex items-center justify-center text-brand-success"><Wallet className="w-4 h-4" /></div><p className="text-[10px] font-bold text-gray-500">المديونية من الطيارين</p></div>
                  <h2 className="text-xl font-black text-white">{balance.toLocaleString()} <span className="text-[10px]">ج.م</span></h2>
                </section>
                <section onClick={() => setShowLiveMap(!showLiveMap)} className={`p-5 rounded-[32px] border transition-all cursor-pointer active:scale-95 ${showLiveMap ? "bg-brand-warning text-brand-dark border-brand-warning shadow-lg shadow-brand-warning/20" : "bg-brand-card border-brand-border shadow-lg"}`}>
                  <div className="flex items-center gap-2 mb-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${showLiveMap ? "bg-brand-dark/20" : "bg-brand-warning/10 text-brand-warning"}`}><MapPin className="w-4 h-4" /></div><p className={`text-[10px] font-bold ${showLiveMap ? "text-brand-dark/80" : "text-gray-500"}`}>الطيارين المتصلين</p></div>
                  <h2 className={`text-xl font-black ${showLiveMap ? "text-brand-dark" : "text-white"}`}>{onlineDrivers.length} <span className="text-[10px]">طيار</span></h2>
                </section>
              </div>
            </div>

            <AnimatePresence>
              {showLiveMap && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <LiveMap drivers={onlineDrivers} vendors={vendorLocation ? [{ id: vendorId || 'me', name: vendorName, lat: vendorLocation.lat, lng: vendorLocation.lng }] : []} center={vendorLocation ? [vendorLocation.lat, vendorLocation.lng] : undefined} className="grayscale invert brightness-90 contrast-125 rounded-[32px] border border-brand-border h-64 w-full" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-brand-card p-1 rounded-2xl flex border border-brand-border items-center">
              {["نشط", "مكتمل", "ملغي"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab === "نشط" ? "active" : tab)} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${(activeTab === "active" && tab === "نشط") || activeTab === tab ? "bg-brand-warning text-brand-dark shadow-md" : "text-gray-500 hover:text-white"}`}>{tab}</button>
              ))}
            </div>

            <section className="space-y-4">
              {orders.filter(o => {
                const search = searchQuery.toLowerCase();
                const match = o.customer.toLowerCase().includes(search) || o.id.toLowerCase().includes(search);
                if (!match) return false;
                if (activeTab === "active") return o.status !== "delivered" && o.status !== "cancelled";
                return activeTab === "مكتمل" ? o.status === "delivered" : o.status === "cancelled";
              }).length === 0 ? (
                <div className="text-center py-20 bg-brand-card rounded-3xl border border-dashed border-brand-border"><Truck className="w-12 h-12 text-gray-700 mx-auto mb-4" /><p className="text-sm text-gray-500 font-bold">لا توجد طلبات حالياً</p></div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {orders.filter(o => {
                    const search = searchQuery.toLowerCase();
                    const match = o.customer.toLowerCase().includes(search) || o.id.toLowerCase().includes(search);
                    if (!match) return false;
                    if (activeTab === "active") return o.status !== "delivered" && o.status !== "cancelled";
                    return activeTab === "مكتمل" ? o.status === "delivered" : o.status === "cancelled";
                  }).map(order => (
                    <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-card p-5 rounded-3xl border border-brand-border shadow-xl">
                      <div className="flex justify-between items-start mb-4">
                        <div><h3 className="font-bold text-white">{order.customer}</h3><p className="text-[10px] text-gray-500 font-bold">#{order.id.slice(0, 8)}</p></div>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${order.status === "delivered" ? "bg-brand-success/10 text-brand-success" : order.status === "cancelled" ? "bg-brand-secondary/10 text-brand-secondary" : "bg-brand-warning/10 text-brand-warning"}`}>{translateStatus(order.status)}</span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-gray-400"><MapPin className="w-3 h-3 text-gray-600" /><span>{order.address}</span></div>
                        <div className="flex items-center gap-2 text-xs text-gray-400"><Clock className="w-3 h-3 text-brand-warning" /><span>{order.time}</span></div>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-brand-border">
                        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-brand-muted rounded-full flex items-center justify-center border border-brand-border">{order.driver ? <div className="bg-brand-warning w-full h-full flex items-center justify-center text-brand-dark text-[10px] font-bold">{order.driver.charAt(0)}</div> : <Truck className="w-4 h-4 text-gray-600" />}</div><span className="text-xs font-bold text-gray-300">{order.driver || "بانتظار طيار..."}</span></div>
                        <span className="font-bold text-white">{order.amount}</span>
                      </div>
                      
                      {!order.vendorCollectedAt && (
                        <div className="mt-4 pt-4 border-t border-brand-border">
                          {order.driverConfirmedAt ? (
                            <button 
                              onClick={() => handleCollectDebt(order.id)} 
                              className="w-full bg-brand-success text-white py-4 rounded-2xl text-[10px] font-black hover:bg-brand-success/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-success/20"
                            >
                              <CheckCircle className="w-4 h-4" />
                              تأكيد استلام مبلغ المديونية ({order.amount})
                            </button>
                          ) : (
                            order.status === "delivered" && (
                              <div className="w-full bg-brand-muted text-gray-500 py-3 rounded-2xl text-[10px] font-bold flex items-center justify-center gap-2 border border-dashed border-brand-border">
                                <Clock className="w-4 h-4 text-gray-600" />
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
        ) : activeView === "wallet" ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">المحفظة المالية</h2>
            <div className="bg-brand-card text-white p-8 rounded-[40px] shadow-xl border border-brand-border relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">عمولة الشركة المستحقة</p>
                <h3 className="text-4xl font-black">{companyCommission.toLocaleString()} <span className="text-lg font-bold">ج.م</span></h3>
                <button onClick={() => setShowSettlementModal(true)} className="mt-6 w-full bg-white text-brand-dark py-3 rounded-2xl text-xs font-bold transition-all hover:bg-gray-200">طلب تسوية مديونية</button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-warning/20 blur-[80px] rounded-full" />
            </div>
            <div className="bg-brand-card p-8 rounded-[40px] border border-brand-border shadow-lg relative overflow-hidden">
              <div className="relative z-10"><p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">مستحقات لدى الطيارين</p><h3 className="text-4xl font-black text-white">{balance.toLocaleString()} <span className="text-lg font-bold text-gray-600">ج.م</span></h3></div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white pr-2">طلبات التسوية الأخيرة</h3>
              {settlementHistory.map(s => (
                <div key={s.id} className="bg-brand-card p-4 rounded-2xl border border-brand-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.status === 'تم السداد' ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-warning/10 text-brand-warning'}`}><Wallet className="w-5 h-5" /></div>
                    <div><p className="text-sm font-bold text-white">تسوية مديونية</p><p className="text-[10px] text-gray-500 font-bold">{s.date}</p></div>
                  </div>
                  <div className="text-left"><p className="text-sm font-black text-white">{s.amount} ج.م</p><p className={`text-[10px] font-bold ${s.status === 'تم السداد' ? 'text-brand-success' : 'text-brand-warning'}`}>{s.status}</p></div>
                </div>
              ))}
            </div>
          </div>
        ) : activeView === "settings" ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6"><button onClick={() => setActiveView("store")} className="bg-brand-card p-2 rounded-xl shadow-lg border border-brand-border text-gray-400"><ArrowRight className="w-5 h-5" /></button><h2 className="text-2xl font-bold text-white">إعدادات الحساب</h2></div>
            <div className="bg-brand-card p-6 rounded-[32px] border border-brand-border space-y-6 shadow-xl">
              <div><label className="text-xs font-bold text-gray-500 block mb-2">اسم المحل</label><input type="text" value={settingsData.name} onChange={(e) => setSettingsData({...settingsData, name: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border outline-none focus:ring-2 ring-brand-warning font-bold text-white focus:bg-transparent" /></div>
              <div><label className="text-xs font-bold text-gray-500 block mb-2">رقم الهاتف</label><input type="tel" value={settingsData.phone} onChange={(e) => setSettingsData({...settingsData, phone: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border outline-none focus:ring-2 ring-brand-warning font-bold text-white focus:bg-transparent" /></div>
              <button onClick={handleUpdateProfile} disabled={savingSettings} className="w-full bg-brand-warning text-brand-dark py-5 rounded-2xl font-bold shadow-lg shadow-brand-warning/20 disabled:opacity-50"> {savingSettings ? "جاري الحفظ..." : "حفظ التغييرات"}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">سجل العمليات</h2>
            <div className="space-y-4">
              {orders.filter(o => o.status === "delivered" || o.status === "cancelled").map(order => (
                <div key={order.id} className="bg-brand-card p-4 rounded-2xl border border-brand-border flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.status === "delivered" ? "bg-brand-success/10 text-brand-success" : "bg-brand-secondary/10 text-brand-secondary"}`}><History className="w-5 h-5" /></div><div><p className="text-sm font-bold text-white">{order.customer}</p><p className="text-[10px] text-gray-500">{order.time} • {order.amount}</p></div></div>
                  <span className={`text-[10px] font-bold ${order.status === "delivered" ? "text-brand-success" : "text-brand-secondary"}`}>{translateStatus(order.status)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {activeView === "store" && <button onClick={() => handleOpenForm()} className="fixed bottom-8 left-6 bg-brand-warning text-brand-dark w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center active:scale-95 transition-all z-30"><Plus className="w-8 h-8" /></button>}
      
      {/* Order Form Modal */}
      <AnimatePresence>
        {showOrderForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-brand-card w-full max-w-md mx-auto rounded-t-[40px] border-t border-brand-border p-8 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">{editingOrder ? "تعديل الطلب" : "طلب طيار جديد"}</h2><button onClick={() => setShowOrderForm(false)} className="bg-brand-muted p-2 rounded-full text-gray-400"><X className="w-5 h-5" /></button></div>
              <div className="space-y-4">
                <input type="text" value={formData.customer} onChange={(e) => setFormData({...formData, customer: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-warning focus:bg-transparent" placeholder="اسم العميل" />
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-warning focus:bg-transparent" placeholder="رقم الهاتف" />
                <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-warning focus:bg-transparent" placeholder="العنوان بالتفصيل" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={formData.orderValue} onChange={(e) => setFormData({...formData, orderValue: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-warning focus:bg-transparent" placeholder="قيمة الأوردر" />
                  <input type="number" value={formData.deliveryFee} onChange={(e) => setFormData({...formData, deliveryFee: e.target.value})} className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-warning focus:bg-transparent" placeholder="سعر التوصيل" />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={handlePickCustomerLocation} className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${formData.customerCoords ? "bg-brand-success text-white" : "bg-white text-brand-dark"}`}><MapPin size={20} />{formData.customerCoords ? "تم تحديد الموقع" : "تحديد موقع العميل"}</button>
                  <label className={`flex-1 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold cursor-pointer border-2 border-dashed ${invoiceUrl ? "bg-brand-success/10 text-brand-success border-brand-success/20" : "bg-brand-muted text-gray-500 border-brand-border"}`}><input type="file" className="hidden" accept="image/*" onChange={handleInvoiceUpload} /><Camera className="w-6 h-6" /><span className="text-xs">{invoiceUrl ? "تم الرفع" : "رفع الفاتورة"}</span></label>
                </div>
                <button onClick={handleSaveOrder} disabled={!formData.customer || !formData.orderValue || uploadingInvoice} className="w-full bg-brand-warning text-brand-dark py-5 rounded-3xl font-bold text-lg shadow-xl shadow-brand-warning/20 active:scale-95 transition-all disabled:opacity-50">{editingOrder ? "حفظ التعديلات" : "إرسال الطلب الآن"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Other Modals */}
      <AnimatePresence>
        {(showPasswordModal || showSettlementModal) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-brand-card w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-brand-border relative">
              {showPasswordModal && (
                <>
                  <button onClick={() => setShowPasswordModal(false)} className="absolute top-6 left-6 text-gray-500 hover:text-white">×</button>
                  <h2 className="text-xl font-black mb-6 text-white text-right">تغيير كلمة السر</h2>
                  <div className="space-y-4">
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة السر الجديدة" className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-warning font-bold text-right focus:bg-transparent" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تأكيد كلمة السر" className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-warning font-bold text-right focus:bg-transparent" />
                    {passwordError && <p className="text-brand-secondary text-xs font-bold text-right">{passwordError}</p>}
                    <button onClick={handleChangePassword} disabled={changingPassword} className="w-full bg-white text-brand-dark py-4 rounded-2xl font-bold shadow-lg">{changingPassword ? "جاري التغيير..." : "حفظ التغييرات"}</button>
                  </div>
                </>
              )}
              {showSettlementModal && (
                <>
                  <button onClick={() => setShowSettlementModal(false)} className="absolute top-6 left-6 text-gray-500 hover:text-white">×</button>
                  <h2 className="text-xl font-black mb-6 text-white text-right">طلب تسوية مديونية</h2>
                  <div className="space-y-4">
                    <div className="text-right">
                      <label className="text-xs font-bold text-gray-500 block mb-2">المبلغ المراد سداده</label>
                      <input type="number" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} className="w-full bg-brand-muted p-4 rounded-2xl border border-brand-border text-white outline-none focus:ring-2 ring-brand-warning font-bold text-right focus:bg-transparent" placeholder="0.00" />
                    </div>
                    <button onClick={handleRequestSettlement} className="w-full bg-brand-warning text-brand-dark py-4 rounded-2xl font-bold shadow-lg">إرسال الطلب</button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
