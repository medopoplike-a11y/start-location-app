"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, Truck,
  CheckCircle2, Activity, Lock, Unlock, RefreshCw
} from "lucide-react";
import type { DriverCard } from "../types";

interface SystemControlViewProps {
  autoRetryEnabled: boolean;
  maintenanceMode: boolean;
  drivers: DriverCard[];
  actionLoading: boolean;
  onToggleAutoRetry: (val: boolean) => void;
  onToggleMaintenance: (val: boolean) => void;
  onToggleShiftLock?: (driverId: string, currentStatus: boolean) => void;
  onLockAllDrivers: () => void;
  onUnlockAllDrivers: () => void;
  onGlobalReset: () => void;
  onRefresh: () => void;
  onBroadcastMessage: (msg: string) => void;
}

export default function SystemControlView({
  autoRetryEnabled = false,
  maintenanceMode = false,
  drivers = [],
  actionLoading = false,
  onToggleAutoRetry = () => {},
  onToggleMaintenance = () => {},
  onLockAllDrivers = () => {},
  onUnlockAllDrivers = () => {},
  onGlobalReset = () => {},
  onRefresh = () => {},
  onBroadcastMessage = () => {},
}: SystemControlViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  
  // Safe filtering with fallback to empty array
  const activeDrivers = (drivers || []).filter(d => d && !d.isShiftLocked);
  const lockedDrivers = (drivers || []).filter(d => d && d.isShiftLocked);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">التحكم في النظام</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">إدارة وتشغيل العمليات المركزية</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-600 text-sm font-black hover:bg-slate-200 transition-all">
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* System Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Auto-Retry Loop Control */}
        <motion.div
          className={`rounded-[28px] p-6 border-2 transition-all ${autoRetryEnabled ? "bg-emerald-50 border-emerald-300 shadow-lg shadow-emerald-50" : "bg-white border-slate-100"}`}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${autoRetryEnabled ? "bg-emerald-500" : "bg-slate-100"}`}>
                <Activity className={`w-6 h-6 ${autoRetryEnabled ? "text-white" : "text-slate-400"}`} />
              </div>
              <div>
                <p className="font-black text-slate-900">التوزيع التلقائي الذكي</p>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">البحث المستمر عن طيارين للطلبات المعلقة</p>
              </div>
            </div>
            <button
              onClick={() => onToggleAutoRetry(!autoRetryEnabled)}
              className={`relative w-14 h-7 rounded-full transition-all ${autoRetryEnabled ? "bg-emerald-500" : "bg-slate-200"}`}
            >
              <motion.div
                animate={{ right: autoRetryEnabled ? 4 : "auto", left: autoRetryEnabled ? "auto" : 4 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>
          {autoRetryEnabled ? (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-100 rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <p className="text-xs font-black text-emerald-700">النظام يعمل حالياً على توزيع الطلبات تلقائياً</p>
              </div>
            </motion.div>
          ) : (
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-black text-amber-600">التوزيع التلقائي متوقف - يجب التوزيع يدوياً</p>
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
                <p className="font-black text-slate-900">وضع الصيانة الكاملة</p>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">إغلاق التطبيق أمام جميع المستخدمين</p>
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
            <div className="bg-red-100 rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <p className="text-xs font-black text-red-700">وضع الصيانة نشط — لا يمكن لأي مستخدم تسجيل الدخول</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Fleet Quick Controls */}
      <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">إدارة الأسطول السريعة</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={onLockAllDrivers}
            className="flex items-center justify-between p-5 rounded-[24px] bg-slate-50 border border-slate-100 hover:bg-red-50 hover:border-red-100 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-red-500">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-900">حظر جميع الطيارين</p>
                <p className="text-[10px] text-slate-400 font-bold">إيقاف استقبال طلبات جديدة فوراً</p>
              </div>
            </div>
            <span className="text-xs font-black text-slate-300 group-hover:text-red-400">{activeDrivers.length} نشط</span>
          </button>

          <button
            onClick={onUnlockAllDrivers}
            className="flex items-center justify-between p-5 rounded-[24px] bg-slate-50 border border-slate-100 hover:bg-emerald-50 hover:border-emerald-100 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-emerald-500">
                <Unlock className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-900">فك حظر الجميع</p>
                <p className="text-[10px] text-slate-400 font-bold">السماح لجميع الطيارين باستقبال الطلبات</p>
              </div>
            </div>
            <span className="text-xs font-black text-slate-300 group-hover:text-emerald-400">{lockedDrivers.length} محظور</span>
          </button>
        </div>
      </div>

      {/* Broadcast Message */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-200 space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">إرسال تعميم للنظام</h3>
        </div>
        <div className="relative">
          <textarea
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none focus:border-emerald-500 h-24 resize-none"
          />
          <button
            onClick={() => { onBroadcastMessage(broadcastText); setBroadcastText(""); }}
            disabled={!broadcastText.trim()}
            className="absolute bottom-3 left-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
          >
            إرسال الآن
          </button>
        </div>
      </div>

      {/* Global Reset */}
      <div className="bg-red-50 border-2 border-red-100 rounded-[32px] p-8 space-y-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-sm font-black text-red-900 uppercase tracking-widest">منطقة الخطر</h3>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs font-bold text-red-700 text-right">سيتم حذف جميع الطلبات والنشاطات وتصفير المحافظ. هذا الإجراء لا يمكن التراجع عنه أبداً.</p>
          <button
            onClick={() => confirmReset ? onGlobalReset() : setConfirmReset(true)}
            className={`px-8 py-4 rounded-2xl font-black text-xs transition-all active:scale-95 ${confirmReset ? "bg-red-600 text-white shadow-xl shadow-red-200" : "bg-white border border-red-200 text-red-600 hover:bg-red-50"}`}
          >
            {confirmReset ? "هل أنت متأكد؟ اضغط للتأكيد النهائي" : "تصفير النظام بالكامل"}
          </button>
        </div>
      </div>
    </div>
  );
}
