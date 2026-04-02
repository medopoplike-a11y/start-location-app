"use client";

import { motion } from "framer-motion";
import { Clock, Truck, Store, User, Banknote, CheckCircle, Circle, Loader2, XCircle } from "lucide-react";
import type { ActivityItem, LiveOrderItem } from "../types";

interface OrdersViewProps {
  liveOrders: LiveOrderItem[];
  activities: ActivityItem[];
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; dot: string }> = {
  "جاري البحث":    { label: "جاري البحث",    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, bg: "bg-amber-50 border-amber-100",   text: "text-amber-700",  dot: "bg-amber-400"  },
  "تم التعيين":    { label: "تم التعيين",    icon: <Circle className="w-3.5 h-3.5" />,               bg: "bg-sky-50 border-sky-100",       text: "text-sky-700",    dot: "bg-sky-500"    },
  "في الطريق":     { label: "في الطريق",     icon: <Truck className="w-3.5 h-3.5" />,                bg: "bg-indigo-50 border-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  "تم التوصيل":   { label: "تم التوصيل",   icon: <CheckCircle className="w-3.5 h-3.5" />,           bg: "bg-emerald-50 border-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500"},
  "ملغي":          { label: "ملغي",          icon: <XCircle className="w-3.5 h-3.5" />,               bg: "bg-red-50 border-red-100",       text: "text-red-700",    dot: "bg-red-400"    },
};

export default function OrdersView({ liveOrders, activities }: OrdersViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Live Orders */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[32px] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-500" />
            الطلبات الحية
          </h3>
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-black text-emerald-600 uppercase">{liveOrders.length} نشط</span>
          </div>
        </div>

        {liveOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <Truck className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-bold">لا توجد طلبات نشطة الآن</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {liveOrders.map((order, i) => {
              const sc = statusConfig[order.status] ?? statusConfig["جاري البحث"];
              return (
                <motion.div
                  key={order.id_full}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
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
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black ${sc.bg} ${sc.text}`}>
                      {sc.icon}
                      {order.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                      <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-slate-600 truncate">{order.customer}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-green-50 p-2 rounded-xl">
                      <Banknote className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span className="text-[10px] font-black text-green-700">{order.delivery_fee} ج.م</span>
                    </div>
                  </div>

                  {order.driver && (
                    <div className="mt-2 flex items-center gap-2 bg-sky-50 px-3 py-1.5 rounded-xl">
                      <Truck className="w-3 h-3 text-sky-500" />
                      <span className="text-[10px] font-bold text-sky-700">مع: {order.driver}</span>
                    </div>
                  )}
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
  );
}
