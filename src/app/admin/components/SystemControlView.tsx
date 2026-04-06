"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap, Shield, AlertTriangle, RotateCcw, Power, Users, Truck,
  ToggleLeft, ToggleRight, Clock, CheckCircle2, XCircle, Loader2,
  Activity, Lock, Unlock, RefreshCw
} from "lucide-react";
import type { DriverCard } from "../types";

interface SystemControlViewProps {
  manualMode: boolean;
  maintenanceMode: boolean;
  drivers: DriverCard[];
  actionLoading: boolean;
  onToggleManualMode: (val: boolean) => void;
  onToggleMaintenance: (val: boolean) => void;
  onToggleShiftLock: (driverId: string, currentStatus: boolean) => void;
  onLockAllDrivers: () => void;
  onUnlockAllDrivers: () => void;
  onGlobalReset: () => void;
  onRefresh: () => void;
  onBroadcastMessage: (msg: string) => void;
}

export default function SystemControlView({
  manualMode,
  maintenanceMode,
  drivers,
  actionLoading,
  onToggleManualMode,
  onToggleMaintenance,
  onToggleShiftLock,
  onLockAllDrivers,
  onUnlockAllDrivers,
  onGlobalReset,
  onRefresh,
  onBroadcastMessage,
}: SystemControlViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const activeDrivers = drivers.filter(d => !d.isShiftLocked);
  const lockedDrivers = drivers.filter(d => d.isShiftLocked);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">التحكم في النظام</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">إدارة وتشغيل النظام يدوياً في أوقات الضغط</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-600 text-sm font-black hover:bg-slate-200 transition-all">
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* System Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Manual Mode */}
        <motion.div
          className={`rounded-[28px] p-6 border-2 transition-all ${manualMode ? "bg-amber-50 border-amber-300 shadow-lg shadow-amber-50" : "bg-white border-slate-100"}`}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${manualMode ? "bg-amber-500" : "bg-slate-100"}`}>
                <Zap className={`w-6 h-6 ${manualMode ? "text-white" : "text-slate-400"}`} />
              </div>
              <div>
                <p className="font-black text-slate-900">وضع التشغيل اليدوي</p>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">للتحكم الكامل في التوزيع أثناء أوقات الضغط</p>
              </div>
            </div>
            <button
              onClick={() => onToggleManualMode(!manualMode)}
              className={`relative w-14 h-7 rounded-full transition-all ${manualMode ? "bg-amber-500" : "bg-slate-200"}`}
            >
              <motion.div
                animate={{ right: manualMode ? 4 : "auto", left: manualMode ? "auto" : 4 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>
          {manualMode && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-100 rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-700" />
                <p className="text-xs font-black text-amber-700">وضع يدوي نشط — ستتم الطلبات بتوجيه مباشر منك</p>
              </div>
            </motion.div>
          )}
          {!manualMode && (
            <div className="bg-slate-50 rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-black text-slate-500">التوزيع التلقائي يعمل بشكل طبيعي</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Maintenance Mode */}
        <motion.div
          className={`rounded-[28px] p-6 border-2 transition-all ${maintenanceMode ? "bg-red-50 border-red-300 shadow-lg shadow-red-50" : "bg-white border-slate-100"}`}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${maintenanceMode ? "bg-red-500" : "bg-slate-100"}`}>
                <Shield className={`w-6 h-6 ${maintenanceMode ? "text-white" : "text-slate-400"}`} />
              </div>
              <div>
                <p className="font-black text-slate-900">وضع الصيانة</p>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">إيقاف النظام مؤقتاً لإجراء الصيانة</p>
              </div>
            </div>
            <button
              onClick={() => onToggleMaintenance(!maintenanceMode)}
              className={`relative w-14 h-7 rounded-full transition-all ${maintenanceMode ? "bg-red-500" : "bg-slate-200"}`}
            >
              <motion.div
                animate={{ right: maintenanceMode ? 4 : "auto", left: maintenanceMode ? "auto" : 4 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>
          {maintenanceMode && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-red-100 rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <p className="text-xs font-black text-red-700">النظام في وضع الصيانة — المستخدمون لا يمكنهم الوصول</p>
              </div>
            </motion.div>
          )}
          {!maintenanceMode && (
            <div className="bg-slate-50 rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <Power className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-black text-slate-500">النظام يعمل بشكل طبيعي</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Emergency Broadcast */}
        <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm flex flex-col gap-4 md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm">إرسال تنبيه عاجل (Broadcast)</p>
              <p className="text-[10px] text-slate-400 font-bold">يظهر لجميع الطيارين والمطاعم فوراً</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text"
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="اكتب رسالة التنبيه هنا..."
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 ring-red-100"
            />
            <button 
              onClick={() => {
                if (broadcastText.trim()) {
                  onBroadcastMessage(broadcastText);
                  setBroadcastText("");
                }
              }}
              disabled={!broadcastText.trim() || actionLoading}
              className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-red-600 disabled:opacity-50 transition-all shadow-lg shadow-red-100"
            >
              إرسال
            </button>
          </div>
        </div>
      </div>

      {/* Driver Shift Controls */}
      <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" />
              التحكم في شيفت المناديب
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              {activeDrivers.length} نشط · {lockedDrivers.length} محظور
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onUnlockAllDrivers}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-black hover:bg-emerald-100 transition-all disabled:opacity-50"
            >
              <Unlock className="w-3.5 h-3.5" />
              فتح الكل
            </button>
            <button
              onClick={onLockAllDrivers}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 text-red-700 border border-red-100 text-xs font-black hover:bg-red-100 transition-all disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              قفل الكل
            </button>
          </div>
        </div>

        {drivers.length === 0 ? (
          <div className="text-center py-8 text-slate-300">
            <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">لا يوجد مناديب</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {drivers.map((d, i) => (
              <motion.div
                key={d.id_full}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center justify-between p-4 rounded-2xl border ${d.isShiftLocked ? "bg-red-50/50 border-red-100" : "bg-emerald-50/30 border-emerald-100"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${d.isShiftLocked ? "bg-red-100" : "bg-emerald-100"}`}>
                    <Truck className={`w-4 h-4 ${d.isShiftLocked ? "text-red-500" : "text-emerald-600"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{d.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {d.isShiftLocked
                        ? <XCircle className="w-3 h-3 text-red-400" />
                        : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      <span className={`text-[10px] font-black ${d.isShiftLocked ? "text-red-400" : "text-emerald-600"}`}>
                        {d.isShiftLocked ? "محظور" : "نشط"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onToggleShiftLock(d.id_full, d.isShiftLocked)}
                  disabled={actionLoading}
                  className={`p-2 rounded-xl transition-all disabled:opacity-50 ${d.isShiftLocked ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
                >
                  {d.isShiftLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* System Stats Quick View */}
      <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm">
        <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          حالة النظام الحالية
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-600">{activeDrivers.length}</p>
            <p className="text-[10px] font-black text-emerald-500 uppercase mt-1">طيار نشط</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-red-500">{lockedDrivers.length}</p>
            <p className="text-[10px] font-black text-red-400 uppercase mt-1">طيار محظور</p>
          </div>
          <div className={`border rounded-2xl p-4 text-center ${manualMode ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100"}`}>
            {manualMode
              ? <Zap className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              : <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto mb-1" />}
            <p className={`text-[10px] font-black uppercase ${manualMode ? "text-amber-600" : "text-slate-400"}`}>
              {manualMode ? "يدوي" : "تلقائي"}
            </p>
          </div>
          <div className={`border rounded-2xl p-4 text-center ${maintenanceMode ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-100"}`}>
            {maintenanceMode
              ? <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
              : <Power className="w-6 h-6 text-emerald-500 mx-auto mb-1" />}
            <p className={`text-[10px] font-black uppercase ${maintenanceMode ? "text-red-500" : "text-emerald-500"}`}>
              {maintenanceMode ? "صيانة" : "يعمل"}
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-100 rounded-[28px] p-6 shadow-sm">
        <h3 className="font-black text-red-600 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          منطقة الخطر
        </h3>
        <p className="text-xs text-slate-400 font-bold mb-4">سيؤدي هذا إلى حذف جميع الطلبات والمعاملات المالية. لا يمكن التراجع عن هذا الإجراء.</p>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-50 text-red-600 border border-red-200 text-sm font-black hover:bg-red-100 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            تصفير شامل للنظام
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm font-black text-red-700">هل أنت متأكد تماماً؟</p>
            <button
              onClick={() => { onGlobalReset(); setConfirmReset(false); }}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-2xl bg-red-600 text-white text-sm font-black hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              نعم، تصفير الآن
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-600 text-sm font-black hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
