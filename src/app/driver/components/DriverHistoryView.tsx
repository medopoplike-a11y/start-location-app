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
        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-sky-500" />
          سجل التوصيلات
        </h2>
        <span className="bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 text-xs font-black px-3 py-1.5 rounded-full border border-sky-200 dark:border-sky-900/50">
          {filtered.length} طلب
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl gap-1">
        {(["today", "15days", "month"] as FilterPeriod[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${
              filter === f ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 dark:text-slate-600"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-sm text-center border border-gray-100 dark:border-slate-800">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-slate-200 dark:text-slate-800" />
          </div>
          <p className="text-sm text-gray-400 dark:text-slate-600 font-bold">لا توجد توصيلات في هذه الفترة</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-[24px] p-4 text-center">
              <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-[9px] font-bold text-green-600 dark:text-green-400 uppercase">صافي أرباحك</p>
              <p className="text-lg font-black text-green-700 dark:text-green-400">{(totalEarnings || 0).toFixed(2)} ج.م</p>
            </div>
            <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 rounded-[24px] p-4 text-center">
              <Banknote className="w-5 h-5 text-sky-500 mx-auto mb-1" />
              <p className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase">إجمالي المبالغ</p>
              <p className="text-lg font-black text-sky-700 dark:text-sky-400">{(totalOrderValue || 0).toLocaleString()} ج.م</p>
            </div>
          </div>

          {/* Commission Summary */}
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-[24px] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black text-orange-700 dark:text-orange-400">عمولة الشركة المستحقة (يومي)</p>
              <span className="text-base font-black text-orange-600 dark:text-orange-500">{(totalCommission || 0).toFixed(2)} ج.م</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-orange-600 dark:text-orange-500 font-bold">
                <span>نسبة على سعر التوصيل ({((commissionRate || 0) * 100).toFixed(0)}%)</span>
                <span>{(totalDeliveryFees * (commissionRate || 0)).toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-[10px] text-orange-600 dark:text-orange-500 font-bold">
                <span>رسوم ثابتة ({filtered.length} × {commissionPerOrder} ج.م)</span>
                <span>{(filtered.length * (commissionPerOrder || 0)).toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-[10px] text-orange-800 dark:text-orange-400 font-black border-t border-orange-200 dark:border-orange-900/50 pt-1.5 mt-1">
                <span>إجمالي رسوم التوصيل</span>
                <span>{(totalDeliveryFees || 0).toFixed(2)} ج.م</span>
              </div>
            </div>
          </div>

          {/* Order List */}
          <div className="space-y-3">
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`bg-white dark:bg-slate-900 rounded-[28px] border shadow-sm overflow-hidden ${isCancelled ? 'border-red-100 dark:border-red-900/30 opacity-80' : 'border-gray-100 dark:border-slate-800'}`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full p-5 flex items-center justify-between text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${isCancelled ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30' : 'bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30'}`}>
                        {isCancelled ? <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" /> : <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Store className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <p className="text-sm font-black text-slate-900 dark:text-white">{vendorName}</p>
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                          #{order.id.slice(0, 8)}
                          {updatedAt && ` • ${new Date(updatedAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <span
                          className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${
                            isCancelled ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30" :
                            settled
                              ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30"
                              : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30"
                          }`}
                        >
                          {isCancelled ? "ملغي" : (settled ? "تمت التسوية" : "بانتظار المحل")}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-50 dark:border-slate-800 space-y-3">
                      {/* Customer info */}
                      <div className="bg-slate-50 dark:bg-slate-950 rounded-[16px] p-3 space-y-1.5 relative">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase mb-2">تفاصيل التوصيل</p>
                            
                            {/* Check for multi-customers (Sikka) */}
                            {order.customers && order.customers.length > 0 ? (
                              <div className="space-y-3">
                                {order.customers.map((c: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 border-r-2 border-sky-200 dark:border-sky-900/50 pr-2">
                                    <div className="flex-1">
                                      <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">{c.name}</p>
                                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <MapPin className="w-2.5 h-2.5 text-red-400" />
                                        {c.address}
                                      </p>
                                    </div>
                                    <a href={`tel:${c.phone}`} className="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-sky-500 dark:text-sky-400 shadow-sm">
                                      <Phone size="12" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  {order.customer || "عميل"}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                                  {order.address}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0 mr-2">
                            {order.customers?.[0]?.invoice_url && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPreviewImage?.(order.customers![0].invoice_url!);
                                }}
                                className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-orange-500 shadow-sm active:scale-90 transition-all overflow-hidden relative group/inv"
                              >
                                <img src={order.customers[0].invoice_url} className="w-full h-full object-cover" alt="Inv" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye size={12} className="text-white" />
                                </div>
                              </button>
                            )}
                            <a href={`tel:${order.customerPhone}`} className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-sky-500 shadow-sm active:scale-90 transition-all">
                              <Phone size={14} />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Financial details */}
                      {!isCancelled && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 rounded-[20px] p-3.5 border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">صافي ربحك</p>
                              <p className="text-sm font-black text-green-600">+{earnings.toFixed(2)} ج.م</p>
                            </div>
                            <div className="bg-slate-50 rounded-[20px] p-3.5 border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">عمولة الشركة</p>
                              <p className="text-sm font-black text-orange-500">-{commission.toFixed(2)} ج.م</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between px-3 pt-1">
                            <p className="text-[10px] font-bold text-slate-400">إجمالي ما تم تحصيله من العميل:</p>
                            <p className="text-xs font-black text-slate-700">{(orderValue + deliveryFee).toLocaleString()} ج.م</p>
                          </div>
                        </>
                      )}
                      
                      {isCancelled && (
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                          <p className="text-xs font-black text-red-600">هذا الطلب تم إلغاؤه ولم يتم احتساب أي أرباح أو مديونيات</p>
                        </div>
                      )}

                      {/* Vendor contact */}
                      {vendorPhone && (
                        <a
                          href={`tel:${vendorPhone}`}
                          className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          اتصال بالمحل
                        </a>
                      )}
                    </div>
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
