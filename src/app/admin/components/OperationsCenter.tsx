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
import dynamic from "next/dynamic";
import OrdersView from "./OrdersView";
import OrderDistributionView from "./OrderDistributionView";
import SystemControlView from "./SystemControlView";
import type { LiveOrderItem, DriverCard, ActivityItem, OnlineDriver, VendorCard, AdminOrder } from "../types";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-50 animate-pulse flex items-center justify-center text-slate-400 font-black">جاري تحميل الخريطة...</div>
});

interface OperationsCenterProps {
  liveOrders: LiveOrderItem[];
  drivers: DriverCard[];
  onlineDrivers: OnlineDriver[];
  vendors: VendorCard[];
  allOrders: AdminOrder[];
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
  onUpdateStatus?: (orderId: string, status: any) => Promise<void>;
}

export default function OperationsCenter({
  liveOrders,
  drivers,
  onlineDrivers,
  vendors,
  allOrders,
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
  onCancelOrder,
  onUpdateStatus
}: OperationsCenterProps) {
  const [activeTab, setActiveTab] = useState<"monitor" | "distribution" | "system" | "map">("map");
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
              <h2 className="text-lg font-black text-slate-900 leading-tight">مركز العمليات الموحد</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full animate-pulse ${manualMode ? "bg-amber-500" : "bg-emerald-500"}`} />
                <p className="text-[11px] font-bold text-slate-400">
                  {manualMode ? "الوضع اليدوي نشط - تحكم كامل" : "الوضع التلقائي - مراقبة فقط"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تحديث النظام</p>
                <p className="text-xs font-bold text-slate-700">البيانات متزامنة الآن</p>
              </div>
              <button onClick={onRefresh} className={`p-2 bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-blue-600 transition-all ${actionLoading ? "animate-spin" : ""}`}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            {activeTab === 'map' && (
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span className="text-xs font-bold text-blue-700">{onlineDrivers.length} طيار متصل</span>
              </div>
            )}
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
          onClick={() => setActiveTab("map")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "map" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-white"
          }`}
        >
          <Radio className="w-4 h-4" />
          الخريطة المباشرة
        </button>
        <button 
          onClick={() => setActiveTab("monitor")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "monitor" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-white"
          }`}
        >
          <ListFilter className="w-4 h-4" />
          قائمة الطلبات
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
            {activeTab === "map" && (
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden h-[600px] relative">
                <LiveMap
                  drivers={onlineDrivers.map(d => ({
                    ...d,
                    status: allOrders.some(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit')) ? 'busy' : 'available',
                    details: allOrders.find(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit'))?.vendor_full_name ? `جاري العمل على طلب من ${allOrders.find(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit'))?.vendor_full_name}` : undefined
                  }))}
                  vendors={vendors.flatMap((v) => (v.location?.lat != null && v.location?.lng != null) ? [{ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng, details: `طلبات اليوم: ${v.orders}` }] : [])}
                  orders={allOrders.filter(o => (o.status === 'pending' || o.status === 'assigned') && vendors.find(v => v.id_full === o.vendor_id)?.location).map(o => {
                    const v = vendors.find(v => v.id_full === o.vendor_id)!;
                    return {
                      id: o.id,
                      name: o.vendor_full_name || "محل",
                      lat: v.location!.lat!,
                      lng: v.location!.lng!,
                      status: o.status === 'pending' ? 'جاري البحث عن طيار' : 'تم التعيين - بانتظار التحصيل',
                      details: `قيمة الطلب: ${o.financials?.order_value} ج.م`
                    };
                  })}
                  zoom={13}
                  className="h-full w-full"
                />
                
                {/* Map Floating Actions */}
                <div className="absolute top-6 right-6 z-[10] flex flex-col gap-3">
                   <button 
                     onClick={() => setActiveTab('distribution')}
                     className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-3 hover:scale-105 transition-all active:scale-95"
                   >
                     <Truck className="w-4 h-4 text-emerald-400" />
                     بدء التوزيع الآن
                   </button>
                </div>

                {/* Legend */}
                <div className="absolute bottom-6 right-6 z-[10] bg-white/90 backdrop-blur-md p-4 rounded-[28px] border border-white shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-700">طيار متاح</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-700">طيار مشغول</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-700">طلب نشط</span>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "monitor" && (
              <OrdersView 
                liveOrders={liveOrders} 
                activities={activities} 
                onCancelOrder={onCancelOrder} 
                onUpdateStatus={onUpdateStatus}
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
