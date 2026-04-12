"use client";

import { useState } from "react";
import { History, CheckCircle, XCircle, Phone, MapPin, Truck, Package, Calendar, ChevronDown, ChevronUp, Eye } from "lucide-react";
import type { Order } from "../types";
import { translateVendorOrderStatus } from "../utils";

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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">سجل العمليات</h2>

      {/* Filter Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
        {(["today", "week", "month"] as FilterPeriod[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${
              filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-100 rounded-[20px] p-4 text-center">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-[9px] font-bold text-green-600 uppercase">مكتمل</p>
            <p className="text-xl font-black text-green-700">{totalDelivered}</p>
          </div>
          <div className="bg-sky-50 border border-sky-100 rounded-[20px] p-4 text-center">
            <Package className="w-5 h-5 text-sky-500 mx-auto mb-1" />
            <p className="text-[9px] font-bold text-sky-600 uppercase">إجمالي المبيعات</p>
            <p className="text-xl font-black text-sky-700">{totalValue.toLocaleString()} ج.م</p>
          </div>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-gray-50 p-10 rounded-[32px] text-center border border-dashed border-gray-200">
            <History className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-xs text-gray-400 font-bold">لا توجد طلبات في هذه الفترة</p>
          </div>
        ) : (
          filtered.map((order) => {
            const isExpanded = expandedId === order.id;
            const isDelivered = order.status === "delivered";
            const financials = (order as any).financials;
            return (
              <div
                key={order.id}
                className="bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-right"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isDelivered ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {isDelivered ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{order.customer}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-gray-400 font-bold">#{order.id.slice(0, 8)}</span>
                        <span className="text-[9px] text-gray-400">•</span>
                        <span className="text-[9px] text-gray-400 font-bold">{order.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-900">{order.amount}</p>
                      <span
                        className={`text-[9px] font-bold ${isDelivered ? "text-green-600" : "text-red-600"}`}
                      >
                        {translateVendorOrderStatus(order.status)}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">
                    {/* Customer Info */}
                    <div className="bg-gray-50 rounded-[16px] p-3 space-y-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase">بيانات العميل</p>
                      <div className="flex items-center gap-2 text-xs text-gray-700 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        {order.address}
                      </div>
                      {order.phone && (
                        <a
                          href={`tel:${order.phone}`}
                          className="flex items-center gap-2 text-xs text-sky-600 font-bold"
                        >
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          {order.phone}
                        </a>
                      )}
                      {(order as any).notes && (
                        <p className="text-[10px] text-gray-500">ملاحظات: {(order as any).notes}</p>
                      )}
                    </div>

                    {/* Driver Info */}
                    {order.driver && (
                      <div className="bg-sky-50 rounded-[16px] p-3 space-y-2">
                        <p className="text-[10px] font-black text-sky-600 uppercase">الطيار</p>
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                          <p className="text-xs font-bold text-sky-800">{order.driver}</p>
                          {order.driverPhone && (
                            <a href={`tel:${order.driverPhone}`} className="mr-auto">
                              <Phone className="w-4 h-4 text-sky-400" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Multi-Invoice Preview for Sikka */}
                    {order.customers && order.customers.length > 0 && order.customers.some(c => c.invoice_url) && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {order.customers.map((cust, idx) => cust.invoice_url && (
                          <button 
                            key={idx} 
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewImage?.(cust.invoice_url!);
                            }}
                            className="relative w-12 h-12 rounded-xl overflow-hidden border border-orange-100 shadow-sm group/mini bg-white/50 active:scale-95 transition-transform"
                          >
                            <img 
                              src={cust.invoice_url} 
                              alt={`Invoice ${idx}`} 
                              className="w-full h-full object-contain"
                            />
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

                    {/* Financials */}
                    <div className="bg-slate-50 rounded-[16px] p-3 space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase">التفاصيل المالية</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold">قيمة الطلب</p>
                          <p className="text-sm font-black text-slate-800">{order.amount}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold">سعر التوصيل</p>
                          <p className="text-sm font-black text-slate-800">{order.deliveryFee}</p>
                        </div>
                        {financials?.vendor_commission !== undefined && (
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold">عمولة الشركة</p>
                            <p className="text-sm font-black text-red-600">
                              {financials.vendor_commission.toFixed(2)} ج.م
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold">وقت الطلب</p>
                          <p className="text-sm font-black text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {order.time}
                          </p>
                        </div>
                      </div>
                      {order.vendorCollectedAt && (
                        <p className="text-[10px] text-green-600 font-bold mt-1">
                          ✓ تم تحصيل المديونية من الطيار
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
