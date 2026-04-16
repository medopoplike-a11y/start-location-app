"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Truck, 
  Settings, 
  RefreshCw, 
  Radio,
  Monitor,
  LayoutGrid,
  Map as MapIcon,
  Zap,
  Store,
  User,
  CheckCircle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import dynamic from "next/dynamic";
import OrdersView from "./OrdersView";
import SystemControlView from "./SystemControlView";
import type { LiveOrderItem, DriverCard, ActivityItem, OnlineDriver, VendorCard, AdminOrder } from "../types";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-50 dark:bg-slate-900 animate-pulse flex items-center justify-center text-slate-400 font-black">جاري تحميل الخريطة...</div>
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
  onAssign,
  onToggleShiftLock,
  onCancelOrder,
  onUpdateStatus
}: OperationsCenterProps) {
  const [activeTab, setActiveTab] = useState<"operations" | "monitor" | "system">("operations");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(true);

  const pendingOrders = allOrders.filter(o => o.status === "pending" || o.status === "assigned" || o.status === "in_transit");
  
  // V0.9.87: Get ALL potential drivers for manual assignment, not just online ones
  // but prioritize online drivers in the list.
  const allPotentialDrivers = drivers.map(d => {
    const isInRegistry = onlineDrivers.find(od => od.id === d.id_full);
    return {
      ...d,
      isActuallyOnline: d.isOnline || !!isInRegistry,
      liveLocation: isInRegistry ? { lat: isInRegistry.lat, lng: isInRegistry.lng } : d.location
    };
  }).sort((a, b) => (b.isActuallyOnline ? 1 : 0) - (a.isActuallyOnline ? 1 : 0));

  const selectedOrder = allOrders.find(o => o.id === selectedOrderId);
  
  const pendingOrdersCount = allOrders.filter(o => o.status === "pending").length;
  const activeDriversCount = onlineDrivers.length;

  const handleAssign = async (driverId: string, driverName: string) => {
    if (!selectedOrderId) return;
    setAssigning(true);
    try {
      await onAssign(selectedOrderId, driverId, driverName);
      setSelectedOrderId(null);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء تعيين هذا الطلب وإعادته لقائمة الانتظار؟")) return;
    setAssigning(true);
    try {
      // V0.9.92: Using RPC for reliable unassigning
      const { error } = await supabase.rpc('unassign_order_admin', { p_order_id: orderId });
        
      if (error) throw error;
      
      setSelectedOrderId(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Unassign failed:", err);
      alert("فشل إلغاء التعيين: " + (err.message || "خطأ في الاتصال"));
    } finally {
      setAssigning(false);
    }
  };

  const handleChangeDriver = async (orderId: string) => {
    if (!confirm("هل تريد تغيير الطيار لهذا الطلب؟ سيتم إرجاع الطلب للانتظار لتتمكن من اختيار طيار جديد.")) return;
    setAssigning(true);
    try {
      const { error } = await supabase.rpc('unassign_order_admin', { p_order_id: orderId });
      if (error) throw error;
      
      // Keep selectedOrderId to immediately show available drivers for re-assignment
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Change driver failed:", err);
      alert("فشل تغيير الطيار");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">
      {/* Top Unified Navigation */}
      <div className="flex items-center justify-between mb-4 bg-white/50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab("operations")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "operations" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            غرفة العمليات المدمجة
          </button>
          <button 
            onClick={() => setActiveTab("monitor")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "monitor" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Activity className="w-4 h-4" />
            المراقبة التفصيلية
          </button>
          <button 
            onClick={() => setActiveTab("system")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "system" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            إعدادات النظام
          </button>
        </div>

        <div className="flex items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase">{activeDriversCount} كابتن متصل</span>
          </div>
          <button onClick={onRefresh} disabled={actionLoading} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
            <RefreshCw className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === "operations" ? (
            <motion.div 
              key="ops"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex gap-4 w-full h-full overflow-hidden"
            >
              {/* 1. Main Map Area (Integrated) */}
              <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 rounded-[32px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                <LiveMap
                  drivers={onlineDrivers.map(d => ({
                    id: d.id,
                    name: d.name || "كابتن",
                    lat: d.lat,
                    lng: d.lng,
                    isOnline: d.is_online,
                    status: d.status,
                    path: d.path,
                    lastSeenTimestamp: d.lastSeenTimestamp
                  }))}
                  vendors={vendors.flatMap((v) => (v.location?.lat != null && v.location?.lng != null) ? [{ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng, details: `طلبات: ${v.orders}` }] : [])}
                  orders={allOrders.filter(o => (o.status === 'pending' || o.status === 'assigned' || o.status === 'in_transit')).map(o => {
                    // V0.9.78: CRITICAL FIX - Use the real-time onlineDrivers registry for order tracking
                    // instead of the static drivers list which only updates on full refresh.
                    const assignedDriver = o.driver_id ? onlineDrivers.find(d => d.id === o.driver_id) : null;
                    const v = vendors.find(v => v.id_full === o.vendor_id);
                    const vendorLat = v?.location?.lat;
                    const vendorLng = v?.location?.lng;
                    const customerLat = o.customer_details?.coords?.lat;
                    const customerLng = o.customer_details?.coords?.lng;

                    // Use driver's live location if assigned/in_transit, otherwise fallback to vendor/customer
                    let finalLat = (o.status === 'assigned' || o.status === 'in_transit') ? (assignedDriver?.lat ?? vendorLat ?? customerLat) : (vendorLat ?? customerLat);
                    let finalLng = (o.status === 'assigned' || o.status === 'in_transit') ? (assignedDriver?.lng ?? vendorLng ?? customerLng) : (vendorLng ?? customerLng);

                    if (finalLat == null || finalLng == null) return null;

                    return {
                      id: o.id,
                      name: o.vendor_full_name || "محل",
                      lat: finalLat,
                      lng: finalLng,
                      targetLat: (o.status === 'assigned' ? vendorLat : customerLat) || undefined,
                      targetLng: (o.status === 'assigned' ? vendorLng : customerLng) || undefined,
                      status: o.status === 'pending' ? 'بانتظار التعيين' : (o.status === 'assigned' ? 'تم التعيين' : 'في الطريق'),
                    };
                  }).filter((o): o is NonNullable<typeof o> => o !== null)}
                  zoom={13}
                  className="h-full w-full"
                />

                {/* Map Overlays: Quick Actions */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">التوزيع التلقائي</p>
                    <button 
                      onClick={() => onToggleAutoRetry(!autoRetryEnabled)}
                      className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
                        autoRetryEnabled ? "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Zap className={`w-4 h-4 ${autoRetryEnabled ? "animate-pulse" : ""}`} />
                      <span className="text-xs font-black">{autoRetryEnabled ? "مفعّل الآن" : "معطّل حالياً"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Side Distribution Panel (Manual Distribution Integrated) */}
              <motion.div 
                animate={{ width: showSidePanel ? 400 : 0, opacity: showSidePanel ? 1 : 0 }}
                className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">التوزيع والتحكم</h3>
                      <p className="text-[10px] text-slate-400 font-bold">إدارة الطلبات النشطة ({pendingOrders.length})</p>
                <span className="text-[8px] font-black opacity-30 tracking-widest mr-2 uppercase">v0.9.95-FULL-SYNC-UNIFIED</span>
                    </div>
                  </div>
                  <button onClick={() => setShowSidePanel(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Active Orders Section (V0.9.87 Redesign) */}
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 px-2">قائمة الطلبات النشطة والتحكم</h4>
                    {pendingOrders.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <CheckCircle className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                        <p className="text-[11px] font-bold text-slate-400">لا توجد طلبات نشطة</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingOrders.map(order => {
                          const isSelected = selectedOrderId === order.id;
                          const assignedDriver = order.driver_id ? drivers.find(d => d.id_full === order.driver_id) : null;
                          
                          return (
                            <div key={order.id} className="flex flex-col gap-1">
                              <button
                                onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
                                className={`w-full text-right p-4 rounded-[24px] border transition-all ${
                                  isSelected 
                                  ? "bg-slate-900 text-white border-slate-800 shadow-xl" 
                                  : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200"
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex flex-col">
                                    <p className={`text-xs font-black ${isSelected ? "text-white" : "text-slate-900 dark:text-white"}`}>{order.vendor_full_name}</p>
                                    <p className={`text-[10px] font-bold ${isSelected ? "text-white/60" : "text-slate-400"}`}>{order.customer_details?.name || "عميل"}</p>
                                  </div>
                                  <span className={`text-[8px] font-black px-2 py-1 rounded-lg ${
                                    order.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                    order.status === 'assigned' ? 'bg-sky-100 text-sky-600' :
                                    'bg-indigo-100 text-indigo-600'
                                  }`}>
                                    {order.status === 'pending' ? 'بانتظار التعيين' : order.status === 'assigned' ? 'تم التعيين' : 'في الطريق'}
                                  </span>
                                </div>

                                {order.driver_id && (
                                  <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${isSelected ? "border-white/10" : "border-slate-50 dark:border-slate-700"}`}>
                                    <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-500">
                                      <User size={12} />
                                    </div>
                                    <p className={`text-[10px] font-black ${isSelected ? "text-blue-400" : "text-blue-600"}`}>
                                      الكابتن: {assignedDriver?.name || "غير معروف"}
                                    </p>
                                  </div>
                                )}
                              </button>

                              {/* Action Buttons for Selected Order (V0.9.87) */}
                              <AnimatePresence>
                                {isSelected && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-2 px-2 pb-2"
                                  >
                                    {order.status !== 'pending' && (
                                      <button 
                                        onClick={() => handleUnassign(order.id)}
                                        className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-rose-500/20"
                                      >
                                        إلغاء التعيين
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleChangeDriver(order.id)}
                                      className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-amber-500/20"
                                    >
                                      تغيير الطيار
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Drivers Selection Section (V0.9.87 - Professional List) */}
                  <AnimatePresence>
                    {selectedOrderId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-4 border-t border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between mb-4 px-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase">اختر طياراً للتعيين</h4>
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{allPotentialDrivers.length} كابتن</span>
                        </div>
                        
                        <div className="space-y-2">
                          {allPotentialDrivers.length === 0 ? (
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3">
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                              <p className="text-[10px] font-bold text-rose-600">لا يوجد طيارين مسجلين</p>
                            </div>
                          ) : (
                            allPotentialDrivers.map(driver => {
                              const isCurrentlyAssigned = selectedOrder?.driver_id === driver.id_full;
                              const activeOrdersCount = allOrders.filter(o => o.driver_id === driver.id_full && (o.status === 'assigned' || o.status === 'in_transit')).length;

                              return (
                                <button
                                  key={driver.id_full}
                                  disabled={assigning || isCurrentlyAssigned}
                                  onClick={() => handleAssign(driver.id_full, driver.name)}
                                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${
                                    isCurrentlyAssigned 
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 cursor-default" 
                                    : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                      driver.isActuallyOnline ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                                    }`}>
                                      <User size={18} />
                                    </div>
                                    <div className="text-right">
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-black text-slate-900 dark:text-white">{driver.name}</p>
                                        <div className={`w-1.5 h-1.5 rounded-full ${driver.isActuallyOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                                      </div>
                                      <p className="text-[9px] font-bold text-slate-400">
                                        {activeOrdersCount} طلبات نشطة • {driver.isActuallyOnline ? "متصل" : `آخر ظهور: ${driver.lastSeen}`}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {isCurrentlyAssigned ? (
                                    <div className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-[8px] font-black">
                                      معين حالياً
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 bg-white dark:bg-slate-600 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-slate-100 shadow-sm text-emerald-500">
                                      <CheckCircle size={16} />
                                    </div>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Sidebar Toggle (Floating) */}
              {!showSidePanel && (
                <button 
                  onClick={() => setShowSidePanel(true)}
                  className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-l-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
            </motion.div>
          ) : activeTab === "monitor" ? (
            <motion.div key="monitor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto">
              <OrdersView 
                liveOrders={liveOrders} 
                activities={activities}
                onCancelOrder={onCancelOrder}
                onUpdateStatus={onUpdateStatus}
              />
            </motion.div>
          ) : (
            <motion.div key="system" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto">
              <SystemControlView 
                maintenanceMode={maintenanceMode}
                onToggleMaintenance={onToggleMaintenance}
                onLockAllDrivers={onLockAllDrivers}
                onUnlockAllDrivers={onUnlockAllDrivers}
                onGlobalReset={onGlobalReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
