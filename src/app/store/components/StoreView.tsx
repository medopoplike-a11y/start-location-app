"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Clock, MapPin, Truck, Wallet, ShieldCheck, Filter, Store, Eye, Edit2, Camera, FileText, Phone, Star, Bot, Sparkles, RefreshCcw, Activity } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useEffect, memo } from "react";
import { PremiumCard } from "@/components/PremiumCard";
import ImagePreviewModal from "./ImagePreviewModal";
import RatingModal from "@/components/RatingModal";
import OrderItem from "./OrderItem";
import { supabase } from "@/lib/supabaseClient";
import RatingBadge from "@/components/RatingBadge";
import { aiVoice } from "@/lib/utils/voice"; // V19.3.0: Import AI Voice
import type { OnlineDriver, Order, VendorLocation } from "../types";
import { translateStatus } from "@/lib/utils/format";
import { useRef } from "react"; // Added useRef for voice notifications

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-100 dark:bg-slate-900/50 animate-pulse rounded-[32px] border border-slate-100/50 dark:border-slate-800/50" />,
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
  isSyncing?: boolean;
  lastSync?: Date;
}

const StoreView = memo(function StoreView({
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
  onRequestAIInsights,
  isSyncing,
  lastSync
}: StoreViewProps) {
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [vendorRating, setVendorRating] = useState(0);
  const [vendorRatingCount, setVendorRatingCount] = useState(0);
  const prevOrdersRef = useRef<Order[]>([]);

  // V19.3.0: Voice Notifications for Store
  useEffect(() => {
    if (prevOrdersRef.current.length > 0) {
      orders.forEach(order => {
        const prevOrder = prevOrdersRef.current.find(prev => prev.id === order.id);
        if (prevOrder && prevOrder.status !== order.status) {
          aiVoice.announceStatusChange(order.id, order.status, 'store');
        }
      });
    }
    prevOrdersRef.current = orders;
  }, [orders]);

  // V17.9.5: Proper useEffect for fetching vendor rating
  useEffect(() => {
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
  }, [vendorId]);

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
      case "delivered": return "bg-green-500/10 dark:bg-green-500/5 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20";
      case "cancelled": return "bg-red-500/10 dark:bg-red-500/5 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20";
      case "pending": return "bg-sky-500/10 dark:bg-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20";
      case "assigned": return "bg-amber-500/10 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20";
      case "in_transit": return "bg-purple-500/10 dark:bg-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-500/20";
      default: return "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
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
      {/* Smart Insights & Sync Header */}
      <div className="flex items-center justify-between px-1">
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRequestAIInsights}
          className="flex items-center gap-3 px-5 py-3 bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-100 dark:border-slate-800/50 rounded-[24px] transition-all hover:shadow-2xl hover:shadow-sky-500/10 group"
        >
          <div className="p-2 bg-sky-500/10 dark:bg-sky-500/20 rounded-xl shadow-inner group-hover:rotate-12 transition-transform">
            <Bot className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none mb-1.5">الذكاء الاصطناعي</p>
            <p className="text-[13px] font-black text-slate-900 dark:text-white leading-none">تحليل أداء المتجر</p>
          </div>
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse ml-1" />
        </motion.button>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-2xl border border-slate-100/50 dark:border-slate-800/50 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${isSyncing ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300 dark:bg-slate-600"}`} />
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              {isSyncing ? "جاري المزامنة..." : "متصل الآن"}
            </span>
          </div>
          {lastSync && (
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter bg-slate-50/50 dark:bg-slate-950/30 px-2 py-0.5 rounded-md">
              تحديث: {lastSync.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {activityLog.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-100 dark:border-slate-800/50 rounded-[40px] p-6 flex flex-col gap-4 shadow-2xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-500/30 to-transparent opacity-50" />
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500/10 dark:bg-sky-500/20 rounded-2xl flex items-center justify-center text-sky-500 shadow-inner">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-black text-slate-900 dark:text-white tracking-tight">آخر النشاطات</h3>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-0.5">Live Monitor</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                <div className="text-[9px] font-black text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50 uppercase tracking-[0.2em]">Active</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              <AnimatePresence mode="popLayout">
                {activityLog.slice(0, 3).map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex justify-between items-center bg-white/50 dark:bg-slate-800/30 p-4 rounded-[24px] border border-slate-100 dark:border-slate-700/30 group/item hover:bg-white dark:hover:bg-slate-800/50 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/20 dark:hover:shadow-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-sky-500 group-hover/item:scale-125 transition-transform shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                      <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 line-clamp-1 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">{log.text}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 transition-all group-hover/item:text-sky-500 whitespace-nowrap ml-4">{log.time}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <PremiumCard
            title="مديونية الطيارين"
            value={balance.toLocaleString()}
            icon={<Wallet className="w-5 h-5" />}
            subtitle="ج.م"
            delay={0.1}
            trend="تحصيل"
            trendType="positive"
          />
          <PremiumCard
            title="الطيارين المتصلين"
            value={onlineDrivers.length}
            icon={<MapPin className="w-5 h-5" />}
            subtitle="طيار"
            delay={0.2}
            trend={onlineDrivers.length > 0 ? "نشط" : "أوفلاين"}
            trendType={onlineDrivers.length > 0 ? "positive" : "neutral"}
            className={showLiveMap ? "ring-2 ring-sky-500 shadow-lg shadow-sky-100 dark:shadow-sky-500/20" : ""}
          />
        </div>

        <PremiumCard
          title="عمولة الشركة المستحقة"
          value={companyCommission.toLocaleString()}
          icon={<ShieldCheck className="w-5 h-5" />}
          subtitle="ج.م"
          className="mt-2"
          delay={0.3}
          trend="مستحقة"
          trendType="neutral"
        />
      </div>

      <AnimatePresence>
        {showLiveMap && (
          <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: "auto", opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            className="overflow-hidden mb-6"
          >
            <div className="relative p-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[48px] border border-white/40 dark:border-slate-800/50 shadow-2xl">
              <LiveMap
                drivers={onlineDrivers}
                vendors={vendorLocation ? [{ id: vendorId || "me", name: vendorName, lat: vendorLocation.lat, lng: vendorLocation.lng }] : []}
                center={vendorLocation ? [vendorLocation.lat, vendorLocation.lng] : undefined}
                className="h-72 w-full rounded-[44px] overflow-hidden"
              />
              <div className="absolute top-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 dark:border-slate-800/50 shadow-xl flex items-center gap-2">
                <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">خريطة حية</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-20 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl p-2 rounded-[32px] flex border border-slate-100 dark:border-slate-800/50 shadow-2xl shadow-slate-200/20 dark:shadow-none">
        {["نشط", "مكتمل", "ملغي"].map((tab) => {
          const isActive = (activeTab === "active" && tab === "نشط") || 
                          (activeTab === "delivered" && tab === "مكتمل") || 
                          (activeTab === "cancelled" && tab === "ملغي") || 
                          activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onSetActiveTab(tab === "نشط" ? "active" : tab === "مكتمل" ? "delivered" : "cancelled")}
              className={`flex-1 relative py-4 rounded-[24px] text-[11px] font-black tracking-[0.1em] transition-all uppercase ${
                isActive ? "text-white" : "text-slate-400 dark:text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-slate-900 dark:bg-slate-800 rounded-[24px] shadow-xl shadow-slate-900/20 dark:shadow-none"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          );
        })}
      </div>

      <section className="space-y-5 pb-10">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-500" />
            الطلبات {activeTab === "active" ? "النشطة" : activeTab}
          </h2>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">{filteredOrders.length}</span>
        </div>

        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 bg-white/40 dark:bg-slate-900/40 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm"
          >
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-slate-200 dark:text-slate-800" />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-600 font-bold">لا توجد طلبات في هذا القسم</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order, index) => (
              <OrderItem
                key={order.id}
                order={order}
                index={index}
                getStatusStyle={getStatusStyle}
                onPreviewImage={onPreviewImage}
                onRequestAIInsights={onRequestAIInsights}
                onEditOrder={onEditOrder}
                onCancelOrder={onCancelOrder}
                onQuickInvoiceUpload={onQuickInvoiceUpload}
                uploadingInvoice={uploadingInvoice}
                quickUploadOrderId={quickUploadOrderId}
                onCollectDebt={onCollectDebt}
                setRatingOrder={setRatingOrder}
              />
            ))}
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
});

export default StoreView;
