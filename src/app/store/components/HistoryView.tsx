"use client";

import { useState } from "react";
import { History, CheckCircle, XCircle, Phone, MapPin, Truck, Package, Calendar, ChevronDown, ChevronUp, Eye } from "lucide-react";
import type { Order } from "../types";
import { translateStatus } from "@/lib/utils/format";

interface HistoryViewProps {
  orders: Order[];
  onPreviewImage?: (url: string) => void;
}

type FilterPeriod = "today" | "week" | "month";

export default function HistoryView({ orders, onPreviewImage }: HistoryViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterPeriod>("today");

  const historyOrders = orders.filter((o) => o.status === "delivered" || o.status === "cancelled");

  const now = new Date();
  const filtered = historyOrders.filter((o) => {
    const d = new Date(o.createdAt);
    if (filter === "today") {
      return d.toDateString() === now.toDateString();
    } else if (filter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    } else {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return d >= monthAgo;
    }
  });

  const totalDelivered = filtered.filter((o) => o.status === "delivered").length;
  const totalValue = filtered
    .filter((o) => o.status === "delivered")
    .reduce((acc, o) => acc + Number((o as any).financials?.order_value || o.amount?.replace(/[^0-9.-]+/g, "") || 0), 0);

  const filterLabels: Record<FilterPeriod, string> = {
    today: "اليوم",
    week: "٧ أيام",
    month: "٣٠ يوم",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500/10 dark:bg-sky-500/20 rounded-2xl flex items-center justify-center text-sky-500 shadow-inner">
            <History size={20} />
          </div>
          سجل العمليات
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">تحليل البيانات</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl p-2 rounded-[32px] border border-slate-100 dark:border-slate-800/50 shadow-2xl shadow-slate-200/20 dark:shadow-none gap-2">
        {(["today", "week", "month"] as FilterPeriod[]).map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 relative py-4 rounded-[24px] text-[11px] font-black tracking-[0.1em] transition-all uppercase ${
                isActive ? "text-white" : "text-slate-400 dark:text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeFilter"
                  className="absolute inset-0 bg-slate-900 dark:bg-slate-800 rounded-[24px] shadow-xl shadow-slate-900/20 dark:shadow-none"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{filterLabels[f]}</span>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-100 dark:border-slate-800/50 rounded-[40px] p-6 text-center shadow-2xl shadow-slate-200/20 dark:shadow-none group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-3" />
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">الطلبات المكتملة</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{totalDelivered}</p>
          </div>
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-100 dark:border-slate-800/50 rounded-[40px] p-6 text-center shadow-2xl shadow-slate-200/20 dark:shadow-none group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
            <Package className="w-6 h-6 text-sky-500 mx-auto mb-3" />
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">إجمالي المبيعات</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
              <span className="text-xs font-black text-slate-400">ج.م</span>
              {totalValue.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 bg-white/40 dark:bg-slate-900/40 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm"
          >
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6">
              <History className="w-10 h-10 text-slate-200 dark:text-slate-800" />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-600 font-bold">لا توجد طلبات في هذه الفترة</p>
          </motion.div>
        ) : (
          filtered.map((order) => {
            const isExpanded = expandedId === order.id;
            const isDelivered = order.status === "delivered";
            const financials = (order as any).financials;
            return (
              <motion.div
                layout
                key={order.id}
                className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[40px] border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-2xl shadow-slate-200/20 dark:shadow-none transition-all duration-300"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full p-6 flex items-center justify-between gap-4 text-right hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                        isDelivered ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {isDelivered ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-[15px] font-black text-slate-900 dark:text-white mb-1">{order.customer}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 tracking-widest uppercase shadow-sm">#{order.id.slice(0, 8)}</span>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 opacity-50" />
                          {order.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-left">
                      <p className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1">
                        <span className="text-[10px] font-black text-slate-400">ج.م</span>
                        {order.amount.replace(" ج.م", "")}
                      </p>
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                          isDelivered 
                            ? "bg-green-500/5 text-green-600 border-green-500/20" 
                            : "bg-red-500/5 text-red-600 border-red-500/20"
                        }`}
                      >
                        {translateStatus(order.status)}
                      </span>
                    </div>
                    <div className={`p-2 rounded-xl transition-colors ${isExpanded ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-6 pb-6 pt-2 border-t border-slate-100/50 dark:border-slate-800/50 space-y-4 bg-slate-50/30 dark:bg-slate-950/20"
                    >
                      {/* Customer Info */}
                      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-5 space-y-3 rounded-[32px] border border-slate-100 dark:border-slate-800/50 shadow-inner group">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">بيانات العميل</p>
                        <div className="flex items-start gap-4 text-[13px] text-slate-700 dark:text-slate-200 font-black">
                          <div className="w-8 h-8 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-red-500" /></div>
                          <span className="mt-1.5">{order.address}</span>
                        </div>
                        {order.phone && (
                          <motion.a
                            whileHover={{ x: 3 }}
                            href={`tel:${order.phone}`}
                            className="flex items-center gap-4 text-[13px] text-sky-500 font-black bg-sky-500/5 px-4 py-2.5 rounded-2xl w-fit border border-sky-500/10"
                          >
                            <div className="w-8 h-8 bg-sky-500/10 rounded-xl flex items-center justify-center shrink-0"><Phone className="w-4 h-4 text-sky-500" /></div>
                            {order.phone}
                          </motion.a>
                        )}
                        {(order as any).notes && (
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
                            <span className="font-black opacity-50 uppercase">ملاحظات:</span>
                            <span className="font-bold">{(order as any).notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Driver Info */}
                      {order.driver && (
                        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-5 space-y-3 rounded-[32px] border border-slate-100 dark:border-slate-800/50 shadow-inner">
                          <p className="text-[10px] font-black text-sky-500 dark:text-sky-400 uppercase tracking-widest">بيانات الطيار</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center shrink-0"><Truck className="w-6 h-6 text-sky-500" /></div>
                              <div>
                                <p className="text-[13px] font-black text-slate-900 dark:text-white">{order.driver}</p>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">الطيار المسؤول</p>
                              </div>
                            </div>
                            {order.driverPhone && (
                              <motion.a 
                                whileHover={{ scale: 1.1, rotate: 10 }}
                                whileTap={{ scale: 0.9 }}
                                href={`tel:${order.driverPhone}`} 
                                className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200 dark:shadow-none"
                              >
                                <Phone className="w-5 h-5" />
                              </motion.a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Multi-Invoice Preview */}
                      {order.customers && order.customers.length > 0 && order.customers.some(c => c.invoice_url) && (
                        <div className="flex flex-wrap gap-3">
                          {order.customers.map((cust, idx) => cust.invoice_url && (
                            <motion.button 
                              key={idx} 
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreviewImage?.(cust.invoice_url!);
                              }}
                              className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-xl group/mini bg-white/50 dark:bg-slate-800/50"
                            >
                              <img 
                                src={cust.invoice_url} 
                                alt={`Invoice ${idx}`} 
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/mini:opacity-100 transition-opacity">
                                <Eye className="text-white w-4 h-4" />
                              </div>
                              <div className="absolute top-1 right-1 bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded-lg font-black shadow-lg">
                                {idx + 1}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      )}

                      {/* Financials */}
                      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-5 space-y-4 rounded-[32px] border border-slate-100 dark:border-slate-800/50 shadow-inner">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">التفاصيل المالية</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase mb-1">قيمة الطلب</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{order.amount}</p>
                          </div>
                          <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase mb-1">سعر التوصيل</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{order.deliveryFee}</p>
                          </div>
                          {financials?.vendor_commission !== undefined && (
                            <div className="bg-red-500/5 p-3.5 rounded-2xl border border-red-500/10">
                              <p className="text-[9px] text-red-400 font-black uppercase mb-1">عمولة الشركة</p>
                              <p className="text-sm font-black text-red-600 dark:text-red-400">
                                {financials.vendor_commission.toFixed(2)} ج.م
                              </p>
                            </div>
                          )}
                          <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase mb-1">وقت الطلب</p>
                            <p className="text-[11px] font-black text-slate-900 dark:text-white flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-sky-500" /> {order.time}
                            </p>
                          </div>
                        </div>
                        {order.vendorCollectedAt && (
                          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                            <CheckCircle size={14} />
                            تم تحصيل المديونية من الطيار
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
