"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, BarChart3, Download, Phone, CreditCard, CheckCircle, Clock, Banknote, Store, AlertCircle, MapPin } from "lucide-react";
import { PremiumCard } from "@/components/PremiumCard";
import type { Order, DBDriverOrder } from "../types";

interface WalletProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  systemBalance: number;
  orders: Order[];
  deliveredOrders: Order[];
  allHistory: Order[];
  settlementHistory: any[]; // Add settlementHistory
  onConfirmPayment: (orderId: string) => Promise<void>;
  onOpenSettlementModal: () => void;
}

type FilterPeriod = "today" | "15days" | "month";

export default function DriverWalletView({ todayDeliveryFees, vendorDebt, systemBalance, orders, deliveredOrders, allHistory, settlementHistory, onConfirmPayment, onOpenSettlementModal }: WalletProps) {
  const [tab, setTab] = useState<"earnings" | "vendors">("earnings");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterPeriod>("today");

  const now = new Date();
  
  // 1. حسابات اليوم الصافية (دائماً لليوم)
  const todayHistory = (allHistory || []).filter((o: any) => {
    const updatedAt = o.statusUpdatedAt || o.status_updated_at || o.created_at;
    if (!updatedAt) return false;
    return new Date(updatedAt).toDateString() === now.toDateString();
  });

  const todayEarnings = todayHistory.reduce((acc, o) => acc + (o.financials?.driver_earnings || 0), 0);
  const todayCommission = todayHistory.reduce((acc, o) => {
    return acc + (o.financials?.system_commission || 0) + (o.financials?.driver_insurance || 0);
  }, 0);
  const todayDebtGenerated = todayHistory.reduce((acc, o) => acc + (o.financials?.order_value || 0), 0);

  // 2. تصفية السجل حسب اختيار المستخدم (اليوم/١٥يوم/شهر)
  const filteredHistory = (allHistory || []).filter((o: any) => {
    const updatedAt = o.statusUpdatedAt || o.status_updated_at || o.created_at;
    if (!updatedAt) return filter === "today";
    const d = new Date(updatedAt);
    if (filter === "today") return d.toDateString() === now.toDateString();
    if (filter === "15days") { const ago = new Date(now); ago.setDate(ago.getDate() - 15); return d >= ago; }
    const ago = new Date(now); ago.setDate(ago.getDate() - 30); return d >= ago;
  });

  const filteredEarnings = (systemBalance > 0 || vendorDebt > 0) ? (allHistory || []).reduce((acc, o) => acc + (o.financials?.driver_earnings || 0), 0) : filteredHistory.reduce((acc, o) => acc + (o.financials?.driver_earnings || 0), 0);
  
  const filteredSystemCommission = (systemBalance > 0 || vendorDebt > 0) ? (allHistory || []).reduce((acc, o) => {
    return acc + (o.financials?.system_commission || 0) + (o.financials?.driver_insurance || 0);
  }, 0) : filteredHistory.reduce((acc, o) => {
    return acc + (o.financials?.system_commission || 0) + (o.financials?.driver_insurance || 0);
  }, 0);

  const calculatedVendorDebt = (deliveredOrders || []).reduce((acc, o) => acc + (o.financials?.order_value || 0), 0);

  const handleConfirm = async (orderId: string) => {
    setConfirmingId(orderId);
    await onConfirmPayment(orderId);
    setConfirmingId(null);
  };

  const filterLabels: Record<FilterPeriod, string> = { today: "اليوم", "15days": "١٥ يوم", month: "الشهر" };

  return (
    <div className="space-y-8 pt-4 pb-12">
      {/* شريط ملخص اليوم العلوي */}
      <div className="bg-white/90 backdrop-blur-md border border-sky-100 rounded-[32px] p-6 shadow-sm mx-1">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center">
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-[12px] font-black text-slate-900">
              {now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="px-3 py-1.5 bg-sky-500/10 rounded-full border border-sky-200">
            <p className="text-[10px] font-black text-sky-700">كشف حساب اليوم</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 relative">
          <div className="text-center px-1">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-tight">المديونية</p>
            <p className="text-sm font-black text-orange-600 tabular-nums">{todayDebtGenerated.toLocaleString()}<span className="text-[9px] opacity-40 mr-0.5">ج.م</span></p>
          </div>
          <div className="text-center px-1 border-x border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-tight">الأرباح</p>
            <p className="text-sm font-black text-emerald-600 tabular-nums">{todayEarnings.toFixed(0)}<span className="text-[9px] opacity-40 mr-0.5">ج.م</span></p>
          </div>
          <div className="text-center px-1">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-tight">العمولة</p>
            <p className="text-sm font-black text-slate-900 tabular-nums">{todayCommission.toFixed(1)}<span className="text-[9px] opacity-40 mr-0.5">ج.م</span></p>
          </div>
        </div>
      </div>

      {/* فريم فاصل */}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-2 border-slate-100/50"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-50 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] backdrop-blur-sm">المحافظ المالية</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-1">
        <div className="bg-emerald-600 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <TrendingUp className="w-4 h-4 text-emerald-200" />
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">صافي أرباحك</p>
          </div>
          <h3 className="text-3xl font-black relative z-10 tabular-nums">{filteredEarnings.toFixed(0)} <span className="text-xs font-bold opacity-50">ج.م</span></h3>
          <p className="text-[10px] font-bold text-emerald-100/60 mt-2 relative z-10">بعد خصم عمولة الشركة</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-all" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <CreditCard className="w-4 h-4 text-orange-500" />
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">مديونية المحلات</p>
          </div>
          <h3 className="text-3xl font-black text-gray-900 relative z-10 tabular-nums">{(vendorDebt > 0 ? vendorDebt : calculatedVendorDebt).toLocaleString()} <span className="text-xs font-bold text-gray-300">ج.م</span></h3>
          <p className="text-[10px] font-bold text-gray-400 mt-2 relative z-10">يجب ردها للمطاعم</p>
        </div>
      </div>

      {/* Commission Box */}
      <div className="bg-gray-900 border border-gray-800 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden mx-1">
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-orange-500/10 rounded-[22px] flex items-center justify-center border border-orange-500/30 shadow-inner">
              <AlertCircle className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.25em] mb-1">إجمالي مديونية الشركة</p>
              <h3 className="text-4xl font-black text-white tabular-nums tracking-tight">
                {(systemBalance > 0 ? systemBalance : filteredSystemCommission).toFixed(2)} 
                <span className="text-sm font-bold opacity-30 mr-2">ج.م</span>
              </h3>
            </div>
          </div>
          <button 
            onClick={onOpenSettlementModal}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-[20px] text-[13px] font-black shadow-xl shadow-orange-500/30 active:scale-95 transition-all border border-orange-400/30"
          >
            تأكيد سداد المديونية
          </button>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

        <div className="space-y-5 relative z-10">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black text-white/30 uppercase tracking-widest">تفاصيل الحساب المالي (١٥٪ + ١ج)</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-5 rounded-[24px] border border-white/10 hover:bg-white/10 transition-colors">
              <p className="text-[10px] font-black text-white/30 uppercase mb-2 tracking-wider">عمولة النظام</p>
              <p className="text-lg font-black text-white tabular-nums">
                {filteredHistory.reduce((acc, o) => acc + (o.financials?.system_commission || 0), 0).toFixed(2)} 
                <span className="text-[11px] opacity-30 mr-1">ج.م</span>
              </p>
            </div>
            <div className="bg-white/5 p-5 rounded-[24px] border border-white/10 hover:bg-white/10 transition-colors">
              <p className="text-[10px] font-black text-white/30 uppercase mb-2 tracking-wider">تأمين ثابت ({filteredHistory.filter(o => o.status === 'delivered').length} طلب)</p>
              <p className="text-lg font-black text-white tabular-nums">
                {filteredHistory.reduce((acc, o) => acc + (o.financials?.driver_insurance || 0), 0).toFixed(2)} 
                <span className="text-[11px] opacity-30 mr-1">ج.م</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs inside commission box */}
        <div className="flex bg-white/5 p-1.5 rounded-[20px] gap-1.5 mt-8 border border-white/10">
          {(["today", "15days", "month"] as FilterPeriod[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 rounded-[14px] text-[11px] font-black transition-all duration-300 ${
                filter === f ? "bg-white text-gray-900 shadow-xl" : "text-white/40 hover:text-white/70"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex border-b-2 border-gray-100 px-1 gap-4">
        <button
          onClick={() => setTab("earnings")}
          className={`flex-1 py-4 px-2 text-center transition-all relative ${tab === "earnings" ? "text-sky-600" : "text-gray-400 hover:text-gray-600"}`}
        >
          <span className="flex items-center justify-center gap-2.5 font-black text-[13px]">
            <BarChart3 className={`w-5 h-5 ${tab === "earnings" ? "text-sky-500" : "text-gray-300"}`} /> 
            الأرباح
          </span>
          {tab === "earnings" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-t-full" />}
        </button>
        <button
          onClick={() => setTab("vendors")}
          className={`flex-1 py-4 px-2 text-center transition-all relative ${tab === "vendors" ? "text-orange-600" : "text-gray-400 hover:text-gray-600"}`}
        >
          <span className="flex items-center justify-center gap-2.5 font-black text-[13px]">
            <Banknote className={`w-5 h-5 ${tab === "vendors" ? "text-orange-500" : "text-gray-300"}`} />
            مديونية المحلات
            {deliveredOrders.length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-orange-500/20">{deliveredOrders.length}</span>
            )}
          </span>
          {tab === "vendors" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full" />}
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
                        const fee = (order.financials?.delivery_fee || 0);
                        const earn = (order.financials?.driver_earnings || 0);
                        const comm = (order.financials?.system_commission || 0) + (order.financials?.driver_insurance || 0);
                        
                        return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-3 py-3 border-b border-gray-50 items-center"
                      >
                        <span className="font-semibold text-xs truncate">#{order.id.slice(0, 6)} {order.vendor}</span>
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

            {/* Settlement History (NEW) */}
            {settlementHistory && settlementHistory.length > 0 && (
              <div className="bg-gray-50/50 rounded-[32px] border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Banknote className="w-4 h-4 text-gray-400" />
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">سجل تسوية المديونيات</h4>
                </div>
                <div className="space-y-3">
                  {settlementHistory.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          s.status === 'تم السداد' ? 'bg-emerald-50 text-emerald-500' : 
                          s.status === 'مرفوض' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                        }`}>
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900">{s.amount} ج.م</p>
                          <p className="text-[9px] font-bold text-gray-400">{s.date}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black ${
                        s.status === 'تم السداد' ? 'bg-emerald-100 text-emerald-700' : 
                        s.status === 'مرفوض' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                {deliveredOrders.map((order: any, idx) => {
                  const vendorName = order.vendor || order.vendor_name || "محل غير معروف";
                  const vendorPhone = order.vendorPhone || order.vendor_phone || "";
                  const vendorArea = order.vendorArea || order.vendor_area || "";
                  const amount = order.orderValue || order.financials?.order_value || 0;
                  const deliveryFee = order.financials?.delivery_fee || 0;
                  const already = !!(order.driverConfirmedAt || order.driver_confirmed_at);
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
                          <p className="text-[10px] font-black text-slate-700 truncate">{order.customer}</p>
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
                        {already ? (
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
