"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Clock, MapPin, Truck, Wallet, ShieldCheck, Filter, Store, Eye, Edit2, Camera, FileText, Phone, Star, Bot } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { PremiumCard } from "@/components/PremiumCard";
import ImagePreviewModal from "./ImagePreviewModal";
import RatingModal from "@/components/RatingModal";
import { supabase } from "@/lib/supabaseClient";
import RatingBadge from "@/components/RatingBadge";
import type { OnlineDriver, Order, VendorLocation } from "../types";
import { translateStatus } from "@/lib/utils/format";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse rounded-[32px] border border-slate-100/50" />,
});

interface ActivityItem {
  id: string;
  text: string;
  time: string;
}

interface StoreViewProps {
  orders: Order[];
  searchQuery: string;
  activeTab: string;
  activityLog: ActivityItem[];
  balance: number;
  onlineDrivers: OnlineDriver[];
  companyCommission: number;
  showLiveMap: boolean;
  vendorLocation: VendorLocation | null;
  vendorId: string | null;
  vendorName: string;
  onSetActiveTab: (tab: string) => void;
  onCollectDebt: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  onEditOrder: (order: Order) => void;
  onQuickInvoiceUpload?: (order: Order) => void;
  onPreviewImage?: (url: string) => void;
  uploadingInvoice?: boolean;
  quickUploadOrderId?: string | null;
  onRequestAIInsights?: () => void;
}

export default function StoreView({
  orders,
  searchQuery,
  activeTab,
  activityLog,
  balance,
  onlineDrivers,
  companyCommission,
  showLiveMap,
  vendorLocation,
  vendorId,
  vendorName,
  onSetActiveTab,
  onCollectDebt,
  onCancelOrder,
  onEditOrder,
  onQuickInvoiceUpload,
  onPreviewImage,
  uploadingInvoice,
  quickUploadOrderId,
  onRequestAIInsights
}: StoreViewProps) {
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [vendorRating, setVendorRating] = useState(0);
  const [vendorRatingCount, setVendorRatingCount] = useState(0);

  // Fetch Vendor Rating
  useState(() => {
    if (vendorId) {
      supabase.from('ratings').select('rating').eq('to_id', vendorId)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const avg = data.reduce((acc, r) => acc + r.rating, 0) / data.length;
            setVendorRating(avg);
            setVendorRatingCount(data.length);
          }
        });
    }
  });

  const filteredOrders = orders.filter((o) => {
    // V1.5.4: Improved filter logic for Store tabs
    const status = o.status;
    const tab = activeTab.toLowerCase();
    
    let statusMatch = false;
    if (tab === "نشط" || tab === "active") {
      statusMatch = status !== "delivered" && status !== "cancelled";
    } else if (tab === "مكتمل" || tab === "delivered") {
      statusMatch = status === "delivered";
    } else if (tab === "ملغي" || tab === "cancelled") {
      statusMatch = status === "cancelled";
    }
    
    if (!statusMatch) return false;

    // 2. Then filter by search query (Optional)
    const search = searchQuery.trim().toLowerCase();
    if (!search) return true;
    
    const normalize = (str: string) => 
      str.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
         .replace(/[۰-۹]/g, d => "۰۱۲۳٤۵۶۷٨٩".indexOf(d).toString())
         .toLowerCase();

    const normalizedSearch = normalize(search);
    return (
      normalize(o.customer || "").includes(normalizedSearch) || 
      normalize(o.id || "").includes(normalizedSearch) ||
      normalize(o.phone || "").includes(normalizedSearch) ||
      normalize(o.address || "").includes(normalizedSearch)
    );
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-500/10 text-green-600 border-green-100";
      case "cancelled": return "bg-red-500/10 text-red-600 border-red-100";
      case "pending": return "bg-sky-500/10 text-sky-600 border-sky-100";
      case "assigned": return "bg-amber-500/10 text-amber-600 border-amber-100";
      case "in_transit": return "bg-purple-500/10 text-purple-600 border-purple-100";
      default: return "bg-slate-100 text-slate-500 border-slate-200";
    }
  };

  const submitRating = async (rating: number, comment: string) => {
    if (!ratingOrder || !vendorId) return;
    
    try {
      const { error } = await supabase.from('ratings').insert({
        order_id: ratingOrder.id,
        from_id: vendorId,
        to_id: ratingOrder.driverId,
        rating,
        comment,
        type: 'vendor_to_driver'
      });

      if (error) throw error;
      setRatingOrder(null);
    } catch (err) {
      console.error("Error submitting rating:", err);
      alert("فشل إرسال التقييم، يرجى المحاولة لاحقاً");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {activityLog.length > 0 && (
          <div className="bg-slate-900/5 backdrop-blur-xl border border-white/20 rounded-[28px] p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 bottom-0 w-1 bg-sky-500/50 group-hover:bg-sky-500 transition-colors" />
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">آخر النشاطات</span>
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
            </div>
            <AnimatePresence mode="popLayout">
              {activityLog.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex justify-between items-center bg-white/40 p-2 rounded-xl border border-white/40"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span className="text-[10px] font-bold text-slate-700">{log.text}</span>
                  </div>
                  <span className="text-[8px] font-black text-slate-400 bg-white/60 px-2 py-0.5 rounded-lg border border-slate-100">{log.time}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <PremiumCard
            title="مديونية الطيارين"
            value={balance.toLocaleString()}
            icon={<div className="bg-green-500/10 p-2 rounded-xl"><Wallet className="text-green-600 w-5 h-5" /></div>}
            subtitle="ج.م"
            delay={0.1}
          />
          <PremiumCard
            title="الطيارين المتصلين"
            value={onlineDrivers.length}
            icon={<div className="bg-sky-500/10 p-2 rounded-xl"><MapPin className="text-sky-600 w-5 h-5" /></div>}
            subtitle="طيار"
            delay={0.2}
            className={showLiveMap ? "ring-2 ring-sky-500 shadow-lg shadow-sky-100" : ""}
          />
        </div>

        <PremiumCard
          title="عمولة الشركة المستحقة"
          value={companyCommission.toLocaleString()}
          icon={<div className="bg-red-500/10 p-2 rounded-xl"><ShieldCheck className="text-red-600 w-5 h-5" /></div>}
          subtitle="ج.م"
          className="mt-2"
          delay={0.3}
        />
      </div>

      <AnimatePresence>
        {showLiveMap && (
          <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: "auto", opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <LiveMap
              drivers={onlineDrivers}
              vendors={vendorLocation ? [{ id: vendorId || "me", name: vendorName, lat: vendorLocation.lat, lng: vendorLocation.lng }] : []}
              center={vendorLocation ? [vendorLocation.lat, vendorLocation.lng] : undefined}
              className="h-64 w-full rounded-[40px] overflow-hidden shadow-xl border border-white/20"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-20 z-30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-[28px] flex border border-white/40 dark:border-slate-800 shadow-sm">
        {["نشط", "مكتمل", "ملغي"].map((tab) => (
          <motion.button
            key={tab}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSetActiveTab(tab === "نشط" ? "active" : tab)}
            className={`flex-1 py-3.5 rounded-[22px] text-[10px] font-black tracking-wider transition-all uppercase ${
              (activeTab === "active" && tab === "نشط") || activeTab === tab
                ? "bg-slate-900 dark:bg-slate-800 text-white shadow-lg shadow-slate-200 dark:shadow-none"
                : "text-slate-400 dark:text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
            }`}
          >
            {tab}
          </motion.button>
        ))}
      </div>

      <section className="space-y-5 pb-10">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-500" />
            الطلبات {activeTab === "active" ? "النشطة" : activeTab}
          </h2>
          <span className="text-[10px] font-black text-slate-400 bg-slate-100/50 px-3 py-1 rounded-full border border-slate-100">{filteredOrders.length}</span>
        </div>

        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 bg-white/40 rounded-[40px] border border-dashed border-slate-200 backdrop-blur-sm"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-sm text-slate-400 font-bold">لا توجد طلبات في هذا القسم</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order, index) => {
              const isDelivered = order.status === "delivered";
              const isCancelled = order.status === "cancelled";
              const isEditable = !isDelivered && !isCancelled;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-1 h-full bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 group-hover:bg-slate-900 dark:group-hover:bg-slate-100 group-hover:text-white dark:group-hover:text-slate-900 transition-all shrink-0">
                        <Store className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{order.customer}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700 tracking-tighter">#{order.id.slice(0, 8)}</span>
                          <span className={`text-[9px] px-3 py-1 rounded-full font-black border ${getStatusStyle(order.status)}`}>
                            {translateStatus(order.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="flex flex-col items-end">
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400">ج.م</span>
                          {order.amount.replace(" ج.م", "")}
                        </p>
                        <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">الإجمالي</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3.5 rounded-[22px] border border-slate-100/50 dark:border-slate-700/50 flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"><MapPin className="w-3.5 h-3.5 text-red-500" /></div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-tight">العنوان</p>
                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate">{order.address}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3.5 rounded-[22px] border border-slate-100/50 dark:border-slate-700/50 flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"><Clock className="w-3.5 h-3.5 text-sky-500" /></div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-tight">وقت الطلب</p>
                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">{order.time}</p>
                      </div>
                    </div>
                  </div>

                  {/* Unified Invoice Preview (Multi-stop + Legacy) */}
                  {((order.customers && order.customers.some(c => c.invoice_url)) || order.invoiceUrl) && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {/* Legacy/Quick Single Invoice */}
                      {order.invoiceUrl && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewImage?.(order.invoiceUrl!);
                          }}
                          className="relative w-14 h-14 rounded-xl overflow-hidden border border-sky-100 shadow-sm group/mini bg-white/50 active:scale-95 transition-transform"
                        >
                          <img 
                            src={order.invoiceUrl} 
                            alt="" 
                            crossOrigin="anonymous"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes('retry=1')) {
                                target.src = `${target.src}${target.src.includes('?') ? '&' : '?'}retry=1`;
                              }
                            }}
                            className="w-full h-full object-contain relative z-10"
                          />
                          <Camera size={14} className="absolute inset-0 m-auto text-gray-300 opacity-20 z-0" />
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover/mini:opacity-100 transition-opacity">
                            <Eye className="text-white w-3 h-3" />
                          </div>
                          <div className="absolute top-0.5 right-0.5 bg-sky-500 text-white text-[6px] px-1 py-0.5 rounded-md font-black">
                            عام
                          </div>
                        </button>
                      )}
                      
                      {/* Customer-specific Invoices */}
                      {order.customers?.map((cust, idx) => cust.invoice_url && (
                        <button 
                          key={idx} 
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewImage?.(cust.invoice_url!);
                          }}
                          className="relative w-14 h-14 rounded-xl overflow-hidden border border-orange-100 shadow-sm group/mini bg-white/50 active:scale-95 transition-transform"
                        >
                          <img 
                            src={cust.invoice_url} 
                            alt="" 
                            crossOrigin="anonymous"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes('retry=1')) {
                                target.src = `${target.src}${target.src.includes('?') ? '&' : '?'}retry=1`;
                              }
                            }}
                            className="w-full h-full object-contain relative z-10"
                          />
                          <Camera size={14} className="absolute inset-0 m-auto text-gray-300 opacity-20 z-0" />
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover/mini:opacity-100 transition-opacity">
                            <Eye className="text-white w-3 h-3" />
                          </div>
                          <div className="absolute top-0.5 right-0.5 bg-orange-500 text-white text-[6px] px-1 py-0.5 rounded-md font-black">
                            {idx + 1}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mb-6 bg-slate-50/30 p-3 rounded-[24px] border border-slate-100/50 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">الفواتير</span>
                      </div>
                    </div>
                    
                    {!order.invoiceUrl && (!order.customers || !order.customers.some(c => c.invoice_url)) && (
                      <div className="flex items-center justify-between py-1 px-2 border border-dashed border-slate-200 rounded-xl bg-white/50">
                        <p className="text-[8px] font-bold text-slate-400 italic">لا توجد فاتورة مرفوعة</p>
                        {isEditable && onQuickInvoiceUpload && (
                          <button
                            onClick={() => onQuickInvoiceUpload(order)}
                            className="bg-orange-500 text-white text-[8px] font-black px-3 py-1 rounded-lg active:scale-95 transition-all"
                          >
                            تصوير
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 relative group-hover:border-sky-200 transition-all overflow-hidden">
                        {order.driver ? (
                          <div className="bg-slate-900 dark:bg-slate-700 w-full h-full flex items-center justify-center text-white text-xs font-black uppercase">
                            {order.driver.charAt(0)}
                          </div>
                        ) : (
                          <Truck className="w-5 h-5 text-slate-200 dark:text-slate-700 animate-pulse" />
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">الطيار</p>
                        <div className="flex flex-col">
                          <p className={`text-xs font-black ${order.driver ? "text-slate-800 dark:text-slate-200" : "text-sky-500 animate-pulse"}`}>
                            {order.driver || "بانتظار الموافقة..."}
                          </p>
                          {order.driverPhone && (
                            <a 
                              href={`tel:${order.driverPhone}`}
                              className="text-[10px] font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              {order.driverPhone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {isEditable && !order.invoiceUrl && onQuickInvoiceUpload && (
                        <motion.button
                          onClick={() => onQuickInvoiceUpload(order)}
                          disabled={uploadingInvoice && quickUploadOrderId === order.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`flex items-center justify-center w-10 h-10 rounded-xl shadow-lg transition-all ${
                            uploadingInvoice && quickUploadOrderId === order.id
                              ? "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed"
                              : "bg-orange-500 text-white shadow-orange-100"
                          }`}
                          title={uploadingInvoice && quickUploadOrderId === order.id ? "جاري الرفع..." : "تصوير الفاتورة مباشر"}
                        >
                          {uploadingInvoice && quickUploadOrderId === order.id ? (
                            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5" />
                          )}
                        </motion.button>
                      )}
                      {isEditable ? (
                        <>
                          <motion.button
                            onClick={() => onEditOrder(order)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white py-2.5 px-4 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            تعديل
                          </motion.button>
                          <motion.button
                            onClick={() => onCancelOrder(order.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-red-500 hover:bg-red-600 text-white py-2.5 px-4 rounded-2xl font-bold text-sm shadow-lg shadow-red-100 transition-all"
                          >
                            إلغاء
                          </motion.button>
                        </>
                      ) : (
                        <motion.button
                          onClick={() => onEditOrder(order)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-2xl font-bold text-sm transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          تفاصيل
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {order.status === "delivered" && (
                    <div className="mt-4 flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setRatingOrder(order)}
                        className="w-full bg-blue-600/10 text-blue-600 py-3 rounded-2xl text-[10px] font-black border border-blue-600/20 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Star className="w-4 h-4" />
                        تقييم تجربة الطيار
                      </motion.button>
                    </div>
                  )}

                  {!order.vendorCollectedAt && (
                    <div className="mt-5">
                      {order.driverConfirmedAt ? (
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onCollectDebt(order.id)}
                          className="w-full bg-green-500 text-white py-4 rounded-[24px] text-[11px] font-black hover:bg-green-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-100"
                        >
                          <CheckCircle className="w-5 h-5" />
                          تأكيد استلام المديونية ({order.amount})
                        </motion.button>
                      ) : (
                        (order.status === "delivered" || order.status === "in_transit") && (
                          <div className="w-full bg-slate-50/80 text-slate-400 py-4 rounded-[24px] text-[10px] font-black flex items-center justify-center gap-3 border border-dashed border-slate-200 backdrop-blur-sm">
                            <Clock className="w-4 h-4 text-sky-400/50" />
                            بانتظار طلب التسوية من الطيار
                          </div>
                        )
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </section>

      <RatingModal
        isOpen={!!ratingOrder}
        onClose={() => setRatingOrder(null)}
        onSubmit={submitRating}
        title="تقييم الطيار"
        subtitle="كيف كانت تجربتك مع الكابتن"
        targetName={ratingOrder?.driver || ""}
      />
    </div>
  );
}
