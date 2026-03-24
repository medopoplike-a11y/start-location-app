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
  ArrowDownLeft,
  Settings,
  Phone,
  MessageCircle,
  ShieldCheck,
  Menu,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LocationMarker from "@/components/LocationMarker";

import { VENDOR_INSURANCE_FEE, calculateOrderFinancials, calculateDeliveryFee } from "@/lib/pricing";
import { getCurrentUser, getUserProfile, signOut } from "@/lib/auth";
import { getVendorOrders, createOrder, updateOrder, subscribeToOrders, subscribeToProfiles, cancelOrder, deleteCanceledOrders, vendorCollectDebt, type Order as DBOrder } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import PushNotificationManager from "@/components/PushNotificationManager";
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-3xl flex items-center justify-center text-gray-400 font-bold">جاري تحميل الخريطة...</div>
});

interface Order {
  id: string;
  customer: string;
  phone: string;
  address: string;
  status: string;
  driver: string | null;
  driverPhone?: string;
  amount: string;
  deliveryFee: string;
  time: string;
  createdAt: string; // الحفاظ على التاريخ الأصلي للمقارنة
  isPickedUp: boolean;
  notes: string;
  prepTime: string;
  invoiceUrl?: string;
  vendorCollectedAt?: string | null;
  driverConfirmedAt?: string | null;
}

export default function VendorApp() {
  const router = useRouter();
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

  const handlePickCustomerLocation = () => {
    if (!navigator.geolocation) {
      alert("متصفحك لا يدعم تحديد الموقع.");
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      setFormData(prev => ({ ...prev, customerCoords: coords }));
      
      // إذا توفر موقع المحل، نقوم بتحديث سعر التوصيل تلقائياً
      if (vendorLocation) {
        const dist = calculateDistance(vendorLocation.lat, vendorLocation.lng, coords.lat, coords.lng);
        const fee = Math.ceil(calculateDeliveryFee(dist));
        setFormData(prev => ({ ...prev, deliveryFee: fee.toString() }));
      }
      
      alert("تم تحديد موقع العميل بنجاح!");
    }, (error) => {
      alert("فشل تحديد الموقع. تأكد من تفعيل الـ GPS.");
    });
  };

  // حفظ واسترجاع بيانات النموذج لمنع فقدان البيانات عند الريلود (خاصة عند استخدام الكاميرا)
  useEffect(() => {
    const savedData = localStorage.getItem("pending_order_form");
    const savedInvoice = localStorage.getItem("pending_order_invoice");
    if (savedData) {
      setFormData(JSON.parse(savedData));
      setShowOrderForm(true); // إعادة فتح النموذج إذا كان هناك بيانات محفوظة
    }
    if (savedInvoice) {
      setInvoiceUrl(savedInvoice);
    }
  }, []);

  useEffect(() => {
    if (showOrderForm && !editingOrder) {
      localStorage.setItem("pending_order_form", JSON.stringify(formData));
    } else {
      localStorage.removeItem("pending_order_form");
    }
  }, [formData, showOrderForm, editingOrder]);

  useEffect(() => {
    if (invoiceUrl && !editingOrder) {
      localStorage.setItem("pending_order_invoice", invoiceUrl);
    } else {
      localStorage.removeItem("pending_order_invoice");
    }
  }, [invoiceUrl, editingOrder]);

  const [settingsData, setSettingsData] = useState({
    name: "",
    phone: ""
  });

  // تحديث الرصيد (المديونية المستحقة من الطيارين) تلقائياً
  useEffect(() => {
    if (orders.length >= 0) {
      // المديونية هي مجموع مبالغ الطلبات التي تم توصيلها ولم يتم تحصيلها بعد
      const pendingCollection = orders.reduce((acc, order) => {
        if (order.status === "تم التوصيل" && !order.vendorCollectedAt) {
          const val = Number(order.amount.replace(" ج.م", "").replace(",", ""));
          return acc + val;
        }
        return acc;
      }, 0);

      setBalance(pendingCollection);
    }
  }, [orders]);

  // التحقق من الهوية وجلب البيانات
  useEffect(() => {
    let subscription: any;

    const init = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const profile = await getUserProfile(user.id);
      if (!profile || profile.role !== 'vendor') {
        router.push("/login");
        return;
      }

      setVendorId(user.id);
      setVendorName(profile.full_name || "محل");
      setVendorPhone(profile.phone || "");
      setVendorLocation((profile as any).location);
      setSettingsData({
        name: profile.full_name || "",
        phone: profile.phone || ""
      });
      
      // جلب الطلبات
      const dbOrders = await getVendorOrders(user.id);
      setOrders(dbOrders.map(mapDBOrderToUI));
      
      // جلب الطيارين المتصلين حالياً (بحث غير حساس لحالة الأحرف)
      const { data: driversData } = await supabase
        .from('profiles')
        .select('id, full_name, location, is_online, updated_at, last_location_update, role')
        .eq('is_online', true);
      
      if (driversData) {
        setOnlineDrivers(driversData
          .filter(d => (d.role || '').toLowerCase() === 'driver' && d.location)
          .map(d => ({
            id: d.id,
            name: d.full_name,
            lat: d.location.lat,
            lng: d.location.lng,
            lastSeen: formatTime(d.last_location_update || d.updated_at)
          })));
      }

      // جلب محفظة المحل
      const { data: walletData } = await supabase
        .from('wallets')
        .select('system_balance')
        .eq('user_id', user.id)
        .single();
      
      if (walletData) {
        setCompanyCommission(walletData.system_balance);
      }

      setLoading(false);

      // الاشتراك في التغييرات اللحظية للطلبات مع معالجة محسنة
      subscription = subscribeToOrders((payload) => {
        console.log("Real-time order change received in Vendor:", payload);
        const { eventType, new: newRecord, old: oldRecord } = payload;

        // تحديث الرصيد والبيانات الأخرى
        const user = { id: vendorId || '' }; // Use closure variable
        if (eventType === 'UPDATE' && newRecord.status === 'delivered') {
          // جلب محفظة المحل لتحديث العمولات
          supabase
            .from('wallets')
            .select('system_balance')
            .eq('user_id', user.id)
            .single()
            .then(({ data: walletData }) => {
              if (walletData) setCompanyCommission(walletData.system_balance);
            });
        }

        setOrders(prevOrders => {
          let updatedOrders = [...prevOrders];

          if (eventType === 'INSERT') {
            if (newRecord.vendor_id === user.id) {
              const newUIOrder = mapDBOrderToUI(newRecord);
              if (!updatedOrders.find(o => o.id === newUIOrder.id)) {
                updatedOrders = [newUIOrder, ...updatedOrders];
              }
            }
          } else if (eventType === 'UPDATE') {
            // تحديث الطلب إذا كان موجوداً، أو إضافته إذا أصبح يخص هذا المحل
            if (newRecord.vendor_id === user.id) {
              const index = updatedOrders.findIndex(o => o.id === newRecord.id);
              if (index > -1) {
                updatedOrders[index] = mapDBOrderToUI(newRecord);
              } else {
                updatedOrders = [mapDBOrderToUI(newRecord), ...updatedOrders];
              }
            } else {
              // إزالة الطلب إذا لم يعد يخص هذا المحل (نادر الحدوث)
              updatedOrders = updatedOrders.filter(o => o.id !== newRecord.id);
            }
          } else if (eventType === 'DELETE') {
            updatedOrders = updatedOrders.filter(o => o.id !== oldRecord.id);
          }

          return updatedOrders;
        });
      });

      // الاشتراك في تحديثات مواقع الطيارين مع معالجة محسنة
      const profilesSubscription = subscribeToProfiles((payload) => {
        const { eventType, new: newProfile } = payload;
        if (newProfile && (newProfile.role || '').toLowerCase() === 'driver') {
          setOnlineDrivers(prev => {
            if (!newProfile.is_online) {
              return prev.filter(d => d.id !== newProfile.id);
            }
            const updatedDriver = {
              id: newProfile.id,
              name: newProfile.full_name,
              lat: newProfile.location?.lat,
              lng: newProfile.location?.lng,
              lastSeen: formatTime(newProfile.last_location_update || newProfile.updated_at)
            };
            if (!updatedDriver.lat || !updatedDriver.lng) return prev;
            
            const index = prev.findIndex(d => d.id === newProfile.id);
            if (index > -1) {
              const newDrivers = [...prev];
              newDrivers[index] = updatedDriver;
              return newDrivers;
            }
            return [...prev, updatedDriver];
          });
        }
      });
        
      return () => {
        if (subscription) supabase.removeChannel(subscription);
        if (profilesSubscription) supabase.removeChannel(profilesSubscription);
      };
    };

    init();
  }, [router]);

  const calculateBalance = (dbOrders: DBOrder[]) => {
    const totalCollected = dbOrders.reduce((acc, order) => {
      // المبالغ التي تم تحصيلها من العملاء (مديونية الطيارين للمحل)
      if (order.status === 'delivered') {
        return acc + order.financials.order_value;
      }
      return acc;
    }, 0);

    // خصم رسوم التأمين (1 ج.م عن كل طلب تم إنشاؤه)
    const totalInsurance = dbOrders.length * VENDOR_INSURANCE_FEE;
    
    setBalance(totalCollected - totalInsurance);
  };

  // تحويل بيانات قاعدة البيانات إلى بيانات الواجهة
  const mapDBOrderToUI = (db: any): Order => ({
    id: db.id,
    customer: db.customer_details?.name || "عميل",
    phone: db.customer_details?.phone || "",
    address: db.customer_details?.address || "عنوان غير محدد",
    status: translateStatus(db.status),
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
    switch (status) {
      case 'pending': return "جاري البحث عن طيار";
      case 'assigned': return "تم تعيين طيار";
      case 'in_transit': return "في الطريق";
      case 'delivered': return "تم التوصيل";
      case 'cancelled': return "ملغي";
      default: return status;
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const handleOpenForm = (order: Order | null = null) => {
    if (order) {
      setEditingOrder(order);
      setInvoiceUrl(order.invoiceUrl || null);
      setFormData({
        customer: order.customer,
        phone: order.phone || "",
        address: order.address,
        orderValue: order.amount.replace(" ج.م", "").replace(",", ""),
        deliveryFee: order.deliveryFee.replace(" ج.م", ""),
        notes: order.notes || "",
        prepTime: order.prepTime || "15",
        customerCoords: null
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
        customerCoords: null
      });
    }
    setShowOrderForm(true);
  };

  const handleCollectDebt = async (orderId: string) => {
    const { data, error } = await vendorCollectDebt(orderId);
    if (error) {
      alert("حدث خطأ أثناء تحديث حالة التحصيل.");
    } else if (data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data as DBOrder) : o));
    }
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendorId) return;

    setUploadingInvoice(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendorId}/${Date.now()}.${fileExt}`;
      
      // رفع الملف إلى سوبابيز
      const { data, error } = await supabase.storage
        .from('invoices')
        .upload(fileName, file);

      if (error) throw error;

      // الحصول على الرابط العام
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      setInvoiceUrl(publicUrl);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("فشل رفع الفاتورة. تأكد من إعدادات Storage في سوبابيز.");
    } finally {
      setUploadingInvoice(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleSaveOrder = async () => {
    if (!vendorId) return;

    // الحصول على إحداثيات العميل إذا تم تحديدها، وإلا استخدام قيمة افتراضية للمسافة
    let distance = 2.5; 
    
    // محاولة حساب المسافة الحقيقية إذا توفرت إحداثيات المحل والعميل
    if (vendorLocation && vendorLocation.lat && vendorLocation.lng && formData.customerCoords) {
      distance = calculateDistance(
        vendorLocation.lat,
        vendorLocation.lng,
        formData.customerCoords.lat,
        formData.customerCoords.lng
      );
      // تقريب المسافة لرقم عشري واحد
      distance = Math.round(distance * 10) / 10;
    }

    const calculatedFinancials = calculateOrderFinancials(distance);

    const orderData = {
      vendor_id: vendorId,
      driver_id: null,
      status: 'pending' as const,
      distance: distance,
      customer_details: {
        name: formData.customer,
        phone: formData.phone,
        address: formData.address,
        notes: formData.notes,
        coords: formData.customerCoords // حفظ إحداثيات العميل
      },
      financials: {
        order_value: Number(formData.orderValue),
        delivery_fee: Number(formData.deliveryFee),
        prep_time: formData.prepTime,
        system_commission: calculatedFinancials.systemCommission,
        driver_earnings: calculatedFinancials.driverEarnings,
        insurance_fee: calculatedFinancials.insuranceFundTotal
      },
      invoice_url: invoiceUrl || undefined
    };

    if (editingOrder) {
      const { data, error } = await updateOrder(editingOrder.id, orderData);
      if (error) {
        console.error("Update error detail:", error);
        alert(`خطأ في التحديث: ${error.message}`);
      } else if (data) {
        const updatedUIOrder = mapDBOrderToUI(data as DBOrder);
        setOrders(prev => prev.map(o => o.id === updatedUIOrder.id ? updatedUIOrder : o));
      }
    } else {
      const { data, error } = await createOrder(orderData);
      if (error) {
        console.error("Creation error detail:", error);
        alert(`خطأ في إنشاء الطلب: ${error.message}`);
      } else if (data) {
        const newUIOrder = mapDBOrderToUI(data as DBOrder);
        setOrders(prev => [newUIOrder, ...prev]);
      }
    }
    setShowOrderForm(false);
    localStorage.removeItem("pending_order_form");
    localStorage.removeItem("pending_order_invoice");
  };

  const handleClearCanceled = async () => {
    if (!vendorId) return;
    if (!confirm("هل أنت متأكد من حذف كافة سجلات الطلبات الملغية نهائياً؟")) return;

    const { error } = await deleteCanceledOrders(vendorId);
    if (error) {
      alert("حدث خطأ أثناء تنظيف السجلات.");
    } else {
      setOrders(prev => prev.filter(o => o.status !== "ملغي"));
      alert("تم تنظيف السجلات الملغية بنجاح.");
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (order.status === "في الطريق" || order.status === "تم التوصيل") {
      alert("لا يمكن إلغاء الطلب بعد استلامه من قبل الطيار.");
      return;
    }

    if (!confirm("هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟")) return;
    
    const { data, error } = await cancelOrder(orderId);
    if (error) {
      alert("حدث خطأ أثناء إلغاء الطلب.");
    } else if (data) {
      setOrders(prev => prev.map(o => o.id === orderId ? mapDBOrderToUI(data as DBOrder) : o));
    }
  };

  const handleUpdateLocation = async () => {
    if (!vendorId) return;
    setSavingLocation(true);
    
    if (!navigator.geolocation) {
      alert("متصفحك لا يدعم تحديد الموقع.");
      setSavingLocation(false);
      return;
    }

    // Attempt to get location with high accuracy, fall back to normal if it fails
    const getLocation = (options: PositionOptions) => {
      return new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    };

    try {
      // First try with high accuracy and a reasonable timeout
      let position;
      try {
        position = await getLocation({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0
        });
      } catch (err) {
        console.warn("High accuracy failed, falling back to low accuracy:", err);
        position = await getLocation({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0
        });
      }

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      const { error } = await supabase
        .from('profiles')
        .update({ 
          location,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendorId);

      if (error) {
        throw error;
      } else {
        setVendorLocation(location);
        alert("تم حفظ موقع المحل بنجاح!");
      }
    } catch (error: any) {
      console.error("Location error:", error);
      let msg = "فشل تحديد الموقع.";
      if (error.code === 1) msg = "تم رفض صلاحية تحديد الموقع من قبلك.";
      else if (error.code === 2) msg = "الموقع غير متوفر حالياً.";
      else if (error.code === 3) msg = "انتهت مهلة تحديد الموقع.";
      
      alert(msg + " تأكد من تفعيل الـ GPS وإعطاء الصلاحية للمتصفح.");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!vendorId) return;
    setSavingSettings(true);

    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: settingsData.name,
        phone: settingsData.phone
      })
      .eq('id', vendorId);

    if (error) {
      alert("حدث خطأ أثناء حفظ الإعدادات.");
    } else {
      setVendorName(settingsData.name);
      setVendorPhone(settingsData.phone);
      alert("تم تحديث بيانات المحل بنجاح!");
      setActiveView("store");
    }
    setSavingSettings(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("كلمات السر غير متطابقة");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("كلمة السر يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      alert("تم تغيير كلمة السر بنجاح");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         order.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === "active") {
      return order.status !== "تم التوصيل" && order.status !== "ملغي";
    } else if (activeTab === "مكتمل") {
      return order.status === "تم التوصيل";
    } else if (activeTab === "ملغي") {
      return order.status === "ملغي";
    }
    return true;
  });

  // --- مكونات واجهة المستخدم الصغيرة ---

  const renderDrawer = () => (
    <AnimatePresence>
      {showDrawer && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDrawer(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-72 bg-white z-[101] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{vendorName}</p>
                  <p className="text-[10px] text-gray-400">لوحة التحكم والإعدادات</p>
                </div>
              </div>
              <button onClick={() => setShowDrawer(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <button 
                onClick={() => { setActiveView("store"); setShowDrawer(false); }}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "store" ? "bg-brand-orange/10 text-brand-orange" : "hover:bg-gray-50 text-gray-700"}`}
              >
                <Store className="w-5 h-5" />
                <span className="text-sm font-bold">الرئيسية والطلبات</span>
              </button>

              <button 
                onClick={() => { setActiveView("wallet"); setShowDrawer(false); }}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "wallet" ? "bg-brand-orange/10 text-brand-orange" : "hover:bg-gray-50 text-gray-700"}`}
              >
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-bold">المحفظة المالية</span>
              </button>

              <button 
                onClick={() => { setActiveView("history"); setShowDrawer(false); }}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "history" ? "bg-brand-orange/10 text-brand-orange" : "hover:bg-gray-50 text-gray-700"}`}
              >
                <History className="w-5 h-5" />
                <span className="text-sm font-bold">سجل العمليات</span>
              </button>

              <div className="h-px bg-gray-100 my-4 mx-4" />

              <button 
                onClick={() => { setShowDrawer(false); handleUpdateLocation(); }}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl transition-colors"
              >
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-bold text-gray-700">تحديث موقع المحل</span>
              </button>

              <button 
                onClick={() => { setActiveView("settings"); setShowDrawer(false); }}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeView === "settings" ? "bg-brand-orange/10 text-brand-orange" : "hover:bg-gray-50 text-gray-700"}`}
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-bold">إعدادات الحساب</span>
              </button>
            </div>

            <div className="p-4 border-t border-gray-100">
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-bold">تسجيل الخروج</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

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
      
      <div className="flex items-center gap-2">
        <div className="relative group">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-orange transition-colors" />
          <input 
            type="text" 
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-100 pr-9 pl-3 py-2 rounded-xl text-xs border-none outline-none focus:ring-2 ring-brand-orange/20 w-32 transition-all"
          />
        </div>
      </div>
    </header>
  );

  const renderStoreView = () => (
    <>
      {/* Wallet & Stats */}
      <div className="grid grid-cols-2 gap-4">
        <section 
          onClick={() => setActiveView("wallet")}
          className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm cursor-pointer active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <Wallet className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-bold text-gray-400">المديونية من الطيارين</p>
          </div>
          <h2 className="text-xl font-black text-gray-900">{balance.toLocaleString()} <span className="text-[10px]">ج.م</span></h2>
        </section>

        <section 
          onClick={() => setShowLiveMap(!showLiveMap)}
          className={`p-5 rounded-[32px] border transition-all cursor-pointer active:scale-95 ${
            showLiveMap ? "bg-brand-orange text-white border-brand-orange shadow-lg shadow-orange-100" : "bg-white border-gray-100 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${showLiveMap ? "bg-white/20" : "bg-orange-50 text-brand-orange"}`}>
              <MapPin className="w-4 h-4" />
            </div>
            <p className={`text-[10px] font-bold ${showLiveMap ? "text-white/80" : "text-gray-400"}`}>الطيارين المتصلين</p>
          </div>
          <h2 className={`text-xl font-black ${showLiveMap ? "text-white" : "text-gray-900"}`}>{onlineDrivers.length} <span className="text-[10px]">طيار</span></h2>
        </section>
      </div>

      {/* Live Map View */}
      <AnimatePresence>
        {showLiveMap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <LiveMap 
              drivers={onlineDrivers} 
              vendors={vendorLocation ? [{
                id: vendorId || 'me',
                name: vendorName,
                lat: vendorLocation.lat,
                lng: vendorLocation.lng,
                details: 'موقعي الحالي'
              }] : []}
              center={vendorLocation ? [vendorLocation.lat, vendorLocation.lng] : undefined}
            />
            <p className="text-[10px] text-gray-400 mt-2 mr-2">يتم تحديث مواقع الطيارين تلقائياً وبشكل حي.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Status Tabs */}
      <div className="bg-white p-1 rounded-2xl flex border border-gray-100 items-center">
        {["نشط", "مكتمل", "ملغي"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab === "نشط" ? "active" : tab)}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
              (activeTab === "active" && tab === "نشط") || activeTab === tab
                ? "bg-brand-orange text-white shadow-md"
                : "text-gray-400 hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
        {activeTab === "ملغي" && orders.some(o => o.status === "ملغي") && (
          <button 
            onClick={handleClearCanceled}
            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="تنظيف السجل الملغي"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Active Orders */}
      <section className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Truck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm text-gray-400 font-bold">لا توجد طلبات {activeTab === "active" ? "نشطة" : activeTab} حالياً</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order, index) => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{order.customer}</h3>
                      {order.phone && (
                        <div className="flex gap-1">
                          <a href={`tel:${order.phone}`} className="text-blue-500 hover:text-blue-600">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a href={`https://wa.me/${order.phone}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-gray-400 font-bold">ID: {order.id.slice(0, 8)}</p>
                      {order.status !== "تم التوصيل" && order.status !== "ملغي" && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleOpenForm(order)}
                            className="p-1.5 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {(order.status === "جاري البحث عن طيار" || order.status === "تم تعيين طيار") && (
                            <button 
                              onClick={() => handleCancelOrder(order.id)}
                              className="p-1.5 bg-gray-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                              title="إلغاء الطلب"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${
                    order.status === "تم التوصيل" ? "bg-green-50 text-green-600" :
                    order.status === "ملغي" ? "bg-red-50 text-red-600" :
                    order.driver ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span>{order.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3 text-brand-orange" />
                    <span>{order.time}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                          {order.driver ? (
                            <div className="bg-brand-orange w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
                              {order.driver.charAt(0)}
                            </div>
                          ) : (
                            <Truck className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700">
                            {order.driver || "بانتظار طيار..."}
                          </span>
                          {order.driverPhone && (
                            <a href={`tel:${order.driverPhone}`} className="p-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                              <Phone className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-gray-900">{order.amount}</span>
                    </div>

                    {/* ميزة تحصيل المديونية */}
                    {(order.status === "تم تعيين طيار" || order.status === "في الطريق" || order.status === "تم التوصيل") && (
                      <div className="mt-3 pt-3 border-t border-dashed border-gray-100 flex flex-col gap-2">
                        {!order.vendorCollectedAt ? (
                          <button 
                            onClick={() => handleCollectDebt(order.id)}
                            className="w-full bg-orange-50 text-brand-orange py-2.5 rounded-xl text-[10px] font-bold hover:bg-orange-100 transition-all flex items-center justify-center gap-2"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            تأكيد تسليم الأوردر وتحصيل قيمته من الطيار
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-green-50 p-2.5 rounded-xl">
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">تم التحصيل بواسطة المحل</span>
                            </div>
                            {order.driverConfirmedAt ? (
                              <div className="flex items-center gap-1 text-blue-600">
                                <ShieldCheck className="w-3 h-3" />
                                <span className="text-[8px] font-bold">أكد الطيار الدفع</span>
                              </div>
                            ) : (
                              <span className="text-[8px] text-gray-400 font-bold italic">بانتظار تأكيد الطيار...</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </section>
    </>
  );

  const renderWalletView = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">المحفظة المالية</h2>
      
      {/* مديونية الشركة (عمولة 20%) */}
      <div className="bg-gray-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <ShieldCheck className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wider">عمولة الشركة المستحقة</p>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-black">{companyCommission.toLocaleString()} <span className="text-lg font-bold">ج.م</span></h3>
            <button 
              onClick={() => alert("يرجى التواصل مع الإدارة لسداد العمولة المستحقة")}
              className="bg-white text-gray-900 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-colors shadow-lg"
            >
              سداد للشركة
            </button>
          </div>
          <p className="text-[10px] mt-6 opacity-40 leading-relaxed">
            عمولة الشركة 20% من قيمة خدمة التوصيل لكل طلب. يتم سدادها للشركة فقط بشكل دوري.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-[80px]" />
      </div>

      {/* مديونية الطيارين للمحل */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <Wallet className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wider">مستحقات حالية لدى الطيارين</p>
          </div>
          <h3 className="text-4xl font-black text-gray-900">{balance.toLocaleString()} <span className="text-lg font-bold text-gray-400">ج.م</span></h3>
          <p className="text-[10px] text-gray-400 mt-6 leading-relaxed">
            هذا الرصيد يمثل مجموع مبالغ الطلبات التي تم توصيلها ولم يقم الطيارون بتوريدها لك بعد.
          </p>
          <div className="flex gap-3 mt-6">
            <button className="flex-1 bg-gray-50 hover:bg-gray-100 py-3 rounded-2xl text-xs font-bold transition-all text-gray-600">سجل التحصيلات</button>
            <button className="flex-1 bg-gray-50 hover:bg-gray-100 py-3 rounded-2xl text-xs font-bold transition-all text-gray-600">دليل المحفظة</button>
          </div>
        </div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-orange/10 blur-[80px] rounded-full" />
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-gray-900 px-2">آخر العمليات</h4>
        {orders.filter(o => o.status === "تم التوصيل").slice(0, 5).map(order => (
          <div key={order.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">تحصيل طلب #{order.id.slice(0, 8)}</p>
                <p className="text-[10px] text-gray-400">{order.time}</p>
              </div>
            </div>
            <span className="font-bold text-green-600">+{order.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setActiveView("store")}
          className="bg-white p-2 rounded-xl shadow-sm text-gray-400"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">إعدادات المحل</h2>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-6 shadow-sm">
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-2">اسم المحل</label>
          <input 
            type="text" 
            value={settingsData.name}
            onChange={(e) => setSettingsData({...settingsData, name: e.target.value})}
            className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold text-gray-800"
            placeholder="اسم المطعم أو المحل"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 block mb-2">رقم الهاتف</label>
          <input 
            type="tel" 
            value={settingsData.phone}
            onChange={(e) => setSettingsData({...settingsData, phone: e.target.value})}
            className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold text-gray-800"
            placeholder="رقم هاتف المحل"
          />
        </div>

        <div className="pt-4 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-400 mb-4">موقع المحل على الخريطة</p>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-orange/10 text-brand-orange rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">
                  {vendorLocation ? "الموقع محفوظ" : "الموقع غير محدد"}
                </p>
                {vendorLocation && (
                  <p className="text-[10px] text-gray-400">يمكنك تحديث الموقع من هنا</p>
                )}
              </div>
            </div>
            <button 
              onClick={handleUpdateLocation}
              disabled={savingLocation}
              className="text-brand-orange text-xs font-bold hover:underline disabled:opacity-50"
            >
              {savingLocation ? "جاري التحديث..." : (vendorLocation ? "تحديث الموقع" : "تحديد الآن")}
            </button>
          </div>
        </div>

        <button 
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="w-full bg-brand-orange text-white py-5 rounded-2xl font-bold shadow-lg shadow-orange-100 disabled:opacity-50 active:scale-95 transition-all mt-4"
        >
          {savingSettings ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>

        <button 
          onClick={() => setShowPasswordModal(true)}
          className="w-full bg-gray-900 text-white py-5 rounded-2xl font-bold shadow-lg shadow-gray-100 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-5 h-5" />
          تغيير كلمة السر
        </button>
      </div>
    </div>
  );

  const renderHistoryView = () => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">سجل العمليات</h2>
          {orders.some(o => o.status === "ملغي") && (
            <button 
              onClick={handleClearCanceled}
              className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <XCircle className="w-4 h-4" />
              تنظيف الملغي
            </button>
          )}
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold">إجمالي الطلبات</p>
              <p className="text-xl font-black text-gray-900">{orders.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold">طلبات اليوم</p>
              <p className="text-xl font-black text-brand-orange">{todayOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {orders.map((order, index) => (
            <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  order.status === "تم التوصيل" ? "bg-green-50 text-green-600" : 
                  order.status === "ملغي" ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400"
                }`}>
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{order.customer}</p>
                  <p className="text-[10px] text-gray-400">{order.time} • {order.amount}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold ${
                order.status === "تم التوصيل" ? "text-green-600" : 
                order.status === "ملغي" ? "text-red-600" : "text-gray-400"
              }`}>{order.status}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative overflow-hidden font-sans" dir="rtl">
      <PushNotificationManager userId={vendorId} />
      {renderHeader()}
      {renderDrawer()}

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-400 font-bold">جاري تحميل البيانات...</p>
          </div>
        ) : activeView === "store" ? (
          renderStoreView()
        ) : activeView === "wallet" ? (
          renderWalletView()
        ) : activeView === "settings" ? (
          renderSettingsView()
        ) : (
          renderHistoryView()
        )}
      </main>

      {/* Floating Action Button */}
      {activeView === "store" && (
        <button 
          onClick={() => handleOpenForm()}
          className="fixed bottom-8 left-6 bg-brand-orange text-white w-14 h-14 rounded-2xl shadow-xl shadow-orange-200 flex items-center justify-center active:scale-95 hover:scale-105 transition-all z-30"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Order Modal (Simplified) */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative">
              <button onClick={() => setShowPasswordModal(false)} className="absolute top-6 left-6 text-gray-400">×</button>
              <h2 className="text-xl font-black mb-6">تغيير كلمة السر</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">كلمة السر الجديدة</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">تأكيد كلمة السر</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold" 
                  />
                </div>
                {passwordError && <p className="text-red-500 text-xs font-bold">{passwordError}</p>}
                <button 
                  onClick={handleChangePassword} 
                  disabled={changingPassword}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold disabled:opacity-50"
                >
                  {changingPassword ? "جاري التغيير..." : "حفظ التغييرات"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOrderForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md mx-auto rounded-t-[40px] p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingOrder ? "تعديل الطلب" : "طلب طيار جديد"}
                </h2>
                <button 
                  onClick={() => {
                    setShowOrderForm(false);
                    localStorage.removeItem("pending_order_form");
                    localStorage.removeItem("pending_order_invoice");
                  }}
                  className="bg-gray-100 p-2 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">اسم العميل</label>
                  <input 
                    type="text" 
                    value={formData.customer}
                    onChange={(e) => setFormData({...formData, customer: e.target.value})}
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange" 
                    placeholder="مثلاً: محمد علي" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">رقم الهاتف</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange" 
                    placeholder="01xxxxxxxxx" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">العنوان بالتفصيل</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange" 
                    placeholder="الحي، الشارع، رقم العمارة" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-2">قيمة الأوردر (ج.م)</label>
                    <input 
                      type="number" 
                      value={formData.orderValue}
                      onChange={(e) => setFormData({...formData, orderValue: e.target.value})}
                      className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange" 
                      placeholder="مثلاً: 150" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-2">سعر التوصيل (ج.م)</label>
                    <input 
                      type="number" 
                      value={formData.deliveryFee}
                      onChange={(e) => setFormData({...formData, deliveryFee: e.target.value})}
                      className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold text-brand-orange" 
                      placeholder="30" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-2">وقت التحضير (دقيقة)</label>
                    <select 
                      value={formData.prepTime}
                      onChange={(e) => setFormData({...formData, prepTime: e.target.value})}
                      className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold text-brand-orange appearance-none text-center"
                    >
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="20">20</option>
                      <option value="25">25</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">ملاحظات إضافية (اختياري)</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange resize-none h-20 text-xs" 
                    placeholder="مثلاً: الشقة بالدور الرابع، الجرس معطل..."
                  ></textarea>
                </div>

                {/* ملخص الحسابات */}
                {(formData.orderValue || formData.deliveryFee) && (
                  <div className="bg-brand-orange/5 p-5 rounded-[24px] border border-brand-orange/10 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-bold">قيمة الأوردر:</span>
                      <span className="text-gray-900 font-black">{formData.orderValue || 0} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-bold">سعر التوصيل:</span>
                      <span className="text-brand-orange font-black">+{formData.deliveryFee || 0} ج.م</span>
                    </div>
                    <div className="h-px bg-brand-orange/10 my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-900 font-black">الإجمالي المطلوب من العميل:</span>
                      <span className="text-xl text-brand-orange font-black">
                        {(Number(formData.orderValue || 0) + Number(formData.deliveryFee || 0)).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <input 
                    type="file" 
                    id="invoice-upload" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleInvoiceUpload} 
                  />
                  <label 
                    htmlFor="invoice-upload"
                    className={`flex-1 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold cursor-pointer transition-all border-2 border-dashed ${
                      invoiceUrl ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {uploadingInvoice ? (
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : invoiceUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={invoiceUrl} alt="Invoice" className="w-12 h-12 object-cover rounded-lg shadow-sm" />
                        <span className="text-[10px]">تم التقاط الصورة</span>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-6 h-6" />
                        <span className="text-xs">تصوير أو رفع الفاتورة</span>
                      </>
                    )}
                  </label>
                  <button 
                    type="button"
                    onClick={handlePickCustomerLocation}
                    className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                      formData.customerCoords ? "bg-green-600 text-white shadow-lg shadow-green-100" : "bg-gray-900 text-white"
                    }`}
                  >
                    <LocationMarker size={20} pulse={formData.customerCoords ? false : true} />
                    {formData.customerCoords ? "تم تحديد الموقع" : "تحديد موقع العميل"}
                  </button>
                </div>

                <button 
                  onClick={handleSaveOrder}
                  disabled={!formData.customer || !formData.orderValue || uploadingInvoice}
                  className="w-full bg-brand-orange text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {editingOrder ? "حفظ التعديلات" : "إرسال الطلب الآن"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
