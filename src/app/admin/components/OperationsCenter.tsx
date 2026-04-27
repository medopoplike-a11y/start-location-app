"use client";

import { useState, useMemo, useEffect, useRef, memo } from "react";
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
  Users,
  CheckCircle,
  AlertCircle,
  X,
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Bot,
  Loader2,
  BarChart3
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import { requestAIAnalysis } from "@/lib/api/ai";
import { aiVoice } from "@/lib/utils/voice"; // V19.4.0: Import AI Voice
import OrdersView from "./OrdersView";
import SystemControlView from "./SystemControlView";
import AIMonitorView from "./AIMonitorView";
import AdminCharts from "./AdminCharts";
import { PerformanceMonitor } from "./PerformanceMonitor";
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
  stats?: any[];
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
  onIntegrityCheck?: () => void;
}

const OperationsCenter = memo(function OperationsCenter({
  liveOrders,
  drivers,
  onlineDrivers,
  vendors,
  allOrders,
  activities,
  autoRetryEnabled,
  maintenanceMode,
  actionLoading,
  stats,
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
  onUpdateStatus,
  onIntegrityCheck
}: OperationsCenterProps) {
  const [activeTab, setActiveTab] = useState<"operations" | "monitor" | "system" | "ai" | "charts">("operations");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(true);
  
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const prevOrdersRef = useRef<LiveOrderItem[]>([]);

  const statsData = useMemo(() => stats || [
    { label: "طلبات نشطة", value: liveOrders.length, color: "blue" },
    { label: "مناديب متصلين", value: onlineDrivers.length, color: "emerald" },
    { label: "تنبيهات النظام", value: activities.filter(a => a.type === 'alert').length, color: "amber" }
  ], [liveOrders.length, onlineDrivers.length, activities, stats]);

  const filteredOrders = useMemo(() => liveOrders, [liveOrders]);

  // V19.3.0: Voice Notifications for Admin
  useEffect(() => {
    if (prevOrdersRef.current.length > 0) {
      // Check for new orders
      const newOrders = liveOrders.filter(order => !prevOrdersRef.current.some(prev => prev.id === order.id));
      newOrders.forEach(order => {
        aiVoice.announceNewOrderAdmin(order.id, order.vendor || "متجر جديد");
      });

      // Check for status changes
      liveOrders.forEach(order => {
        const prevOrder = prevOrdersRef.current.find(prev => prev.id === order.id);
        if (prevOrder && prevOrder.status !== order.status) {
          aiVoice.announceStatusChange(order.id, order.status, 'admin');
        }
      });
    }
    prevOrdersRef.current = liveOrders;
  }, [liveOrders]);

  const handleGenerateAiSummary = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const summaryStats = {
        totalOrders: liveOrders.length,
        pendingOrders: liveOrders.filter(o => o.status === 'جاري البحث').length,
        onlineDrivers: onlineDrivers.length,
        revenue: liveOrders.reduce((acc, o) => acc + (o.financials?.order_value || 0), 0)
      };
      const res = await requestAIAnalysis('admin_summary', { stats: summaryStats }, 'admin');
      if (res.analysis?.content) setAiSummary(res.analysis.content);
    } catch (err) {
      console.error("AI Summary Error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // V1.5.0: Memoized Map Data to prevent heavy re-renders
  const mapDrivers = useMemo(() => onlineDrivers.map(d => ({
    id: d.id,
    name: d.name || "كابتن",
    lat: d.lat,
    lng: d.lng,
    isOnline: d.is_online,
    status: d.status,
    path: d.path,
    lastSeenTimestamp: d.lastSeenTimestamp
  })), [onlineDrivers]);

  const mapOrders = useMemo(() => allOrders.filter(o => (o.status === 'pending' || o.status === 'assigned' || o.status === 'in_transit')).map(o => {
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
  }).filter((o): o is NonNullable<typeof o> => o !== null), [allOrders, onlineDrivers, vendors]);

  const mapVendors = useMemo(() => vendors.flatMap((v) => (v.location?.lat != null && v.location?.lng != null) ? [{ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng, details: `طلبات: ${v.orders}` }] : []), [vendors]);

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
    <div className="flex flex-col gap-6" dir="rtl">
      {/* 1. Dashboard Tabs - PREMIUM GLASS DESIGN */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-1 rounded-2xl border border-white/20 dark:border-slate-800/50 shadow-lg flex gap-1">
          {[
            { id: "operations", label: "غرفة العمليات", icon: <Radio className="w-3.5 h-3.5" /> },
            { id: "monitor", label: "مراقبة الأداء", icon: <Monitor className="w-3.5 h-3.5" /> },
            { id: "ai", label: "ذكاء اصطناعي", icon: <Bot className="w-3.5 h-3.5" /> },
            { id: "system", label: "إدارة النظام", icon: <Settings className="w-3.5 h-3.5" /> },
            { id: "charts", label: "إحصائيات", icon: <BarChart3 className="w-3.5 h-3.5" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onRefresh}
            className="p-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-xl border border-white/20 dark:border-slate-800/50 shadow-md text-slate-500 hover:text-indigo-600 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Main View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Area: Main Content */}
        <div className="lg:col-span-12 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === "operations" && (
              <motion.div 
                key="ops" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                {/* Unified Dashboard Grid: Orders + Map + Distribution */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Orders List (Always Visible) */}
                  <div className="xl:col-span-3 space-y-6 xl:sticky xl:top-6 h-fit xl:max-h-[calc(100vh-140px)] overflow-hidden flex flex-col">
                    <OrdersView 
                      liveOrders={liveOrders}
                      onlineDrivers={onlineDrivers}
                      onCancelOrder={onCancelOrder}
                      onUpdateStatus={onUpdateStatus}
                      onSelectOrder={setSelectedOrderId}
                      selectedOrderId={selectedOrderId}
                      activities={activities}
                      isCompact={true}
                    />
                  </div>

                  {/* Right Column: Map & Distribution Panel */}
                  <div className="xl:col-span-9 space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                      {/* Map Container */}
                      <div className={`${selectedOrderId ? 'xl:col-span-8' : 'xl:col-span-12'} relative h-[450px] md:h-[600px] xl:h-[750px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[32px] border border-white/20 dark:border-slate-800/50 shadow-xl overflow-hidden group transition-all duration-500`}>
                        <LiveMap 
                          drivers={mapDrivers}
                          orders={mapOrders}
                          vendors={mapVendors}
                          zoom={13}
                        />
                        {/* Map Overlays */}
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                          <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-3">
                            <div className="flex -space-x-2">
                              {onlineDrivers.slice(0, 3).map((d, i) => (
                                <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-indigo-600 flex items-center justify-center text-[8px] text-white font-black">
                                  {d.name[0]}
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] text-white font-black">{onlineDrivers.length} متصل</span>
                          </div>
                          
                          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-lg">
                             <button 
                                onClick={() => onToggleAutoRetry(!autoRetryEnabled)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                                  autoRetryEnabled ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                                }`}
                             >
                                <Zap className={`w-3 h-3 ${autoRetryEnabled ? "animate-pulse" : ""}`} />
                                <span className="text-[9px] font-black">{autoRetryEnabled ? "توزيع آلي: مفعل" : "توزيع آلي: معطل"}</span>
                             </button>
                          </div>
                        </div>

                        {/* Floating Activity Log Toggle (New) */}
                        <div className="absolute bottom-4 right-4 z-10">
                          <button 
                            onClick={() => setShowSidePanel(!showSidePanel)}
                            className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all"
                          >
                            <Activity className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Manual Distribution Panel */}
                      <AnimatePresence>
                        {selectedOrderId && (
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="xl:col-span-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[32px] border border-white/20 dark:border-slate-800/50 shadow-xl flex flex-col overflow-hidden h-[450px] md:h-[600px] xl:h-[750px]"
                          >
                            <div className="p-5 border-b border-white/10 dark:border-slate-800/30 flex items-center justify-between bg-indigo-600/5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                  <Users className="w-4 h-4" />
                                </div>
                                <div>
                                  <h3 className="font-black text-xs text-slate-900 dark:text-white">توزيع الطلب</h3>
                                  <p className="text-[9px] font-bold text-slate-500">اختر الكابتن الأنسب للطلب</p>
                                </div>
                              </div>
                              <button onClick={() => setSelectedOrderId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                               <div className="p-4 bg-indigo-600 rounded-[24px] shadow-lg shadow-indigo-600/10 mb-6">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest">الطلب المختار</p>
                                    <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">#{selectedOrderId.slice(0, 8)}</span>
                                  </div>
                                  <p className="text-sm font-black text-white">{selectedOrder?.vendor_full_name || "غير معروف"}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Store className="w-3 h-3 text-indigo-200" />
                                    <p className="text-[10px] font-bold text-indigo-100">{selectedOrder?.vendor_id || "متجر"}</p>
                                  </div>
                               </div>

                               <div className="flex items-center justify-between mb-4 px-1">
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الكباتن المتاحين</h4>
                                 <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-500/20">{allPotentialDrivers.length} كابتن</span>
                               </div>

                               {allPotentialDrivers.length === 0 ? (
                                 <div className="py-12 text-center">
                                   <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200 dark:border-slate-700">
                                     <User className="w-8 h-8 text-slate-300" />
                                   </div>
                                   <p className="text-xs font-black text-slate-400 italic">لا يوجد طيارين متاحين حالياً</p>
                                 </div>
                               ) : (
                                 allPotentialDrivers.map(driver => {
                                   const isAssigned = selectedOrder?.driver_id === driver.id_full;
                                   const activeOrders = allOrders.filter(o => o.driver_id === driver.id_full && (o.status === 'assigned' || o.status === 'in_transit')).length;
                                   return (
                                     <button
                                       key={driver.id_full}
                                       disabled={assigning || isAssigned}
                                       onClick={() => handleAssign(driver.id_full, driver.name)}
                                       className={`w-full flex items-center justify-between p-4 rounded-[24px] border transition-all group ${
                                         isAssigned 
                                           ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" 
                                           : "bg-white/50 dark:bg-white/5 border-white/20 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-indigo-500/5"
                                       }`}
                                     >
                                       <div className="flex items-center gap-3 text-right">
                                         <div className="relative">
                                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                                             driver.isActuallyOnline ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white" : "bg-slate-100 text-slate-400 border-slate-200"
                                           }`}>
                                             <User className="w-6 h-6" />
                                           </div>
                                           {driver.isActuallyOnline && (
                                             <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse shadow-lg" />
                                           )}
                                         </div>
                                         <div>
                                           <div className="flex items-center gap-2">
                                             <p className="text-xs font-black text-slate-900 dark:text-white">{driver.name}</p>
                                           </div>
                                           <div className="flex items-center gap-3 mt-1">
                                              <div className="flex items-center gap-1">
                                                <Truck className="w-3 h-3 text-slate-400" />
                                                <p className="text-[9px] font-bold text-slate-400">{activeOrders} طلبات</p>
                                              </div>
                                              {driver.rating > 0 && (
                                                <div className="flex items-center gap-1">
                                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                                  <p className="text-[9px] font-bold text-slate-400">{driver.rating}</p>
                                                </div>
                                              )}
                                           </div>
                                         </div>
                                       </div>
                                       {isAssigned ? (
                                         <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                            <CheckCircle className="w-4 h-4" />
                                         </div>
                                       ) : (
                                         <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md group-hover:bg-indigo-600 group-hover:text-white">
                                           <ChevronLeft className="w-5 h-5" />
                                         </div>
                                       )}
                                     </button>
                                   );
                                 })
                               )}
                            </div>

                            {selectedOrder?.driver_id && (
                               <div className="p-4 bg-white/50 dark:bg-slate-900/50 border-t border-white/10 dark:border-slate-800/30">
                                  <button 
                                     onClick={() => handleUnassign(selectedOrderId)}
                                     disabled={assigning}
                                     className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[20px] text-[10px] font-black hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                                  >
                                     إلغاء التعيين الحالي وإعادة الطلب للانتظار
                                  </button>
                               </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Collapsible Sidebar (AI & Activity) - Moved here to be part of the main area but collapsible */}
                    <AnimatePresence>
                      {showSidePanel && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        >
                          {/* AI Intelligence Card */}
                          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[32px] border border-indigo-500 shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group h-[200px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                            <div className="relative z-10 flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                                  <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h3 className="text-white font-black text-sm">ذكاء العمليات</h3>
                                  <p className="text-indigo-100/70 text-[9px] font-bold uppercase tracking-widest">AI Fleet Intelligence</p>
                                </div>
                              </div>
                              <button 
                                onClick={handleGenerateAiSummary}
                                disabled={aiLoading}
                                className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black hover:bg-indigo-50 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                              >
                                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "تحليل فوري"}
                              </button>
                            </div>
                            
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 overflow-y-auto max-h-[100px] no-scrollbar">
                              {aiSummary ? (
                                <p className="text-white text-[11px] font-bold leading-relaxed">{aiSummary}</p>
                              ) : (
                                <div className="space-y-2">
                                  <div className="h-3 w-3/4 bg-white/10 rounded animate-pulse" />
                                  <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
                                  <div className="h-3 w-1/2 bg-white/10 rounded animate-pulse" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Activity Log - GLASS DESIGN */}
                          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[32px] border border-white/20 dark:border-slate-800/50 shadow-xl flex flex-col overflow-hidden h-[200px]">
                            <div className="p-4 border-b border-white/10 dark:border-slate-800/30 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                <h3 className="font-black text-xs text-slate-900 dark:text-white">سجل العمليات</h3>
                              </div>
                              <button onClick={() => setShowSidePanel(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex-1 p-4 space-y-3 overflow-y-auto no-scrollbar">
                              {activities.length > 0 ? (
                                activities.slice(0, 10).map((activity, idx) => (
                                  <div key={idx} className="flex gap-3 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.6)] group-hover:scale-150 transition-transform" />
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight mb-1">{activity.text}</p>
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{activity.time}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="py-8 text-center">
                                  <Loader2 className="w-8 h-8 text-slate-200 mx-auto mb-2 animate-spin" />
                                  <p className="text-[10px] font-bold text-slate-400 italic">بانتظار العمليات...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "monitor" && (
              <motion.div key="mon" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <PerformanceMonitor onlineDrivers={onlineDrivers} liveOrders={liveOrders} />
              </motion.div>
            )}

            {activeTab === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AIMonitorView stats={statsData} allOrders={allOrders} onlineDrivers={onlineDrivers} />
              </motion.div>
            )}

            {activeTab === "system" && (
              <motion.div key="sys" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SystemControlView 
                  autoRetry={autoRetryEnabled} 
                  maintenanceMode={maintenanceMode}
                  onToggleAutoRetry={onToggleAutoRetry}
                  onToggleMaintenance={onToggleMaintenance}
                  onLockAll={onLockAllDrivers}
                  onUnlockAll={onUnlockAllDrivers}
                  onReset={onGlobalReset}
                  onBroadcast={onBroadcastMessage}
                  onIntegrityCheck={onIntegrityCheck}
                />
              </motion.div>
            )}

            {activeTab === "charts" && (
              <motion.div key="charts" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AdminCharts orders={allOrders} drivers={drivers} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

export default OperationsCenter;
