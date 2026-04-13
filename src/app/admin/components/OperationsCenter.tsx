"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Truck, 
  Settings, 
  RefreshCw, 
  Radio,
  AlertTriangle,
  ListFilter,
  Monitor
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
  autoRetryEnabled: boolean;
  maintenanceMode: boolean;
  actionLoading: boolean;
  onToggleAutoRetry: (val: boolean) => void;
  onToggleMaintenance: (val: boolean) => void;
  onLockAllDrivers: () => void;
  onUnlockAllDrivers: () => void;
  onGlobalReset: () => void;
  onRefresh: () => void;
  onBroadcastMessage: (msg: string) => void;
  onAssign: (orderId: string, driverId: string, driverName: string) => Promise<void>;
  onToggleShiftLock: (driverId: string, currentStatus: boolean) => Promise<void>;
  onCancelOrder?: (orderId: string) => Promise<void>;
  onUpdateStatus?: (orderId: string, status: string) => Promise<void>;
}

export default function OperationsCenter({
  liveOrders,
  drivers,
  onlineDrivers,
  vendors,
  allOrders,
  activities,
  autoRetryEnabled,
  maintenanceMode,
  actionLoading,
  onToggleAutoRetry,
  onToggleMaintenance,
  onLockAllDrivers,
  onUnlockAllDrivers,
  onGlobalReset,
  onRefresh,
  onBroadcastMessage,
  onAssign,
  onToggleShiftLock,
  onCancelOrder,
  onUpdateStatus
}: OperationsCenterProps) {
  const [activeTab, setActiveTab] = useState<"monitor" | "distribution" | "system" | "map">("map");

  const pendingOrdersCount = liveOrders.filter(o => o.status === "جاري البحث" || o.status === "pending").length;
  const activeDriversCount = onlineDrivers.length;

  return (
    <div className="space-y-6 pb-20">
      {/* Integrated Dashboard Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT COLUMN: Pinned Real-time Monitor */}
        <div className="w-full lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-4">
          <div className="drawer-glass rounded-[32px] p-6 text-slate-900 dark:text-white shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <div className="flex flex-col">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">مركز التحكم الموحد</h3>
                 <div className="flex items-center gap-2">
                   <Monitor className="w-4 h-4 text-blue-500 dark:text-emerald-400" />
                   <span className="text-sm font-black">حالة النظام الآن</span>
                 </div>
               </div>
               <div className="flex h-2 w-2 relative">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </div>
             </div>
             
             <div className="space-y-6">
               {/* Auto-Retry Switch */}
               <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                 <div className="flex items-center justify-between mb-3">
                   <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">التوزيع التلقائي الذكي</span>
                   <button 
                     onClick={() => onToggleAutoRetry(!autoRetryEnabled)}
                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ${autoRetryEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                   >
                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${autoRetryEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                   </button>
                 </div>
                 <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                   {autoRetryEnabled 
                     ? "النظام يقوم حالياً بالبحث عن طيارين وتعيينهم تلقائياً لكل الطلبات المعلقة." 
                     : "التوزيع التلقائي متوقف. يجب تعيين الطلبات يدوياً للطيارين."}
                 </p>
               </div>

               {/* Quick Stats Grid */}
               <div className="grid grid-cols-2 gap-3">
                 <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3 border border-black/5 dark:border-white/5 flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">طلبات معلقة</p>
                    <p className={`text-xl font-black ${pendingOrdersCount > 0 ? "text-amber-500" : "text-slate-400"}`}>{pendingOrdersCount}</p>
                 </div>
                 <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3 border border-black/5 dark:border-white/5 flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">كابتن متصل</p>
                    <p className="text-xl font-black text-emerald-500">{activeDriversCount}</p>
                 </div>
               </div>

               <button 
                 onClick={onRefresh}
                 disabled={actionLoading}
                 className="w-full py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
               >
                 <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                 تحديث البيانات فوراً
               </button>
             </div>
          </div>

          {/* Activity Widget */}
          <div className="drawer-glass rounded-[32px] p-6 shadow-sm hidden lg:block">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">آخر التحركات</h3>
               <Activity className="w-3.5 h-3.5 text-blue-500" />
             </div>
             <div className="space-y-4">
               {activities.slice(0, 4).map((act, i) => (
                 <div key={i} className="flex gap-3 relative pb-4 last:pb-0">
                   {i !== 3 && <div className="absolute top-3 right-[3px] w-0.5 h-full bg-slate-100 dark:bg-slate-800" />}
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0 z-10" />
                   <div>
                     <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{act.text}</p>
                     <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">{act.time}</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Dynamic Content & Tab Switching */}
        <div className="flex-1 w-full space-y-6">
          
          {/* Main Workspace Navigation (Integrated) */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl w-fit border border-slate-200 dark:border-slate-800 z-40">
            <button 
              onClick={() => setActiveTab("map")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === "map" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5"
              }`}
            >
              <Radio className={`w-4 h-4 ${activeTab === "map" ? "text-white" : ""}`} />
              الخريطة المباشرة
            </button>
            <button 
              onClick={() => setActiveTab("monitor")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === "monitor" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5"
              }`}
            >
              <ListFilter className="w-4 h-4" />
              مراقبة العمليات
            </button>
            <button 
              onClick={() => setActiveTab("distribution")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === "distribution" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5"
              }`}
            >
              <Truck className="w-4 h-4" />
              التوزيع اليدوي {pendingOrdersCount > 0 && (
                <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">{pendingOrdersCount}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab("system")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === "system" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4" />
              تحكم النظام
            </button>
          </div>

          {/* Workspace Content */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "linear" }}
              >
                {activeTab === "map" && (
                  <div className="glass-panel rounded-[40px] shadow-xl overflow-hidden h-[650px] relative border-none">
                    <LiveMap
                      drivers={onlineDrivers.map(d => ({
                        ...d,
                        isOnline: d.is_online,
                        lastSeenTimestamp: d.lastSeenTimestamp,
                        status: allOrders.some(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit')) ? 'busy' : 'available',
                        details: allOrders.find(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit'))?.vendor_full_name ? `جاري العمل على طلب من ${allOrders.find(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit'))?.vendor_full_name}` : undefined
                      }))}
                      vendors={vendors.flatMap((v) => (v.location?.lat != null && v.location?.lng != null) ? [{ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng, details: `طلبات اليوم: ${v.orders}` }] : [])}
                      orders={allOrders.filter(o => (o.status === 'pending' || o.status === 'assigned' || o.status === 'in_transit')).map(o => {
                        // 1. Root Solution (V0.9.7): Link Order Marker to Driver Location if assigned
                        // This ensures the order indicator MOVES with the driver instead of staying at the shop/customer
                        const assignedDriver = o.driver_id ? onlineDrivers.find(d => d.id === o.driver_id) : null;
                        
                        // Use driver's real-time coords if they are moving/active
                        const driverLat = assignedDriver?.lat;
                        const driverLng = assignedDriver?.lng;

                        // Default coords (Customer or Vendor)
                        const customerLat = o.customer_details?.coords?.lat;
                        const customerLng = o.customer_details?.coords?.lng;
                        
                        const v = vendors.find(v => v.id_full === o.vendor_id);
                        const vendorLat = v?.location?.lat;
                        const vendorLng = v?.location?.lng;

                        // LOGIC: 
                        // - If assigned/in_transit, use driver location for tracking
                        // - If pending, use vendor location (since driver is still being searched)
                        let finalLat = (o.status === 'assigned' || o.status === 'in_transit') ? (driverLat ?? vendorLat ?? customerLat) : (vendorLat ?? customerLat);
                        let finalLng = (o.status === 'assigned' || o.status === 'in_transit') ? (driverLng ?? vendorLng ?? customerLng) : (vendorLng ?? customerLng);

                        if (finalLat == null || finalLng == null) return null;

                        return {
                          id: o.id,
                          name: o.vendor_full_name || "محل",
                          lat: finalLat,
                          lng: finalLng,
                          targetLat: (o.status === 'assigned' ? vendorLat : customerLat) || undefined,
                          targetLng: (o.status === 'assigned' ? vendorLng : customerLng) || undefined,
                          status: o.status === 'pending' ? 'جاري البحث عن طيار' : 
                                  o.status === 'assigned' ? 'تم التعيين - بانتظار التحصيل' : 'في الطريق للعميل',
                          details: `قيمة الطلب: ${o.financials?.order_value} ج.م`
                        };
                      }).filter((o): o is NonNullable<typeof o> => o !== null)}
                      zoom={13}
                      className="h-full w-full"
                    />
                    
                    {/* Map Pinned Stats Overlay */}
                    <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-3">
                       <div className="drawer-glass p-5 rounded-[32px] shadow-2xl space-y-3 min-w-[160px]">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">متاح</span>
                            </div>
                            <span className="text-xs font-black text-slate-900 dark:text-white">{onlineDrivers.filter(d => !allOrders.some(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit'))).length}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                              <span className="text-[10px] font-black text-slate-700">مشغول</span>
                            </div>
                            <span className="text-xs font-black text-slate-900">{onlineDrivers.filter(d => allOrders.some(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit'))).length}</span>
                          </div>
                          <div className="h-px bg-slate-100 my-1" />
                          <button 
                            onClick={onRefresh}
                            className="w-full py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl text-[9px] font-black flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all active:scale-95 mb-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            تحديث الخريطة والبيانات
                          </button>
                          <button 
                            onClick={() => setActiveTab('distribution')}
                            className="w-full py-2.5 bg-slate-900 text-white rounded-2xl text-[9px] font-black flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
                          >
                            <Truck className="w-3.5 h-3.5 text-emerald-400" />
                            توزيع الطلبات
                          </button>
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
                    autoRetryEnabled={autoRetryEnabled}
                    maintenanceMode={maintenanceMode}
                    drivers={drivers}
                    actionLoading={actionLoading}
                    onToggleAutoRetry={onToggleAutoRetry}
                    onToggleMaintenance={onToggleMaintenance}
                    onToggleShiftLock={onToggleShiftLock}
                    onLockAllDrivers={onLockAllDrivers}
                    onUnlockAllDrivers={onUnlockAllDrivers}
                    onGlobalReset={onGlobalReset}
                    onBroadcastMessage={onBroadcastMessage}
                    onRefresh={onRefresh}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Persistent System Status Bar */}
      <AnimatePresence>
        {maintenanceMode && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4"
          >
            <div className="p-4 rounded-[28px] shadow-2xl flex items-center justify-between border bg-red-600 border-red-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase">وضع الصيانة نشط</p>
                  <p className="text-[10px] font-bold text-white/80 tracking-tight">لا يمكن للمستخدمين دخول النظام حالياً</p>
                </div>
              </div>
              <button 
                onClick={() => onToggleMaintenance(false)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-[10px] font-black transition-all"
              >
                إيقاف الصيانة
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
