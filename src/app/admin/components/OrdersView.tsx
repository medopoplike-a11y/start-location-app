"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Truck, Store, User, Banknote, CheckCircle, Circle, Loader2, XCircle, Ban, Filter, Users, Camera, Eye } from "lucide-react";
import type { ActivityItem, LiveOrderItem } from "../types";
import ImagePreviewModal from "@/components/ImagePreviewModal";

interface OrdersViewProps {
  liveOrders: LiveOrderItem[];
  activities: ActivityItem[];
  onCancelOrder?: (orderId: string) => Promise<void>;
  onUpdateStatus?: (orderId: string, status: string) => Promise<void>;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; dot: string; dbStatus: string }> = {
  "جاري البحث":  { label: "جاري البحث",  icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, bg: "bg-amber-50 border-amber-100",    text: "text-amber-700",   dot: "bg-amber-400",   dbStatus: "pending" },
  "تم التعيين":  { label: "تم التعيين",  icon: <Circle className="w-3.5 h-3.5" />,               bg: "bg-sky-50 border-sky-100",        text: "text-sky-700",     dot: "bg-sky-500",     dbStatus: "assigned" },
  "في الطريق":   { label: "في الطريق",   icon: <Truck className="w-3.5 h-3.5" />,                bg: "bg-indigo-50 border-indigo-100",  text: "text-indigo-700",  dot: "bg-indigo-500",  dbStatus: "in_transit" },
  "تم التوصيل": { label: "تم التوصيل", icon: <CheckCircle className="w-3.5 h-3.5" />,           bg: "bg-emerald-50 border-emerald-100",text: "text-emerald-700", dot: "bg-emerald-500", dbStatus: "delivered" },
  "ملغي":        { label: "ملغي",        icon: <XCircle className="w-3.5 h-3.5" />,               bg: "bg-red-50 border-red-100",        text: "text-red-700",     dot: "bg-red-400",     dbStatus: "cancelled" },
};

const statusFilters = ["الكل", "جاري البحث", "تم التعيين", "في الطريق", "تم التوصيل", "ملغي"];

export default function OrdersView({ liveOrders, activities, onCancelOrder, onUpdateStatus }: OrdersViewProps) {
  const [filter, setFilter] = useState("الكل");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const allOrders = [...liveOrders];
  const filtered = filter === "الكل" ? allOrders : allOrders.filter(o => o.status === filter);

  const handleCancel = async (orderId: string) => {
    if (!onCancelOrder) return;
    if (!confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) return;
    setCancellingId(orderId);
    try {
      await onCancelOrder(orderId);
    } finally {
      setCancellingId(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!onUpdateStatus) return;
    const dbStatus = Object.values(statusConfig).find(s => s.label === newStatus)?.dbStatus;
    if (!dbStatus) return;

    if (!confirm(`هل تريد تغيير حالة الطلب إلى "${newStatus}" يدوياً؟`)) return;

    setUpdatingId(orderId);
    try {
      await onUpdateStatus(orderId, dbStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = {
    "جاري البحث": allOrders.filter(o => o.status === "جاري البحث").length,
    "تم التعيين": allOrders.filter(o => o.status === "تم التعيين").length,
    "في الطريق": allOrders.filter(o => o.status === "في الطريق").length,
    "تم التوصيل": allOrders.filter(o => o.status === "تم التوصيل").length,
    "ملغي": allOrders.filter(o => o.status === "ملغي").length,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="drawer-glass rounded-[24px] p-5 shadow-sm border-amber-500/10">
          <p className="text-[9px] font-black text-amber-500 uppercase mb-1 tracking-widest">جاري البحث</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{counts["جاري البحث"]}</p>
        </div>
        <div className="drawer-glass rounded-[24px] p-5 shadow-sm border-sky-500/10">
          <p className="text-[9px] font-black text-sky-500 uppercase mb-1 tracking-widest">مُعيَّن</p>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400">{counts["تم التعيين"]}</p>
        </div>
        <div className="drawer-glass rounded-[24px] p-5 shadow-sm border-indigo-500/10">
          <p className="text-[9px] font-black text-indigo-500 uppercase mb-1 tracking-widest">في الطريق</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{counts["في الطريق"]}</p>
        </div>
        <div className="drawer-glass rounded-[24px] p-5 shadow-sm border-emerald-500/10">
          <p className="text-[9px] font-black text-emerald-500 uppercase mb-1 tracking-widest">تم التوصيل</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{counts["تم التوصيل"]}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Orders */}
        <div className="lg:col-span-2 drawer-glass rounded-[32px] p-6 shadow-sm border-none">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-500" />
              الطلبات الحية
            </h3>
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">{allOrders.length} طلب</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-1" />
            {statusFilters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 text-[10px] font-black px-4 py-2 rounded-xl border transition-all ${
                  filter === f
                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                    : "bg-white/50 dark:bg-white/5 text-slate-500 border-white/20 dark:border-slate-800 hover:border-blue-500/30"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-700">
              <Truck className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-black italic">لا توجد طلبات في هذه الفئة</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filtered.map((order, i) => {
                const sc = statusConfig[order.status] ?? statusConfig["جاري البحث"];
                const isCancelling = cancellingId === order.id_full;
                const canCancel = order.status !== "تم التوصيل" && order.status !== "ملغي";
                return (
                  <motion.div
                    key={order.id_full}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-5 rounded-3xl border border-white/10 dark:border-white/5 bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-600/10 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                          <Store className="w-5 h-5 transition-transform group-hover:scale-110" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100">{order.vendor}</p>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">#{order.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative group/status">
                          <button 
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black transition-all ${sc.bg} ${sc.text} hover:shadow-lg active:scale-95 shadow-sm`}
                            disabled={updatingId === order.id_full}
                          >
                            {updatingId === order.id_full ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sc.icon}
                            {order.status}
                          </button>
                          
                          {/* Status Manual Override Dropdown */}
                          <div className="absolute top-full right-0 mt-2 w-44 drawer-glass rounded-2xl shadow-2xl opacity-0 pointer-events-none group-hover/status:opacity-100 group-hover/status:pointer-events-auto transition-all z-50 p-2 space-y-1 border-none">
                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase px-3 py-2 tracking-widest">تغيير الحالة يدوياً</p>
                            {Object.keys(statusConfig).map(statusLabel => (
                              <button
                                key={statusLabel}
                                onClick={() => handleUpdateStatus(order.id_full, statusLabel)}
                                className={`w-full text-right px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                                  order.status === statusLabel ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                                }`}
                              >
                                {statusLabel}
                              </button>
                            ))}
                          </div>
                        </div>

                        {canCancel && onCancelOrder && (
                          <button
                            onClick={() => handleCancel(order.id_full)}
                            disabled={isCancelling}
                            title="إلغاء الطلب نهائياً"
                            className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/10 transition-all disabled:opacity-50"
                          >
                            {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5 space-y-4 mb-4">
                      {/* Unified Invoice View for Admin */}
                      {order.invoice_url && (
                        <div className="relative group/admin-invoice cursor-pointer overflow-hidden rounded-xl border border-white/20 dark:border-white/5 aspect-[21/9] bg-white dark:bg-slate-900 shadow-inner">
                          <img 
                            src={order.invoice_url} 
                            alt="Order Invoice" 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/admin-invoice:scale-110 opacity-90 group-hover/admin-invoice:opacity-100"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/admin-invoice:opacity-100 transition-opacity" />
                          <button 
                            onClick={() => setPreviewUrl(order.invoice_url!)}
                            className="absolute inset-0 opacity-0 group-hover/admin-invoice:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-[10px] font-black uppercase tracking-widest"
                          >
                            <Eye size={16} className="animate-pulse" />
                            عرض الفاتورة
                          </button>
                        </div>
                      )}

                      {order.customers && order.customers.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-3 h-3 text-blue-500" />
                            سكة متعددة العملاء ({order.customers.length})
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {order.customers.map((c, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] font-black text-slate-700 dark:text-slate-300 bg-white/40 dark:bg-white/5 p-3 rounded-xl border border-white/20 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                  <span className="w-5 h-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-black flex items-center justify-center rounded-lg shadow-sm">{idx + 1}</span>
                                  <span className="truncate max-w-[140px]">{c.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/10">{c.deliveryFee} ج.م</span>
                                  {c.invoice_url && (
                                    <button 
                                      onClick={() => setPreviewUrl(c.invoice_url!)}
                                      className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/10 hover:bg-amber-500 hover:text-white transition-all"
                                    >
                                      <Camera size={12} />
                                    </button>
                                  )}
                                  <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${c.status === 'delivered' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-[11px] font-black text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                              <User className="w-4 h-4" />
                            </div>
                            <span>العميل: {order.customer}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/10">
                            <Banknote className="w-4 h-4 text-emerald-500" />
                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">{order.delivery_fee} ج.م</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10 dark:border-white/5">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                          <p className="text-[8px] font-black text-slate-400 uppercase">إجمالي الطلب</p>
                          <p className="text-xs font-black text-slate-900">{order.amount} ج.م</p>
                        </div>
                        {order.driver && (
                          <>
                            <div className="w-px h-6 bg-slate-100" />
                            <div className="flex flex-col">
                              <p className="text-[8px] font-black text-sky-400 uppercase">الكابتن</p>
                              <p className="text-xs font-black text-sky-600 flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                {order.driver}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="text-left">
                        <p className="text-[9px] font-black text-slate-400 flex items-center justify-end gap-1.5">
                          <Clock className="w-3 h-3" />
                          {order.created_at ? new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "---"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[32px] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              آخر الأنشطة
            </h3>
          </div>

          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-bold">لا توجد أنشطة حديثة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 transition-all"
                >
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{activity.text}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase mt-0.5">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ImagePreviewModal 
        url={previewUrl}
        show={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
      />
    </div>
  );
}
