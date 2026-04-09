"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, BarChart3, Download, Phone, CreditCard, CheckCircle, Clock, Banknote, Store, AlertCircle } from "lucide-react";
import { PremiumCard } from "@/components/PremiumCard";
import type { Order, DBDriverOrder } from "../types";

interface WalletProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  systemBalance: number;
  orders: Order[];
  deliveredOrders: DBDriverOrder[];
  allHistory: DBDriverOrder[];
  onConfirmPayment: (orderId: string) => Promise<void>;
  onOpenSettlementModal: () => void;
}

type FilterPeriod = "today" | "15days" | "month";

export default function DriverWalletView({ todayDeliveryFees, vendorDebt, systemBalance, orders, deliveredOrders, allHistory, onConfirmPayment, onOpenSettlementModal }: WalletProps) {
  const [tab, setTab] = useState<"earnings" | "vendors">("earnings");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterPeriod>("today");

  const commissionRate = 0.15;
  const commissionPerOrder = 1;

  const now = new Date();
  const filteredHistory = (allHistory || []).filter((o) => {
    if (!o.created_at) return filter === "today";
    const d = new Date(o.created_at);
    if (filter === "today") return d.toDateString() === now.toDateString();
    if (filter === "15days") { const ago = new Date(now); ago.setDate(ago.getDate() - 15); return d >= ago; }
    const ago = new Date(now); ago.setDate(ago.getDate() - 30); return d >= ago;
  });

  const filteredFees = filteredHistory.reduce((acc, o) => acc + (o.financials?.delivery_fee || 0), 0);
  const filteredEarnings = filteredHistory.reduce((acc, o) => acc + (o.financials?.driver_earnings || 0), 0);
  const totalCommission = filteredHistory.reduce((acc, o) => acc + (o.financials?.delivery_fee || 0) * commissionRate + commissionPerOrder, 0);

  const calculatedVendorDebt = (deliveredOrders || []).reduce((acc, o) => acc + (o.financials?.order_value || 0), 0);

  const handleConfirm = async (orderId: string) => {
    setConfirmingId(orderId);
    await onConfirmPayment(orderId);
    setConfirmingId(null);
  };

  const filterLabels: Record<FilterPeriod, string> = { today: "اليوم", "15days": "١٥ يوم", month: "الشهر" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-600 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-900/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 opacity-60" />
            <p className="text-[10px] font-black uppercase tracking-wider opacity-60">صافي أرباحك</p>
          </div>
          <h3 className="text-3xl font-black">{filteredEarnings.toFixed(0)} <span className="text-xs font-bold opacity-40">ج.م</span></h3>
          <p className="text-[9px] font-bold opacity-40 mt-1">بعد خصم عمولة الشركة</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-3.5 h-3.5 text-orange-500" />
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">مديونية المحلات</p>
          </div>
          <h3 className="text-3xl font-black text-gray-900">{(vendorDebt > 0 ? vendorDebt : calculatedVendorDebt).toLocaleString()} <span className="text-xs font-bold text-gray-300">ج.م</span></h3>
          <p className="text-[9px] font-bold text-gray-400 mt-1">يجب ردها للمطاعم</p>
        </div>
      </div>

      {/* Commission Box */}
      <div className="bg-gray-900 border border-gray-800 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">إجمالي مديونية الشركة</p>
              <h3 className="text-3xl font-black text-white">
                {(systemBalance > 0 ? systemBalance : totalCommission).toFixed(2)} 
                <span className="text-sm font-bold opacity-30 mr-1.5">ج.م</span>
              </h3>
            </div>
          </div>
          <button 
            onClick={onOpenSettlementModal}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-2xl text-[11px] font-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all border border-orange-400/20"
          >
            تأكيد سداد
          </button>
        </div>

        <div className="h-px bg-white/5 my-6" />

        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-white/40 uppercase">تفاصيل الحساب المالي (١٥٪ + ١ج)</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-white/30 uppercase mb-1.5">عمولة النظام (١٥٪)</p>
              <p className="text-sm font-black text-white">{(filteredFees * commissionRate).toFixed(2)} <span className="text-[10px] opacity-30">ج.م</span></p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-white/30 uppercase mb-1.5">تأمين ثابت ({filteredHistory.length} طلب)</p>
              <p className="text-sm font-black text-white">{(filteredHistory.length * 1.0).toFixed(2)} <span className="text-[10px] opacity-30">ج.م</span></p>
            </div>
          </div>
        </div>

        {/* Filter Tabs inside commission box */}
        <div className="flex bg-white/5 p-1 rounded-xl gap-1 mt-4 border border-white/5">
          {(["today", "15days", "month"] as FilterPeriod[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab("earnings")}
          className={`flex-1 py-3 px-4 text-center font-bold text-sm transition-all ${tab === "earnings" ? "border-b-2 border-sky-500 text-sky-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <span className="flex items-center justify-center gap-2"><BarChart3 className="w-4 h-4" /> الأرباح</span>
        </button>
        <button
          onClick={() => setTab("vendors")}
          className={`flex-1 py-3 px-4 text-center font-bold text-sm transition-all ${tab === "vendors" ? "border-b-2 border-orange-500 text-orange-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <span className="flex items-center justify-center gap-2">
            <Banknote className="w-4 h-4" />
            مديونية المحلات
            {deliveredOrders.length > 0 && (
              <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{deliveredOrders.length}</span>
            )}
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "earnings" && (
          <motion.div key="earnings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-bold">لا توجد طلبات في هذه الفترة</div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm overflow-x-auto">
                <div className="min-w-[420px]">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 font-bold text-[10px] text-gray-500 uppercase border-b pb-3 mb-4 tracking-tight">
                    <span>الطلب</span>
                    <span>توصيل</span>
                    <span>ربحك</span>
                    <span>عمولة</span>
                  </div>
                  {filteredHistory.slice(0, 30).map((order, idx) => {
                        const fee = order.financials?.delivery_fee || 0;
                        const earn = order.financials?.driver_earnings || 0;
                        const comm = fee * commissionRate + commissionPerOrder;
                        
                        // Handle both array and object responses from Supabase joins
                        const rawProfiles = (order as any).profiles;
                        const vendorProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : (rawProfiles || {});
                        const vName = vendorProfile.full_name || "محل";
                        
                        return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-3 py-3 border-b border-gray-50 items-center"
                      >
                        <span className="font-semibold text-xs truncate">#{order.id.slice(0, 6)} {vName}</span>
                        <span className="font-black text-sky-600 text-xs">{fee.toFixed(0)}</span>
                        <span className="font-black text-green-600 text-xs">+{earn.toFixed(1)}</span>
                        <span className="font-black text-orange-500 text-xs">-{comm.toFixed(1)}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              onClick={() => {
                const csv = "طلب,توصيل,ربح,عمولة\n" + filteredHistory.map(o => {
                  const fee = o.financials?.delivery_fee || 0;
                  const earn = o.financials?.driver_earnings || 0;
                  const comm = fee * commissionRate + commissionPerOrder;
                  return `${o.id.slice(0, 8)},${fee},${earn.toFixed(2)},${comm.toFixed(2)}`;
                }).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "earnings.csv";
                a.click();
              }}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-gray-800 shadow-lg transition-all"
            >
              <Download className="w-5 h-5" />
              تصدير الأرباح
            </button>
          </motion.div>
        )}

        {tab === "vendors" && (
          <motion.div key="vendors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {deliveredOrders.length === 0 ? (
              <div className="text-center py-16 bg-green-50 rounded-[28px] border border-green-100">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-sm font-black text-green-700">لا توجد مديونيات معلقة</p>
                <p className="text-[10px] text-green-500 mt-1">جميع المبالغ تمت تسويتها</p>
              </div>
            ) : (
              <>
                <div className="bg-orange-50 border border-orange-100 rounded-[24px] p-4">
                  <p className="text-xs font-black text-orange-800">
                    يجب عليك تسليم مبلغ المديونية للمحل ثم الضغط على &quot;تأكيد التسليم&quot; حتى يتمكن المحل من تأكيد الاستلام.
                  </p>
                </div>
                {deliveredOrders.map((order, idx) => {
                  // Handle both array and object responses from Supabase joins
                  const rawProfiles = (order as any).profiles;
                  const vendorProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : (rawProfiles || {});
                  
                  const vendorName = vendorProfile.full_name || "محل غير معروف";
                  const vendorPhone = vendorProfile.phone || "";
                  const vendorArea = vendorProfile.area || "";
                  const amount = order.financials?.order_value || 0;
                  const deliveryFee = order.financials?.delivery_fee || 0;
                  const already = !!order.driver_confirmed_at;
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white border border-orange-100 rounded-[28px] p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
                            <Store className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900">{vendorName}</h4>
                            {vendorArea && (
                              <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 text-red-400" />
                                {vendorArea}
                              </p>
                            )}
                            <p className="text-[9px] font-bold text-slate-400">#{order.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <div className="text-left bg-orange-50 px-3 py-2 rounded-2xl border border-orange-100">
                          <p className="text-sm font-black text-orange-700">{amount.toLocaleString()} ج.م</p>
                          <p className="text-[8px] font-bold text-orange-400 uppercase">قيمة الطلب</p>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="grid grid-cols-3 gap-2 mb-3 bg-slate-50 rounded-xl p-3">
                        <div className="text-center">
                          <p className="text-[8px] text-slate-400 font-bold">العميل</p>
                          <p className="text-[10px] font-black text-slate-700 truncate">{order.customer_details?.name}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-slate-400 font-bold">التوصيل</p>
                          <p className="text-[10px] font-black text-sky-600">{deliveryFee} ج.م</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-slate-400 font-bold">المجموع</p>
                          <p className="text-[10px] font-black text-green-600">{(amount + deliveryFee).toFixed(0)} ج.م</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        {vendorPhone && (
                          <a
                            href={`tel:${vendorPhone}`}
                            className="flex items-center gap-1.5 bg-sky-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            اتصال
                          </a>
                        )}
                        {order.status === "in_transit" ? (
                          <div className="flex-1 flex items-center justify-center gap-2 bg-sky-50 border border-sky-200 py-2.5 rounded-xl">
                            <Clock className="w-4 h-4 text-sky-500" />
                            <span className="text-xs font-black text-sky-700">جاري التوصيل للعميل...</span>
                          </div>
                        ) : already ? (
                          <div className="flex-1 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 py-2.5 rounded-xl">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-black text-amber-700">بانتظار تأكيد المحل</span>
                          </div>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            disabled={confirmingId === order.id}
                            onClick={() => handleConfirm(order.id)}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-black text-xs shadow-lg shadow-emerald-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {confirmingId === order.id ? "جاري..." : "تأكيد تسليم المبلغ"}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
