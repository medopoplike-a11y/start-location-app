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

  const pendingOrders = liveOrders.filter(o => o.status === "جاري البحث" || o.status === "pending");
  const availableDrivers = drivers.filter(d => !d.isShiftLocked && d.isOnline);
  const selectedOrder = pendingOrders.find(o => o.id_full === selectedOrderId);
  
  const pendingOrdersCount = pendingOrders.length;
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
                    ...d,
                    isOnline: d.is_online,
                    status: allOrders.some(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit')) ? 'busy' : 'available',
                    details: d.name
                  }))}
                  vendors={vendors.flatMap((v) => (v.location?.lat != null && v.location?.lng != null) ? [{ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng, details: `طلبات: ${v.orders}` }] : [])}
                  orders={allOrders.filter(o => (o.status === 'pending' || o.status === 'assigned' || o.status === 'in_transit')).map(o => {
                    const assignedDriver = o.driver_id ? onlineDrivers.find(d => d.id === o.driver_id) : null;
                    const v = vendors.find(v => v.id_full === o.vendor_id);
                    const vendorLat = v?.location?.lat;
                    const vendorLng = v?.location?.lng;
                    const customerLat = o.customer_details?.coords?.lat;
                    const customerLng = o.customer_details?.coords?.lng;

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
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">التوزيع اليدوي</h3>
                      <p className="text-[10px] text-slate-400 font-bold">إدارة الطلبات المعلقة {pendingOrdersCount > 0 && `(${pendingOrdersCount})`}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSidePanel(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Pending Orders Section */}
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 px-2">الطلبات المنتظرة</h4>
                    {pendingOrders.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <CheckCircle className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                        <p className="text-[11px] font-bold text-slate-400">لا توجد طلبات معلقة</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingOrders.map(order => (
                          <button
                            key={order.id_full}
                            onClick={() => setSelectedOrderId(selectedOrderId === order.id_full ? null : order.id_full)}
                            className={`w-full text-right p-3 rounded-2xl border transition-all ${
                              selectedOrderId === order.id_full 
                              ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20" 
                              : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p className={`text-xs font-black ${selectedOrderId === order.id_full ? "text-white" : "text-slate-900 dark:text-white"}`}>{order.vendor}</p>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${selectedOrderId === order.id_full ? "bg-white/20" : "bg-amber-100 text-amber-600"}`}>#{order.id}</span>
                            </div>
                            <p className={`text-[10px] font-bold ${selectedOrderId === order.id_full ? "text-white/70" : "text-slate-400"}`}>{order.customer} — {order.delivery_fee} ج.م</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Drivers Selection Section */}
                  <AnimatePresence>
                    {selectedOrderId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 px-2">اختر طياراً للتعيين</h4>
                        <div className="space-y-2">
                          {availableDrivers.length === 0 ? (
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3">
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                              <p className="text-[10px] font-bold text-rose-600">لا يوجد طيارين متاحين حالياً</p>
                            </div>
                          ) : (
                            availableDrivers.map(driver => (
                              <button
                                key={driver.id}
                                disabled={assigning}
                                onClick={() => handleAssign(driver.id_full, driver.name)}
                                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-600">
                                    <User className="w-4 h-4 text-slate-400" />
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-black text-slate-900 dark:text-white">{driver.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400">الطلبات النشطة: {allOrders.filter(o => o.driver_id === driver.id && (o.status === 'assigned' || o.status === 'in_transit')).length}</p>
                                  </div>
                                </div>
                                <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <CheckCircle className="w-3 h-3 text-white" />
                                </div>
                              </button>
                            ))
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
                allOrders={allOrders} 
                actionLoading={actionLoading}
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
