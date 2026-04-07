"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Truck, Store, User, Banknote, CheckCircle, Circle, Loader2, XCircle, Ban, Filter, Users, Camera } from "lucide-react";
import type { ActivityItem, LiveOrderItem } from "../types";

interface OrdersViewProps {
  liveOrders: LiveOrderItem[];
  activities: ActivityItem[];
  onCancelOrder?: (orderId: string) => Promise<void>;
  onUpdateStatus?: (orderId: string, status: any) => Promise<void>;
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
        <div className="bg-white border border-amber-100 rounded-[24px] p-4 shadow-sm">
          <p className="text-[9px] font-black text-amber-500 uppercase mb-1">جاري البحث</p>
          <p className="text-2xl font-black text-amber-600">{counts["جاري البحث"]}</p>
        </div>
        <div className="bg-white border border-sky-100 rounded-[24px] p-4 shadow-sm">
          <p className="text-[9px] font-black text-sky-500 uppercase mb-1">مُعيَّن</p>
          <p className="text-2xl font-black text-sky-600">{counts["تم التعيين"]}</p>
        </div>
        <div className="bg-white border border-indigo-100 rounded-[24px] p-4 shadow-sm">
          <p className="text-[9px] font-black text-indigo-500 uppercase mb-1">في الطريق</p>
          <p className="text-2xl font-black text-indigo-600">{counts["في الطريق"]}</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-[24px] p-4 shadow-sm">
          <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">تم التوصيل</p>
          <p className="text-2xl font-black text-emerald-600">{counts["تم التوصيل"]}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Orders */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[32px] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-500" />
              الطلبات الحية
            </h3>
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600">{allOrders.length} طلب</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-1" />
            {statusFilters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-full border transition-all ${
                  filter === f
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <Truck className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-bold">لا توجد طلبات في هذه الفئة</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((order, i) => {
                const sc = statusConfig[order.status] ?? statusConfig["جاري البحث"];
                const isCancelling = cancellingId === order.id_full;
                const canCancel = order.status !== "تم التوصيل" && order.status !== "ملغي";
                return (
                  <motion.div
                    key={order.id_full}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 group-hover:bg-sky-50 transition-colors">
                          <Store className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{order.vendor}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">#{order.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative group/status">
                          <button 
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition-all ${sc.bg} ${sc.text} hover:shadow-md active:scale-95`}
                            disabled={updatingId === order.id_full}
                          >
                            {updatingId === order.id_full ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sc.icon}
                            {order.status}
                          </button>
                          
                          {/* Status Manual Override Dropdown */}
                          <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-slate-100 rounded-2xl shadow-xl opacity-0 pointer-events-none group-hover/status:opacity-100 group-hover/status:pointer-events-auto transition-all z-50 p-2 space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase px-2 mb-1">تغيير الحالة يدوياً</p>
                            {Object.keys(statusConfig).map(statusLabel => (
                              <button
                                key={statusLabel}
                                onClick={() => handleUpdateStatus(order.id_full, statusLabel)}
                                className={`w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold transition-colors ${
                                  order.status === statusLabel ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
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
                            className="p-1.5 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 border border-red-100 transition-all disabled:opacity-50"
                          >
                            {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100/50 space-y-2 mt-3 mb-3">
                      {order.customers && order.customers.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-sky-500" />
                            سكة متعددة العملاء ({order.customers.length})
                          </p>
                          {order.customers.map((c, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] font-bold text-slate-600 bg-white/60 p-2 rounded-xl border border-slate-100/50">
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 bg-slate-900 text-white text-[8px] font-black flex items-center justify-center rounded-full">{idx + 1}</span>
                                <span className="truncate max-w-[120px]">{c.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-100">{c.deliveryFee} ج.م</span>
                                {c.invoice_url && (
                                  <a href={c.invoice_url} target="_blank" rel="noopener noreferrer" className="p-1 bg-orange-50 text-orange-500 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors">
                                    <Camera size={10} />
                                  </a>
                                )}
                                <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'delivered' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>العميل: {order.customer}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                            <Banknote className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] font-black text-green-700">{order.delivery_fee} ج.م</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-4">
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
    </div>
  );
}
