"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, CreditCard, CheckCircle, Clock, Banknote, Store, AlertCircle, MapPin, Phone } from "lucide-react";
import type { Order } from "../types";

interface WalletProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  systemBalance: number;
  deliveredOrders: Order[];
  allHistory?: Order[];
  settlementHistory?: any[];
  onConfirmPayment: (orderId: string) => Promise<void>;
  onOpenSettlementModal: () => void;
}

/**
 * V0.9.89: BULLETPROOF WALLET VIEW
 * Radical fix for crashes:
 * 1. Removed AnimatePresence for the main list (prevents layout thrashing crashes in WebViews)
 * 2. Added hard fallbacks for all numeric operations
 * 3. Sanitized all data mapping to ensure zero null-reference errors
 * 4. Simplified DOM structure to reduce memory pressure
 */
export default function DriverWalletView({ 
  todayDeliveryFees = 0, 
  vendorDebt = 0, 
  systemBalance = 0, 
  deliveredOrders = [], 
  settlementHistory = [], 
  onConfirmPayment, 
  onOpenSettlementModal 
}: WalletProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Hard numeric fallbacks
  const safeTodayFees = Number(todayDeliveryFees) || 0;
  const safeSystemBalance = Number(systemBalance) || 0;
  const safeOrdersList = Array.isArray(deliveredOrders) ? deliveredOrders : [];
  const safeSettlements = Array.isArray(settlementHistory) ? settlementHistory : [];

  const calculatedVendorDebt = safeOrdersList.reduce((acc, o) => {
    const val = Number(o?.financials?.order_value || o?.orderValue || 0);
    return acc + val;
  }, 0);

  const displayVendorDebt = vendorDebt > 0 ? vendorDebt : calculatedVendorDebt;

  const handleConfirm = async (orderId: string) => {
    if (!orderId) return;
    try {
      setConfirmingId(orderId);
      if (onConfirmPayment) await onConfirmPayment(orderId);
    } catch (err) {
      console.error("WalletView: Confirm payment failed", err);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-8 pt-2 pb-12 overflow-x-hidden" dir="rtl">
      {/* Summary Header */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-600 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <TrendingUp className="w-4 h-4 text-emerald-200" />
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">إجمالي الأرباح</p>
          </div>
          <h3 className="text-2xl font-black relative z-10 tabular-nums leading-none">
            {safeTodayFees.toFixed(0)} 
            <span className="text-[10px] font-bold opacity-50 mr-1">ج.م</span>
          </h3>
          <p className="text-[10px] font-bold text-emerald-100/60 mt-2 relative z-10">المستحقة لك اليوم</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-all" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <CreditCard className="w-4 h-4 text-orange-500" />
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">مديونية المحلات</p>
          </div>
          <h3 className="text-2xl font-black text-slate-900 relative z-10 tabular-nums leading-none">
            {displayVendorDebt.toLocaleString()} 
            <span className="text-[10px] font-bold text-slate-300 mr-1">ج.م</span>
          </h3>
          <p className="text-[10px] font-bold text-slate-400 mt-2 relative z-10">يجب ردها للمطاعم</p>
        </div>
      </div>

      {/* System Commission Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-orange-500/10 rounded-[22px] flex items-center justify-center border border-orange-500/30">
              <AlertCircle className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-1">إجمالي مديونية الشركة</p>
              <h3 className="text-4xl font-black text-white tabular-nums">
                {safeSystemBalance.toFixed(2)} 
                <span className="text-sm font-bold opacity-30 mr-2">ج.م</span>
              </h3>
            </div>
          </div>
          <button 
            onClick={onOpenSettlementModal}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-[20px] text-[13px] font-black shadow-xl shadow-orange-500/30 active:scale-95 transition-all"
          >
            تأكيد سداد المديونية
          </button>
        </div>

        <div className="h-px bg-white/10 my-8" />

        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-white/5 p-5 rounded-[24px] border border-white/10">
            <p className="text-[10px] font-black text-white/30 uppercase mb-2">عمولة النظام</p>
            <p className="text-lg font-black text-white tabular-nums">
              {safeSystemBalance.toFixed(2)}
              <span className="text-[11px] opacity-30 mr-1"> ج.م</span>
            </p>
          </div>
          <div className="bg-white/5 p-5 rounded-[24px] border border-white/10">
            <p className="text-[10px] font-black text-white/30 uppercase mb-2">الطلبات الموصلة</p>
            <p className="text-lg font-black text-white tabular-nums">
              {safeOrdersList.length}
              <span className="text-[11px] opacity-30 mr-1"> طلب</span>
            </p>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex border-b-2 border-slate-100 pb-4">
        <div className="flex items-center gap-2.5 font-black text-[13px] text-orange-600">
          <Banknote className="w-5 h-5 text-orange-500" />
          مديونية المحلات (المعلقة)
          {safeOrdersList.length > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {safeOrdersList.length}
            </span>
          )}
        </div>
      </div>

      {/* Orders List - Simplified without AnimatePresence for maximum stability */}
      <div className="space-y-4">
        {safeOrdersList.length === 0 ? (
          <div className="text-center py-16 bg-green-50 rounded-[28px] border border-green-100">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-sm font-black text-green-700">لا توجد مديونيات معلقة</p>
            <p className="text-[10px] text-green-500 mt-1">جميع المبالغ تمت تسويتها</p>
          </div>
        ) : (
          <>
            <div className="bg-orange-50 border border-orange-100 rounded-[24px] p-4">
              <p className="text-[11px] font-black text-orange-800 leading-relaxed">
                يجب عليك تسليم مبلغ المديونية للمحل ثم الضغط على "تأكيد التسليم" حتى يتمكن المحل من تأكيد الاستلام.
              </p>
            </div>
            {safeOrdersList.map((order, idx) => {
              if (!order) return null;
              const orderId = order.id || `order-${idx}`;
              const amount = Number(order.financials?.order_value || order.orderValue || 0);
              const deliveryFee = Number(order.financials?.delivery_fee || 0);
              const alreadyConfirmed = !!(order.driver_confirmed_at || order.driverConfirmedAt);
              const vendorName = order.vendor || order.vendor_name || "محل غير معروف";
              const vendorPhone = order.vendor_phone || order.vendorPhone || "";
              const vendorArea = order.vendor_area || order.vendorArea || "";

              return (
                <div key={orderId} className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
                        <Store className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">{vendorName}</h4>
                        {vendorArea && (
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-rose-400" />
                            {vendorArea}
                          </p>
                        )}
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-tight">#{orderId.toString().slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="bg-orange-50 px-3 py-2 rounded-2xl border border-orange-100 text-center min-w-[80px]">
                      <p className="text-sm font-black text-orange-700">{amount.toLocaleString()} ج.م</p>
                      <p className="text-[8px] font-bold text-orange-400 uppercase">القيمة</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50 rounded-2xl p-3">
                    <div className="text-center">
                      <p className="text-[8px] text-slate-400 font-bold mb-0.5">العميل</p>
                      <p className="text-[10px] font-black text-slate-700 truncate px-1">{order.customer || "عميل"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-slate-400 font-bold mb-0.5">التوصيل</p>
                      <p className="text-[10px] font-black text-sky-600">{deliveryFee} ج.م</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-slate-400 font-bold mb-0.5">المجموع</p>
                      <p className="text-[10px] font-black text-emerald-600">{(amount + deliveryFee).toFixed(0)} ج.م</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {vendorPhone && (
                      <a
                        href={`tel:${vendorPhone}`}
                        className="flex items-center gap-1.5 bg-sky-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        اتصال
                      </a>
                    )}
                    {alreadyConfirmed ? (
                      <div className="flex-1 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 py-2.5 rounded-xl">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="text-[11px] font-black text-amber-700">بانتظار تأكيد المحل</span>
                      </div>
                    ) : (
                      <button
                        disabled={confirmingId === orderId}
                        onClick={() => handleConfirm(orderId)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-black text-xs shadow-lg shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {confirmingId === orderId ? "جاري..." : "تأكيد تسليم المبلغ"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Settlement History - Bulletproof List */}
      {safeSettlements.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
            <h4 className="font-black text-slate-900 text-sm">سجل تسويات المديونية</h4>
          </div>
          {safeSettlements.map((s, idx) => {
            if (!s) return null;
            return (
              <div key={s.id || idx} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    s.status === 'تم السداد' ? 'bg-green-50 text-green-600' : 
                    s.status === 'جاري المراجعة' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    <Banknote size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-slate-900">{Number(s.amount || 0)} ج.م</p>
                    <p className="text-[10px] font-bold text-slate-400">{s.date || ""}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                  s.status === 'تم السداد' ? 'bg-green-100 text-green-700' : 
                  s.status === 'جاري المراجعة' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {s.status || "معلق"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
