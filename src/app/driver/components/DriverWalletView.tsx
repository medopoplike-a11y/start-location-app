"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, CreditCard, CheckCircle, Clock, Banknote, Store, AlertCircle, MapPin, Phone } from "lucide-react";
import type { Order } from "../types";

interface WalletProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  systemBalance: number;
  overallBalance?: number;
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
  overallBalance = 0,
  deliveredOrders = [], 
  settlementHistory = [], 
  onConfirmPayment, 
  onOpenSettlementModal 
}: WalletProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // V0.9.88: Hard numeric fallbacks & Data Sanitization
  const safeTodayFees = Number(todayDeliveryFees) || 0;
  const safeSystemBalance = Number(systemBalance) || 0;
  const safeOverallBalance = Number(overallBalance) || 0;
  
  // V1.2.7: Visual Guard - Display logic fix
  // The user wants the cumulative balance (overallBalance) to show correctly.
  // If it's showing 0, we fallback to today's fees only if overallBalance is truly 0.
  const displayOverallBalance = safeOverallBalance;

  const safeOrdersList = (Array.isArray(deliveredOrders) ? deliveredOrders : []).filter(Boolean);
  const safeSettlements = (Array.isArray(settlementHistory) ? settlementHistory : []).filter(Boolean);

  const calculatedVendorDebt = safeOrdersList.reduce((acc, o) => {
    const val = Number(o?.financials?.order_value || o?.orderValue || 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const displayVendorDebt = vendorDebt > 0 ? vendorDebt : calculatedVendorDebt;

  const handleConfirm = async (orderId: string) => {
    if (!orderId || confirmingId) return;
    try {
      setConfirmingId(orderId);
      // Haptics feedback for high-end devices
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
      if (onConfirmPayment) await onConfirmPayment(orderId);
    } catch (err) {
      console.error("WalletView: Confirm payment failed", err);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-8 pt-2 pb-12 overflow-x-hidden select-none" dir="rtl">
      {/* Summary Header - Glassmorphism for Super App Feel */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-emerald-600 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden group border border-emerald-500/20"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">إجمالي الأرباح</p>
          </div>
          <h3 className="text-2xl font-black relative z-10 tabular-nums leading-none flex items-baseline gap-1">
            {displayOverallBalance.toLocaleString()} 
            <span className="text-[10px] font-bold opacity-50">ج.م</span>
          </h3>
          <p className="text-[10px] font-bold text-emerald-100/60 mt-2 relative z-10">
            {safeTodayFees > 0 ? `+${safeTodayFees} ج.م اليوم` : "لا أرباح جديدة اليوم"}
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-all duration-700" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <CreditCard className="w-4 h-4 text-orange-500" />
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">مديونية المحلات</p>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white relative z-10 tabular-nums leading-none">
            {displayVendorDebt.toLocaleString()} 
            <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 mr-1">ج.م</span>
          </h3>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 relative z-10">يجب ردها للمطاعم</p>
        </motion.div>
      </div>

      {/* System Commission Section - Dark/Premium Theme */}
      <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-orange-500/10 rounded-[22px] flex items-center justify-center border border-orange-500/30 group-hover:scale-110 transition-transform duration-500">
              <AlertCircle className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-1">إجمالي مديونية الشركة (تراكمي)</p>
              <h3 className="text-4xl font-black text-white tabular-nums flex items-baseline gap-2">
                {safeSystemBalance.toFixed(2)} 
                <span className="text-sm font-bold opacity-30">ج.م</span>
              </h3>
            </div>
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onOpenSettlementModal}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-[20px] text-[13px] font-black shadow-xl shadow-orange-500/30 active:scale-95 transition-all border border-orange-400/20"
          >
            تأكيد سداد المديونية
          </motion.button>
        </div>

        <div className="h-px bg-white/10 my-8" />

        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-white/5 p-5 rounded-[24px] border border-white/10 backdrop-blur-sm">
            <p className="text-[10px] font-black text-white/30 uppercase mb-2">مستحقات الشركة (عمولة + تأمين)</p>
            <p className="text-lg font-black text-white tabular-nums">
              {safeSystemBalance.toFixed(2)}
              <span className="text-[11px] opacity-30 mr-1"> ج.م</span>
            </p>
          </div>
          <div className="bg-white/5 p-5 rounded-[24px] border border-white/10 backdrop-blur-sm">
            <p className="text-[10px] font-black text-white/30 uppercase mb-2">مديونيات معلقة</p>
            <p className="text-lg font-black text-white tabular-nums flex items-center gap-2">
              {safeOrdersList.length}
              <span className="text-[11px] opacity-30">طلب</span>
            </p>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex border-b-2 border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5 font-black text-[13px] text-orange-600 dark:text-orange-500">
          <Banknote className="w-5 h-5" />
          مديونية المحلات (المعلقة)
          {safeOrdersList.length > 0 && (
            <motion.span 
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full"
            >
              {safeOrdersList.length}
            </motion.span>
          )}
        </div>
      </div>

      {/* Orders List - GPU Accelerated Smoother List */}
      <div className="space-y-4">
        {safeOrdersList.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-green-50 dark:bg-green-950/10 rounded-[28px] border border-green-100 dark:border-green-900/20"
          >
            <CheckCircle className="w-10 h-10 text-green-400 dark:text-green-600 mx-auto mb-3" />
            <p className="text-sm font-black text-green-700 dark:text-green-500">لا توجد مديونيات معلقة</p>
            <p className="text-[10px] text-green-500 dark:text-green-700 mt-1">جميع المبالغ تمت تسويتها بنجاح</p>
          </motion.div>
        ) : (
          <>
            <div className="bg-orange-50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/20 rounded-[24px] p-4">
              <p className="text-[11px] font-black text-orange-800 dark:text-orange-400 leading-relaxed">
                يجب عليك تسليم مبلغ المديونية للمحل ثم الضغط على &quot;تأكيد التسليم&quot; حتى يتمكن المحل من تأكيد الاستلام.
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
                <motion.div 
                  key={orderId} 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-orange-50 dark:bg-orange-950/20 rounded-2xl flex items-center justify-center border border-orange-100 dark:border-orange-900/30">
                        <Store className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm">{vendorName}</h4>
                        {vendorArea && (
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-rose-400" />
                            {vendorArea}
                          </p>
                        )}
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 mt-0.5 tracking-tight uppercase">Order #{orderId.toString().slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950/20 px-3 py-2 rounded-2xl border border-orange-100 dark:border-orange-900/30 text-center min-w-[80px]">
                      <p className="text-sm font-black text-orange-700 dark:text-orange-400">{amount.toLocaleString()} ج.م</p>
                      <p className="text-[8px] font-bold text-orange-400 dark:text-orange-600 uppercase">قيمة الطلب</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                    <div className="text-center">
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mb-0.5 uppercase">العميل</p>
                      <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate px-1">{order.customer || "عميل"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mb-0.5 uppercase">التوصيل</p>
                      <p className="text-[10px] font-black text-sky-600 dark:text-sky-400">{deliveryFee} ج.م</p>
                    </div>
                    <div className="text-center border-r border-slate-200 dark:border-slate-700 mr-1 pr-1">
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mb-0.5 uppercase">المجموع</p>
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{(amount + deliveryFee).toFixed(0)} ج.م</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {vendorPhone && (
                      <a
                        href={`tel:${vendorPhone}`}
                        className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        اتصال
                      </a>
                    )}
                    {alreadyConfirmed ? (
                      <div className="flex-1 flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/20 py-2.5 rounded-xl">
                        <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span className="text-[11px] font-black text-amber-700 dark:text-amber-500">بانتظار تأكيد المحل</span>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        disabled={confirmingId === orderId}
                        onClick={() => handleConfirm(orderId)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-emerald-400/20"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {confirmingId === orderId ? "جاري التأكيد..." : "تأكيد تسليم المبلغ"}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </div>

      {/* Settlement History - Professional Timeline Style */}
      {safeSettlements.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
            <h4 className="font-black text-slate-900 dark:text-white text-sm">سجل تسويات المديونية</h4>
          </div>
          {safeSettlements.map((s, idx) => {
            if (!s) return null;
            const isApproved = s.status === 'تم السداد';
            const isPending = s.status === 'جاري المراجعة';
            return (
              <motion.div 
                key={s.id || idx} 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm border-r-4"
                style={{ borderRightColor: isApproved ? '#10b981' : (isPending ? '#f59e0b' : '#ef4444') }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isApproved ? 'bg-green-50 dark:bg-green-950/20 text-green-600' : 
                    isPending ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                  }`}>
                    <Banknote size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-slate-900 dark:text-white">{Number(s.amount || 0).toLocaleString()} ج.م</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{s.date || ""}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                  isApproved ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' : 
                  isPending ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' : 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                }`}>
                  {s.status || "معلق"}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
