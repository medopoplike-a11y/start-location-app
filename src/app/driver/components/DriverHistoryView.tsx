"use client";

import { motion } from "framer-motion";
import { History, CheckCircle, Clock, Banknote, Store, TrendingUp } from "lucide-react";
import type { DBDriverOrder } from "../types";

interface DriverHistoryViewProps {
  todayHistory: DBDriverOrder[];
}

export default function DriverHistoryView({ todayHistory }: DriverHistoryViewProps) {
  const totalEarnings = todayHistory.reduce((acc, o) => acc + (o.financials?.driver_earnings || 0), 0);
  const totalValue = todayHistory.reduce((acc, o) => acc + (o.financials?.order_value || 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-sky-500" />
          سجل اليوم
        </h2>
        <span className="bg-sky-100 text-sky-700 text-xs font-black px-3 py-1.5 rounded-full border border-sky-200">
          {todayHistory.length} طلب
        </span>
      </div>

      {todayHistory.length === 0 ? (
        <div className="bg-white p-10 rounded-[40px] shadow-sm text-center border border-gray-100">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-slate-200" />
          </div>
          <p className="text-sm text-gray-400 font-bold">لا توجد توصيلات مكتملة اليوم بعد</p>
          <p className="text-[10px] text-gray-300 mt-1">ستظهر هنا طلباتك المكتملة طوال اليوم</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-[24px] p-4 text-center">
              <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-[9px] font-bold text-green-600 uppercase">أرباحك اليوم</p>
              <p className="text-lg font-black text-green-700">{totalEarnings.toLocaleString()} ج.م</p>
            </div>
            <div className="bg-sky-50 border border-sky-100 rounded-[24px] p-4 text-center">
              <Banknote className="w-5 h-5 text-sky-500 mx-auto mb-1" />
              <p className="text-[9px] font-bold text-sky-600 uppercase">إجمالي المبالغ</p>
              <p className="text-lg font-black text-sky-700">{totalValue.toLocaleString()} ج.م</p>
            </div>
          </div>

          <div className="space-y-3">
            {todayHistory.map((order, idx) => {
              const vendorName = order.profiles?.full_name || 'محل';
              const earnings = order.financials?.driver_earnings || 0;
              const orderValue = order.financials?.order_value || 0;
              const settled = !!order.vendor_collected_at;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center border border-green-100">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Store className="w-3 h-3 text-slate-400" />
                          <p className="text-sm font-black text-slate-900">{vendorName}</p>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold">#{order.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${settled ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {settled ? 'تمت التسوية' : 'بانتظار المحل'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">عمولتك</p>
                      <p className="text-sm font-black text-green-600">+{earnings.toLocaleString()} ج.م</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">قيمة الطلب</p>
                      <p className="text-sm font-black text-slate-700">{orderValue.toLocaleString()} ج.م</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
