"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Clock, MapPin, Truck, Wallet, ShieldCheck, Filter, Store, Eye, Edit2, Camera, FileText, Phone, Star, Bot } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useEffect, memo } from "react";
import { PremiumCard } from "@/components/PremiumCard";
import ImagePreviewModal from "./ImagePreviewModal";
import RatingModal from "@/components/RatingModal";
import OrderItem from "./OrderItem";
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
  onRequestAIInsights
}: StoreViewProps) {
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [vendorRating, setVendorRating] = useState(0);
  const [vendorRatingCount, setVendorRatingCount] = useState(0);

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
          <div className="bg-slate-900/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[28px] p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 bottom-0 w-1 bg-sky-500/50 group-hover:bg-sky-500 transition-colors" />
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">آخر النشاطات</span>
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
            </div>
            <AnimatePresence mode="popLayout">
              {activityLog.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex justify-between items-center bg-white/40 dark:bg-slate-800/40 p-2 rounded-xl border border-white/40 dark:border-slate-700/40"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{log.text}</span>
                  </div>
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 bg-white/60 dark:bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800">{log.time}</span>
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
            className={showLiveMap ? "ring-2 ring-sky-500 shadow-lg shadow-sky-100 dark:shadow-none" : ""}
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
              className="h-64 w-full rounded-[40px] overflow-hidden shadow-xl border border-white/20 dark:border-slate-800"
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
