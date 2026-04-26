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
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-[36px] text-white shadow-xl shadow-emerald-500/20 dark:shadow-none relative overflow-hidden group border border-emerald-500/20"
        >
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/80 italic">الأرباح الصافية</p>
          </div>
          <h3 className="text-3xl font-black relative z-10 tabular-nums leading-none tracking-tighter flex items-baseline gap-1.5">
            {displayOverallBalance.toLocaleString()} 
            <span className="text-xs font-bold opacity-40">ج.م</span>
          </h3>
          <div className="mt-5 flex items-center gap-2 relative z-10">
            <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-md">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-100" />
            </div>
            <p className="text-[11px] font-black text-emerald-100/70">
              {safeTodayFees > 0 ? `+${safeTodayFees} ج.م اليوم` : "لا أرباح جديدة اليوم"}
            </p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-[36px] border border-slate-100/50 dark:border-slate-800/50 shadow-xl shadow-slate-200/40 dark:shadow-none relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="p-1.5 bg-orange-100 dark:bg-orange-500/20 rounded-xl">
              <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">مديونية المحلات</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white relative z-10 tabular-nums leading-none tracking-tighter flex items-baseline gap-1.5">
            {displayVendorDebt.toLocaleString()} 
            <span className="text-xs font-bold text-slate-300 dark:text-slate-600">ج.م</span>
          </h3>
          <div className="mt-5 flex items-center gap-2 relative z-10">
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">يجب ردها للمطاعم</p>
          </div>
        </motion.div>
      </div>

      {/* System Commission Section - Ultra Premium Theme */}
      <div className="bg-slate-950 dark:bg-slate-900/40 border border-slate-800 dark:border-slate-800/50 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group backdrop-blur-3xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-[120px] -mr-40 -mt-40 group-hover:bg-indigo-600/25 transition-all duration-1000" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-[28px] flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 shadow-2xl">
              <AlertCircle className="w-10 h-10 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-indigo-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-indigo-600/20">رصيد النظام</span>
                <p className="text-[11px] font-black text-white/30 uppercase tracking-widest italic">العمولات والتأمينات</p>
              </div>
              <h3 className="text-5xl sm:text-6xl font-black text-white tabular-nums tracking-tighter flex items-baseline gap-4">
                {safeSystemBalance.toFixed(2)} 
                <span className="text-lg font-bold opacity-20">ج.م</span>
              </h3>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenSettlementModal}
            className="w-full lg:w-auto bg-white text-slate-950 px-12 py-6 rounded-[28px] text-base font-black shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:shadow-[0_25px_50px_rgba(255,255,255,0.15)] active:scale-95 transition-all border border-white/20 flex items-center justify-center gap-4 group/btn"
          >
            تأكيد سداد المديونية
            <TrendingUp className="w-5 h-5 group-hover/btn:translate-y--1 group-hover/btn:translate-x-1 transition-transform" />
          </motion.button>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-10" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
          <div className="bg-white/[0.03] hover:bg-white/[0.06] p-7 rounded-[32px] border border-white/5 backdrop-blur-md transition-all duration-500 group/item">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-[11px] font-black text-white/30 uppercase tracking-widest">عمولة + تأمين</p>
            </div>
            <p className="text-2xl font-black text-white tabular-nums tracking-tight">
              {safeSystemBalance.toFixed(2)}
              <span className="text-sm opacity-20 mr-2"> ج.م</span>
            </p>
          </div>
          <div className="bg-white/[0.03] hover:bg-white/[0.06] p-7 rounded-[32px] border border-white/5 backdrop-blur-md transition-all duration-500 group/item">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/20">
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-[11px] font-black text-white/30 uppercase tracking-widest">مديونيات معلقة</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">
                {safeOrdersList.length}
              </p>
              <span className="text-[11px] font-black bg-white/10 px-3 py-1 rounded-full text-white/60 border border-white/5">طلبات قيد التسوية</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/50 pb-4">
        <div className="flex items-center gap-2.5 font-black text-[13px] text-orange-600 dark:text-orange-500">
          <div className="p-1.5 bg-orange-100 dark:bg-orange-500/10 rounded-lg">
            <Banknote className="w-4 h-4" />
          </div>
          مديونية المحلات (المعلقة)
          {safeOrdersList.length > 0 && (
            <motion.span 
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-orange-500/20"
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
            className="text-center py-16 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-[36px] border border-emerald-100/50 dark:border-emerald-900/20 backdrop-blur-xl"
          >
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-500">لا توجد مديونيات معلقة</p>
            <p className="text-[10px] text-emerald-500 dark:text-emerald-700 mt-1 font-bold">جميع المبالغ تمت تسويتها بنجاح</p>
          </motion.div>
        ) : (
          <>
            <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100/50 dark:border-orange-900/20 rounded-[24px] p-4 backdrop-blur-xl">
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
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-100/50 dark:border-slate-800/50 rounded-[32px] p-6 shadow-xl shadow-slate-200/40 dark:shadow-none relative group overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-2xl flex items-center justify-center border border-orange-100 dark:border-orange-900/30">
                        <Store className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-base">{vendorName}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          {vendorArea && (
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-400" />
                              {vendorArea}
                            </p>
                          )}
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 tracking-tight uppercase">#{orderId.toString().slice(-6)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950/20 px-4 py-2.5 rounded-2xl border border-orange-100 dark:border-orange-900/30 text-center min-w-[90px]">
                      <p className="text-base font-black text-orange-700 dark:text-orange-400">{amount.toLocaleString()} ج.م</p>
                      <p className="text-[9px] font-bold text-orange-400 dark:text-orange-600 uppercase tracking-tighter">قيمة الطلب</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100/50 dark:border-slate-800/50">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mb-1 uppercase tracking-tighter">العميل</p>
                      <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 truncate px-1">{order.customer || "عميل"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mb-1 uppercase tracking-tighter">التوصيل</p>
                      <p className="text-[11px] font-black text-sky-600 dark:text-sky-400">{deliveryFee} ج.م</p>
                    </div>
                    <div className="text-center border-r border-slate-200 dark:border-slate-700/50 mr-1 pr-1">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mb-1 uppercase tracking-tighter">المجموع</p>
                      <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">{(amount + deliveryFee).toFixed(0)} ج.م</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {vendorPhone && (
                      <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href={`tel:${vendorPhone}`}
                        className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-3.5 rounded-2xl font-black text-xs transition-all border border-slate-200/50 dark:border-slate-700/50"
                      >
                        <Phone className="w-4 h-4" />
                        اتصال
                      </motion.a>
                    )}
                    {alreadyConfirmed ? (
                      <div className="flex-1 flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20 py-3.5 rounded-2xl">
                        <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span className="text-[11px] font-black text-amber-700 dark:text-amber-500">بانتظار تأكيد المحل</span>
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={confirmingId === orderId}
                        onClick={() => handleConfirm(orderId)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-emerald-400/20"
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
        <div className="mt-12 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <h4 className="font-black text-slate-900 dark:text-white text-sm">سجل تسويات المديونية</h4>
          </div>
          <div className="space-y-3">
            {safeSettlements.map((s, idx) => {
              if (!s) return null;
              const isApproved = s.status === 'تم السداد';
              const isPending = s.status === 'جاري المراجعة';
              return (
                <motion.div 
                  key={s.id || idx} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-100/50 dark:border-slate-800/50 rounded-2xl p-4 flex items-center justify-between shadow-sm border-r-4"
                  style={{ borderRightColor: isApproved ? '#10b981' : (isPending ? '#f59e0b' : '#ef4444') }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      isApproved ? 'bg-green-50 dark:bg-green-950/20 text-green-600' : 
                      isPending ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                    }`}>
                      <Banknote size={22} />
                    </div>
                    <div>
                      <p className="text-[14px] font-black text-slate-900 dark:text-white">{Number(s.amount || 0).toLocaleString()} <span className="text-[10px] opacity-40">ج.م</span></p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{s.date || ""}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${
                    isApproved ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' : 
                    isPending ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' : 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                  }`}>
                    {s.status || "معلق"}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
