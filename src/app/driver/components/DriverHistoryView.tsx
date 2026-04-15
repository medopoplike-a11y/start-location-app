"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { History, CheckCircle, Clock, Banknote, Store, TrendingUp, MapPin, Phone, ChevronDown, ChevronUp, Eye } from "lucide-react";
import type { DBDriverOrder } from "../types";

interface DriverHistoryViewProps {
  history: DBDriverOrder[];
  onPreviewImage?: (url: string) => void;
}

type FilterPeriod = "today" | "15days" | "month";

export default function DriverHistoryView({ history, onPreviewImage }: DriverHistoryViewProps) {
  const [filter, setFilter] = useState<FilterPeriod>("today");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const now = new Date();

  const filtered = history.filter((o) => {
    const updatedAt = o.status_updated_at || o.created_at;
    if (!updatedAt) return filter === "today";
    const d = new Date(updatedAt);
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

  const totalEarnings = filtered.reduce((acc, o) => acc + (o.financials?.driver_earnings || 0), 0);
  const totalDeliveryFees = filtered.reduce((acc, o) => acc + (o.financials?.delivery_fee || 0), 0);
  const totalOrderValue = filtered.reduce((acc, o) => acc + (o.financials?.order_value || 0), 0);

  // Commission = 15% of delivery fee + 1 EGP per order
  const commissionRate = 0.15;
  const commissionPerOrder = 1;
  const totalCommission = filtered.reduce(
    (acc, o) => acc + (o.financials?.delivery_fee || 0) * commissionRate + commissionPerOrder,
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
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-sky-500" />
          سجل التوصيلات
        </h2>
        <span className="bg-sky-100 text-sky-700 text-xs font-black px-3 py-1.5 rounded-full border border-sky-200">
          {filtered.length} طلب
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
        {(["today", "15days", "month"] as FilterPeriod[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${
              filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white p-10 rounded-[40px] shadow-sm text-center border border-gray-100">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-slate-200" />
          </div>
          <p className="text-sm text-gray-400 font-bold">لا توجد توصيلات في هذه الفترة</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-[24px] p-4 text-center">
              <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-[9px] font-bold text-green-600 uppercase">صافي أرباحك</p>
              <p className="text-lg font-black text-green-700">{(totalEarnings || 0).toFixed(2)} ج.م</p>
            </div>
            <div className="bg-sky-50 border border-sky-100 rounded-[24px] p-4 text-center">
              <Banknote className="w-5 h-5 text-sky-500 mx-auto mb-1" />
              <p className="text-[9px] font-bold text-sky-600 uppercase">إجمالي المبالغ</p>
              <p className="text-lg font-black text-sky-700">{(totalOrderValue || 0).toLocaleString()} ج.م</p>
            </div>
          </div>

          {/* Commission Summary */}
          <div className="bg-orange-50 border border-orange-100 rounded-[24px] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black text-orange-700">عمولة الشركة المستحقة (يومي)</p>
              <span className="text-base font-black text-orange-600">{(totalCommission || 0).toFixed(2)} ج.م</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-orange-600 font-bold">
                <span>نسبة على سعر التوصيل ({((commissionRate || 0) * 100).toFixed(0)}%)</span>
                <span>{(totalDeliveryFees * (commissionRate || 0)).toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-[10px] text-orange-600 font-bold">
                <span>رسوم ثابتة ({filtered.length} × {commissionPerOrder} ج.م)</span>
                <span>{(filtered.length * (commissionPerOrder || 0)).toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-[10px] text-orange-800 font-black border-t border-orange-200 pt-1.5 mt-1">
                <span>إجمالي رسوم التوصيل</span>
                <span>{(totalDeliveryFees || 0).toFixed(2)} ج.م</span>
              </div>
            </div>
          </div>

          {/* Order List */}
          <div className="space-y-3">
            {filtered.map((order: any, idx) => {
              const vendorName = order.vendor?.full_name || order.vendor_name || "محل غير معروف";
              const vendorPhone = order.vendor?.phone || order.vendor_phone || "";
              const earnings = order.financials?.driver_earnings || 0;
              const orderValue = order.financials?.order_value || 0;
              const deliveryFee = order.financials?.delivery_fee || 0;
              const commission = deliveryFee * commissionRate + commissionPerOrder;
              const settled = !!order.vendor_collected_at;
              const isExpanded = expandedId === order.id;
              const updatedAt = order.status_updated_at || order.created_at;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full p-5 flex items-center justify-between text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center border border-green-100">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Store className="w-3 h-3 text-slate-400" />
                          <p className="text-sm font-black text-slate-900">{vendorName}</p>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold">
                          #{order.id.slice(0, 8)}
                          {updatedAt && ` • ${new Date(updatedAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <span
                          className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${
                            settled
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}
                        >
                          {settled ? "تمت التسوية" : "بانتظار المحل"}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-50 space-y-3">
                      {/* Customer info */}
                      <div className="bg-slate-50 rounded-[16px] p-3 space-y-1.5 relative">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">تفاصيل التوصيل</p>
                            
                            {/* Check for multi-customers (Sikka) */}
                            {order.customer_details?.customers && order.customer_details.customers.length > 0 ? (
                              <div className="space-y-3">
                                {order.customer_details.customers.map((c: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 border-r-2 border-sky-200 pr-2">
                                    <div className="flex-1">
                                      <p className="text-[11px] font-black text-slate-800">{c.name}</p>
                                      <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                        <MapPin className="w-2.5 h-2.5 text-red-400" />
                                        {c.address}
                                      </p>
                                    </div>
                                    <a href={`tel:${c.phone}`} className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-sky-500 shadow-sm">
                                      <Phone size={12} />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  {order.customer_details?.name || order.customer || "عميل"}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                                  {order.customer_details?.address || order.address}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {!order.customer_details?.customers && (
                            <div className="flex items-center gap-2 shrink-0 mr-2">
                              {order.customer_details?.customers?.[0]?.invoice_url && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPreviewImage?.(order.customer_details.customers[0].invoice_url!);
                                  }}
                                  className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-orange-500 shadow-sm active:scale-90 transition-all overflow-hidden relative group/inv"
                                >
                                  <img src={order.customer_details.customers[0].invoice_url} className="w-full h-full object-cover" alt="Inv" />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye size={12} className="text-white" />
                                  </div>
                                </button>
                              )}
                              <a href={`tel:${order.customer_details?.phone || order.customerPhone}`} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-sky-500 shadow-sm active:scale-90 transition-all">
                                <Phone size={14} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Financial details */}
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
