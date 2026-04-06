"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  Activity, 
  Truck, 
  Store, 
  Settings, 
  RefreshCw, 
  Radio,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LayoutGrid,
  ListFilter
} from "lucide-react";
import OrdersView from "./OrdersView";
import OrderDistributionView from "./OrderDistributionView";
import SystemControlView from "./SystemControlView";
import type { LiveOrderItem, DriverCard, ActivityItem } from "../types";

interface OperationsCenterProps {
  liveOrders: LiveOrderItem[];
  drivers: DriverCard[];
  activities: ActivityItem[];
  manualMode: boolean;
  maintenanceMode: boolean;
  actionLoading: boolean;
  onToggleManualMode: (val: boolean) => void;
  onToggleMaintenance: (val: boolean) => void;
  onToggleShiftLock: (driverId: string, currentStatus: boolean) => void;
  onLockAllDrivers: () => void;
  onUnlockAllDrivers: () => void;
  onGlobalReset: () => void;
  onRefresh: () => void;
  onBroadcastMessage: (msg: string) => void;
  onAssign: (orderId: string, driverId: string, driverName: string) => Promise<void>;
  onCancelOrder?: (orderId: string) => Promise<void>;
}

export default function OperationsCenter({
  liveOrders,
  drivers,
  activities,
  manualMode,
  maintenanceMode,
  actionLoading,
  onToggleManualMode,
  onToggleMaintenance,
  onToggleShiftLock,
  onLockAllDrivers,
  onUnlockAllDrivers,
  onGlobalReset,
  onRefresh,
  onBroadcastMessage,
  onAssign,
  onCancelOrder
}: OperationsCenterProps) {
  const [activeTab, setActiveTab] = useState<"monitor" | "distribution" | "system">("monitor");
  const [broadcastText, setBroadcastText] = useState("");

  const pendingOrdersCount = liveOrders.filter(o => o.status === "جاري البحث").length;
  const activeDriversCount = drivers.filter(d => !d.isShiftLocked).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Dynamic Header Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Main Status & Quick Broadcast */}
        <div className="xl:col-span-3 bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${manualMode ? "bg-amber-500 shadow-amber-100 shadow-xl" : "bg-emerald-500 shadow-emerald-100 shadow-xl"}`}>
              {manualMode ? <Zap className="w-6 h-6 text-white" /> : <Activity className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">مركز العمليات الحية</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full animate-pulse ${manualMode ? "bg-amber-500" : "bg-emerald-500"}`} />
                <p className="text-[11px] font-bold text-slate-400">
                  {manualMode ? "الوضع اليدوي نشط - تحكم كامل" : "الوضع التلقائي - مراقبة فقط"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md w-full flex gap-2">
            <div className="relative flex-1">
              <Radio className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="إرسال رسالة عاجلة للجميع..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pr-10 pl-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 ring-blue-100 transition-all"
              />
            </div>
            <button 
              onClick={() => {
                if (broadcastText.trim()) {
                  onBroadcastMessage(broadcastText);
                  setBroadcastText("");
                }
              }}
              disabled={!broadcastText.trim() || actionLoading}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-black hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              بث
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-4 shadow-sm grid grid-cols-2 gap-3">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex flex-col items-center justify-center">
            <p className="text-xl font-black text-amber-600 leading-none">{pendingOrdersCount}</p>
            <p className="text-[9px] font-black text-amber-500 uppercase mt-1">انتظار</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex flex-col items-center justify-center">
            <p className="text-xl font-black text-emerald-600 leading-none">{activeDriversCount}</p>
            <p className="text-[9px] font-black text-emerald-500 uppercase mt-1">طيار متاح</p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white/50 backdrop-blur-md border border-slate-100 rounded-2xl w-fit sticky top-20 z-30 shadow-sm">
        <button 
          onClick={() => setActiveTab("monitor")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "monitor" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-white"
          }`}
        >
          <ListFilter className="w-4 h-4" />
          المراقبة الحية
        </button>
        <button 
          onClick={() => setActiveTab("distribution")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "distribution" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-white"
          }`}
        >
          <Truck className="w-4 h-4" />
          توزيع الطلبات {pendingOrdersCount > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />}
        </button>
        <button 
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "system" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-white"
          }`}
        >
          <Settings className="w-4 h-4" />
          إعدادات التشغيل
        </button>
        <div className="w-px h-6 bg-slate-200 mx-1 my-auto" />
        <button onClick={onRefresh} className="p-2.5 text-slate-400 hover:text-slate-900 transition-colors">
          <RefreshCw className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tab Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "monitor" && (
              <OrdersView 
                liveOrders={liveOrders} 
                activities={activities} 
                onCancelOrder={onCancelOrder} 
              />
            )}
            {activeTab === "distribution" && (
              <OrderDistributionView 
                liveOrders={liveOrders} 
                drivers={drivers} 
                onAssign={onAssign} 
              />
            )}
            {activeTab === "system" && (
              <SystemControlView
                manualMode={manualMode}
                maintenanceMode={maintenanceMode}
                drivers={drivers}
                actionLoading={actionLoading}
                onToggleManualMode={onToggleManualMode}
                onToggleMaintenance={onToggleMaintenance}
                onToggleShiftLock={onToggleShiftLock}
                onLockAllDrivers={onLockAllDrivers}
                onUnlockAllDrivers={onUnlockAllDrivers}
                onGlobalReset={onGlobalReset}
                onRefresh={onRefresh}
                onBroadcastMessage={onBroadcastMessage}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Alert Bar (If Manual or Maintenance) */}
      <AnimatePresence>
        {(manualMode || maintenanceMode) && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4"
          >
            <div className={`p-4 rounded-[28px] shadow-2xl flex items-center justify-between border ${
              maintenanceMode ? "bg-red-600 border-red-500 text-white" : "bg-amber-500 border-amber-400 text-white"
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  {maintenanceMode ? <AlertTriangle className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-black uppercase">
                    {maintenanceMode ? "وضع الصيانة نشط" : "التحكم اليدوي مفعل"}
                  </p>
                  <p className="text-[10px] font-bold text-white/80">
                    {maintenanceMode ? "لا يمكن للمستخدمين الدخول حالياً" : "سيتم توزيع الطلبات بمعرفتك فقط"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => maintenanceMode ? onToggleMaintenance(false) : onToggleManualMode(false)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-[10px] font-black transition-all"
              >
                إيقاف
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
