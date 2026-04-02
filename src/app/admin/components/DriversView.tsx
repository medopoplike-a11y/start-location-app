"use client";

import { motion } from "framer-motion";
import { Truck, Shield, ShieldOff, RotateCcw, Plus, CheckCircle2, XCircle } from "lucide-react";
import type { DriverCard } from "../types";

interface DriversViewProps {
  drivers: DriverCard[];
  onAddDriver: () => void;
  onToggleShiftLock: (driverId: string, currentStatus: boolean) => void;
  onResetUser: (userId: string, userName: string) => void;
}

export default function DriversView({ drivers, onAddDriver, onToggleShiftLock, onResetUser }: DriversViewProps) {
  const activeDrivers = drivers.filter(d => !d.isShiftLocked);
  const lockedDrivers = drivers.filter(d => d.isShiftLocked);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">إدارة المناديب</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {activeDrivers.length} نشط · {lockedDrivers.length} محظور · {drivers.length} إجمالي
          </p>
        </div>
        <button onClick={onAddDriver} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white text-sm font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
          <Plus className="w-4 h-4" />
          إضافة طيار
        </button>
      </div>

      {drivers.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-[32px] p-16 text-center">
          <Truck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-bold">لا يوجد مناديب بعد</p>
          <button onClick={onAddDriver} className="mt-4 px-6 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-sm font-bold border border-blue-100 hover:bg-blue-100 transition-all">
            إضافة أول طيار
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map((d, i) => (
            <motion.div
              key={d.id_full}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-white border rounded-[28px] p-5 shadow-sm space-y-4 transition-all ${d.isShiftLocked ? "border-red-100 bg-red-50/30" : "border-slate-100 hover:border-slate-200 hover:shadow-md"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${d.isShiftLocked ? "bg-red-100" : "bg-emerald-50 border border-emerald-100"}`}>
                    <Truck className={`w-5 h-5 ${d.isShiftLocked ? "text-red-400" : "text-emerald-500"}`} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{d.name}</p>
                    <div className={`flex items-center gap-1.5 mt-0.5 ${d.isShiftLocked ? "text-red-400" : "text-emerald-500"}`}>
                      {d.isShiftLocked ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      <span className="text-[10px] font-black uppercase">{d.status}</span>
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">#{d.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">الأرباح</p>
                  <p className="text-sm font-black text-slate-800">{d.earnings.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ج.م</span></p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">المديونية</p>
                  <p className="text-sm font-black text-slate-800">{d.debt.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ج.م</span></p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => onToggleShiftLock(d.id_full, d.isShiftLocked)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black transition-all ${d.isShiftLocked ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100"}`}>
                  {d.isShiftLocked ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                  {d.isShiftLocked ? "فتح الحساب" : "حظر الحساب"}
                </button>
                <button onClick={() => onResetUser(d.id_full, d.name)} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all" title="تصفير بيانات الطيار">
                  <RotateCcw className="w-3.5 h-3.5" />
                  تصفير
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
