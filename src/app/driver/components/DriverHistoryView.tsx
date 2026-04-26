"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import { History, CheckCircle, Clock, Banknote, Store, TrendingUp, MapPin, Phone, ChevronDown, ChevronUp, Eye, User, XCircle } from "lucide-react";
import type { Order } from "../types";

interface DriverHistoryViewProps {
  history: Order[];
  onPreviewImage?: (url: string) => void;
}

type FilterPeriod = "today" | "15days" | "month";

export default function DriverHistoryView({ history, onPreviewImage }: DriverHistoryViewProps) {
  const [filter, setFilter] = useState<FilterPeriod>("today");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const now = new Date();

  const filtered = (Array.isArray(history) ? history : []).filter((o) => {
    if (!o) return false;
    const updatedAt = o.statusUpdatedAt || (o as any).status_updated_at || (o as any).created_at;
    if (!updatedAt) return filter === "today";
    const d = new Date(updatedAt);
    if (isNaN(d.getTime())) return filter === "today";
    
    if (filter === "today") {
      return d.toDateString() === now.toDateString();
    } else if (filter === "15days") {
      const ago = new Date(now);
      ago.setDate(ago.getDate() - 15);
      return d >= ago;
    } else {
      const ago = new Date(now);
      ago.setDate(ago.getDate() - 30);
      return d >= ago;
    }
  });

  // V1.3.2: Exclude cancelled orders from earnings and totals
  const successfulOrders = filtered.filter(o => o && o.status === 'delivered');
  const totalEarnings = successfulOrders.reduce((acc, o) => acc + (o.financials?.driver_earnings || 0), 0);
  const totalDeliveryFees = successfulOrders.reduce((acc, o) => acc + (o.financials?.delivery_fee || 0), 0);
  const totalOrderValue = successfulOrders.reduce((acc, o) => acc + (o.financials?.order_value || 0), 0);

  // Commission = 15% of delivery fee + 1 EGP per order
  const commissionRate = 0.15;
  const commissionPerOrder = 1;
  const totalCommission = successfulOrders.reduce(
    (acc, o) => acc + ((o.financials?.delivery_fee || 0) * commissionRate) + commissionPerOrder,
    0
  );

  const filterLabels: Record<FilterPeriod, string> = {
    today: "اليوم",
    "15days": "١٥ يوم",
    month: "الشهر",
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <div className="p-1.5 bg-sky-100 dark:bg-sky-500/10 rounded-xl">
            <History className="w-5 h-5 text-sky-500" />
          </div>
          سجل التوصيلات
        </h2>
        <motion.span 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 text-[10px] font-black px-4 py-2 rounded-full border border-sky-200 dark:border-sky-900/50 shadow-lg shadow-sky-500/10"
        >
          {filtered.length} طلب
        </motion.span>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-[28px] gap-1.5 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-2xl shadow-inner">
        {(["today", "15days", "month"] as FilterPeriod[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-3.5 rounded-[22px] text-[11px] font-black transition-all duration-500 relative overflow-hidden ${
              filter === f 
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-700" 
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-white/30 dark:hover:bg-slate-800/30"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 dark:bg-slate-900/40 p-16 rounded-[48px] shadow-sm text-center border border-slate-100/50 dark:border-slate-800/50 backdrop-blur-2xl"
        >
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-950/50 rounded-[40px] flex items-center justify-center mx-auto mb-8 border border-slate-100 dark:border-slate-800/50 shadow-inner">
            <Clock className="w-12 h-12 text-slate-200 dark:text-slate-800" />
          </div>
          <p className="text-base text-slate-400 dark:text-slate-600 font-black">لا توجد توصيلات في هذه الفترة</p>
        </motion.div>
      ) : (
        <>
      {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-5">
            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl border border-emerald-100/50 dark:border-emerald-500/20 rounded-[40px] p-7 text-center shadow-xl shadow-emerald-500/10 dark:shadow-none relative overflow-hidden group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/20 rounded-[24px] flex items-center justify-center mx-auto mb-5 shadow-sm border border-emerald-100 dark:border-emerald-500/20">
                <TrendingUp className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-[0.2em] mb-2 relative z-10">صافي أرباحك</p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 relative z-10 tabular-nums">{(totalEarnings || 0).toFixed(0)} <span className="text-xs opacity-60">ج.م</span></p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl border border-sky-100/50 dark:border-sky-500/20 rounded-[40px] p-7 text-center shadow-xl shadow-sky-500/10 dark:shadow-none relative overflow-hidden group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <div className="w-14 h-14 bg-sky-50 dark:bg-sky-500/20 rounded-[24px] flex items-center justify-center mx-auto mb-5 shadow-sm border border-sky-100 dark:border-sky-500/20">
                <Banknote className="w-7 h-7 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="text-[10px] font-black text-sky-600/60 dark:text-sky-400/60 uppercase tracking-[0.2em] mb-2 relative z-10">إجمالي المبالغ</p>
              <p className="text-2xl font-black text-sky-700 dark:text-sky-400 relative z-10 tabular-nums">{(totalOrderValue || 0).toLocaleString()} <span className="text-xs opacity-60">ج.م</span></p>
            </motion.div>
          </div>

          {/* Commission Summary */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-950 dark:bg-slate-900/40 border border-slate-800 dark:border-slate-800/50 rounded-[48px] p-10 shadow-2xl relative overflow-hidden text-white backdrop-blur-3xl group"
          >
            <div className="absolute top-0 right-0 w-60 h-60 bg-indigo-600/15 rounded-full blur-[100px] -mr-30 -mt-30 group-hover:bg-indigo-600/25 transition-all duration-1000" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/5 backdrop-blur-xl rounded-[22px] flex items-center justify-center border border-white/10 shadow-2xl">
                  <Banknote className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">عمولة الشركة</p>
                  <p className="text-3xl font-black text-white tabular-nums">{(totalCommission || 0).toFixed(2)} <span className="text-sm opacity-20 font-bold">ج.م</span></p>
                </div>
              </div>
            </div>
            
            <div className="space-y-5 relative z-10">
              <div className="flex justify-between text-[11px] text-slate-400 font-black uppercase tracking-wider">
                <span>نسبة التوصيل ({((commissionRate || 0) * 100).toFixed(0)}%)</span>
                <span className="text-white tabular-nums">{(totalDeliveryFees * (commissionRate || 0)).toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-black uppercase tracking-wider">
                <span>رسوم ثابتة ({filtered.length} طلب)</span>
                <span className="text-white tabular-nums">{(filtered.length * (commissionPerOrder || 0)).toFixed(2)} ج.م</span>
              </div>
              <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">إجمالي رسوم التوصيل</span>
                <span className="text-xl font-black text-white tabular-nums">{(totalDeliveryFees || 0).toFixed(2)} ج.م</span>
              </div>
            </div>
          </motion.div>

          {/* Order List */}
          <div className="space-y-4">
            {filtered.map((order: any, idx) => {
              if (!order) return null;
              const vendorName = order.vendor?.full_name || order.vendor_name || order.vendor || "محل غير معروف";
              const vendorPhone = order.vendor?.phone || order.vendor_phone || order.vendorPhone || "";
              const earnings = order.financials?.driver_earnings || 0;
              const orderValue = order.financials?.order_value || order.orderValue || 0;
              const deliveryFee = order.financials?.delivery_fee || 0;
              const commission = (deliveryFee * commissionRate) + commissionPerOrder;
              const settled = !!(order.vendor_collected_at || order.vendorCollectedAt);
              const isExpanded = expandedId === order.id;
              const updatedAt = order.statusUpdatedAt || order.status_updated_at || order.created_at;
              const isCancelled = order.status === 'cancelled';

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[40px] border shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-500 overflow-hidden ${isCancelled ? 'border-rose-100/50 dark:border-rose-500/10 opacity-80' : 'border-slate-100/50 dark:border-slate-800/50'}`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full p-6 sm:p-7 flex items-center justify-between text-right group"
                  >
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[24px] flex items-center justify-center border-2 transition-all duration-500 group-hover:scale-105 ${isCancelled ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100/50 dark:border-rose-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100/50 dark:border-emerald-500/20'}`}>
                        {isCancelled ? <XCircle className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500 dark:text-rose-400" /> : <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500 dark:text-emerald-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Store className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <p className="text-base font-black text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-none">{vendorName}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black tracking-widest uppercase flex items-center gap-2">
                          #{order.id.slice(-6).toUpperCase()}
                          {updatedAt && (
                            <>
                              <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                              <span className="tabular-nums">{new Date(updatedAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5">
                      <div className="hidden xs:block">
                        <span
                          className={`text-[10px] font-black px-4 py-2 rounded-2xl border transition-all duration-300 shadow-sm ${
                            isCancelled ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/20" :
                            settled
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                              : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
                          }`}
                        >
                          {isCancelled ? "ملغي" : (settled ? "تمت التسوية" : "بانتظار المحل")}
                        </span>
                      </div>
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rotate-180' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-700'}`}>
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-6 sm:px-8 pb-8 pt-2 border-t border-slate-50 dark:border-slate-800/50 space-y-6"
                    >
                      {/* Customer info */}
                      <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-[36px] p-6 sm:p-7 space-y-5 relative border border-slate-100/50 dark:border-slate-800/50 backdrop-blur-xl shadow-inner">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                          <div className="flex-1 w-full">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-5">تفاصيل العميل</p>
                            
                            {order.customers && order.customers.length > 0 ? (
                              <div className="space-y-6">
                                {order.customers.map((c: any, i: number) => (
                                  <div key={i} className="flex items-start gap-4 border-r-4 border-sky-400/30 dark:border-sky-500/20 pr-5">
                                    <div className="flex-1">
                                      <p className="text-base font-black text-slate-900 dark:text-white">{c.name}</p>
                                      <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2.5 mt-2 leading-relaxed">
                                        <MapPin className="w-4 h-4 text-rose-500/60" />
                                        {c.address}
                                      </p>
                                    </div>
                                    <motion.a 
                                      whileHover={{ scale: 1.1, y: -2 }}
                                      whileTap={{ scale: 0.9 }}
                                      href={`tel:${c.phone}`} 
                                      className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl flex items-center justify-center text-sky-500 dark:text-sky-400 shadow-md"
                                    >
                                      <Phone size="19" />
                                    </motion.a>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="flex items-center gap-4 text-base font-black text-slate-800 dark:text-slate-200">
                                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                    <User className="w-5 h-5 text-slate-400" />
                                  </div>
                                  {order.customer || "عميل"}
                                </div>
                                <div className="flex items-center gap-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center border border-rose-100/50 dark:border-rose-500/20 shadow-sm">
                                    <MapPin className="w-5 h-5 text-rose-500/60" />
                                  </div>
                                  {order.address}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto">
                            {order.customers?.[0]?.invoice_url && (
                              <motion.button 
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPreviewImage?.(order.customers![0].invoice_url!);
                                }}
                                className="flex-1 sm:w-16 sm:h-16 h-16 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-[24px] flex items-center justify-center text-orange-500 shadow-lg overflow-hidden relative group/inv"
                              >
                                <img src={order.customers[0].invoice_url} className="w-full h-full object-cover" alt="Inv" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/inv:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye size={24} className="text-white" />
                                </div>
                              </motion.button>
                            )}
                            <motion.a 
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.9 }}
                              href={`tel:${order.customerPhone}`} 
                              className="flex-1 sm:w-16 sm:h-16 h-16 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-[24px] flex items-center justify-center text-sky-500 shadow-lg"
                            >
                              <Phone size="24" />
                            </motion.a>
                          </div>
                        </div>
                      </div>

                      {/* Financial details */}
                      {!isCancelled && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-5">
                            <div className="bg-emerald-50/50 dark:bg-emerald-500/5 rounded-[36px] p-6 border border-emerald-100/30 dark:border-emerald-500/10 text-center shadow-inner">
                              <p className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest mb-2.5">صافي ربحك</p>
                              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">+{earnings.toFixed(2)} <span className="text-xs">ج.م</span></p>
                            </div>
                            <div className="bg-amber-50/50 dark:bg-amber-500/5 rounded-[36px] p-6 border border-amber-100/30 dark:border-amber-500/10 text-center shadow-inner">
                              <p className="text-[10px] font-black text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest mb-2">عمولة الشركة</p>
                              <p className="text-lg font-black text-amber-600 dark:text-amber-400">-{commission.toFixed(2)} <span className="text-[10px]">ج.م</span></p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between px-4 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">المبلغ المطلوب من العميل</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white">{(orderValue + deliveryFee).toLocaleString()} <span className="text-xs opacity-40">ج.م</span></p>
                          </div>
                        </div>
                      )}
                      
                      {isCancelled && (
                        <div className="bg-red-50/50 dark:bg-red-500/5 p-6 rounded-[32px] border border-red-100/50 dark:border-red-500/10 text-center">
                          <p className="text-sm font-black text-red-600 dark:text-red-400 leading-relaxed">هذا الطلب تم إلغاؤه ولم يتم احتساب أي أرباح أو مديونيات</p>
                        </div>
                      )}

                      {/* Vendor contact */}
                      {vendorPhone && (
                        <motion.a
                          whileTap={{ scale: 0.98 }}
                          href={`tel:${vendorPhone}`}
                          className="flex items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3.5 rounded-[20px] text-xs font-black transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          اتصال بالمحل
                        </motion.a>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
