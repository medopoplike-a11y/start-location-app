"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, CreditCard, CheckCircle, Clock, Banknote, Store, AlertCircle, MapPin, Phone } from "lucide-react";
import type { Order } from "../types";

interface WalletProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  systemBalance: number;
  deliveredOrders: Order[];
  onConfirmPayment: (orderId: string) => Promise<void>;
  onOpenSettlementModal: () => void;
}

export default function DriverWalletView({ todayDeliveryFees, vendorDebt, systemBalance, deliveredOrders, onConfirmPayment, onOpenSettlementModal }: WalletProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Total statistics (simplified as daily history is removed)
  const totalEarnings = todayDeliveryFees; // Or use a total earnings prop if available
  const totalSystemCommission = systemBalance;

  const calculatedVendorDebt = (deliveredOrders || []).reduce((acc, o) => acc + (o.financials?.order_value || 0), 0);

  const handleConfirm = async (orderId: string) => {
    setConfirmingId(orderId);
    await onConfirmPayment(orderId);
    setConfirmingId(null);
  };

  return (
    <div className="space-y-8 pt-4 pb-12">
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
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">إجمالي الأرباح</p>
          </div>
          <h3 className="text-3xl font-black relative z-10 tabular-nums">{(totalEarnings || 0).toFixed(0)} <span className="text-xs font-bold opacity-50">ج.م</span></h3>
          <p className="text-[10px] font-bold text-emerald-100/60 mt-2 relative z-10">المستحقة لك</p>
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
                {(totalSystemCommission || 0).toFixed(2)} 
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
            <p className="text-[11px] font-black text-white/30 uppercase tracking-widest">تفاصيل العمولات والمديونية</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-5 rounded-[24px] border border-white/10 hover:bg-white/10 transition-colors">
              <p className="text-[10px] font-black text-white/30 uppercase mb-2 tracking-wider">عمولة النظام</p>
              <p className="text-lg font-black text-white tabular-nums">
                {(totalSystemCommission || 0).toFixed(2)} 
                <span className="text-[11px] opacity-30 mr-1">ج.م</span>
              </p>
            </div>
            <div className="bg-white/5 p-5 rounded-[24px] border border-white/10 hover:bg-white/10 transition-colors">
              <p className="text-[10px] font-black text-white/30 uppercase mb-2 tracking-wider">الطلبات الموصلة</p>
              <p className="text-lg font-black text-white tabular-nums">
                {(deliveredOrders || []).length}
                <span className="text-[11px] opacity-30 mr-1"> طلب</span>
              </p>
            </div>
          </div>
        </div>

        {/* Removed Filter Tabs for daily statement (v0.9.80) */}
      </div>

      <div className="flex border-b-2 border-gray-100 px-1 gap-4">
        <div className="flex-1 py-4 px-2 text-center relative text-orange-600">
          <span className="flex items-center justify-center gap-2.5 font-black text-[13px]">
            <Banknote className="w-5 h-5 text-orange-500" />
            مديونية المحلات (المعلقة)
            {(deliveredOrders || []).length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-orange-500/20">{(deliveredOrders || []).length}</span>
            )}
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key="vendors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {(deliveredOrders || []).length === 0 ? (
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
                {(deliveredOrders || []).map((order: any, idx) => {
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
      </AnimatePresence>
    </div>
  );
}
