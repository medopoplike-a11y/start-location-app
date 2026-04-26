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
    <div className="h-full flex flex-col bg-slate-50 dark:bg-black">
      {/* AI Summary Display (V19.3.0) */}
      <AnimatePresence>
        {aiSummary && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="px-8 pt-4"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-3xl p-5 flex items-start gap-5 relative overflow-hidden shadow-xl shadow-indigo-500/10 border border-white/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-24 -mb-24" />
              
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shrink-0 relative z-10 shadow-inner border border-white/20">
                <Bot className="w-6 h-6" />
              </div>
              
              <div className="flex-1 relative z-10">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-90">التقرير التنفيذي الذكي</h3>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                      <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-emerald-300">V19.5.0 LIVE AI</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAiSummary(null)} 
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap text-indigo-50/90">
                  {aiSummary}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
             <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/10">
                <Zap size={18} />
             </div>
             <div>
                <h1 className="text-base font-black text-slate-900 dark:text-white leading-tight">مركز القيادة</h1>
                <div className="flex items-center gap-1.5">
                   <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tight">Active Pulse</span>
                </div>
             </div>
          </div>
          
          <div className="h-6 w-px bg-slate-100 dark:bg-slate-800" />
          
          <div className="flex gap-1.5">
            <button 
              onClick={() => setActiveTab("operations")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all relative ${
                activeTab === "operations" ? "bg-amber-500 text-white shadow-lg shadow-amber-600/10" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              المراقبة
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[7px] flex items-center justify-center rounded-full shadow-lg border-2 border-white dark:border-slate-900">
                  {pendingOrdersCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab("monitor")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all relative ${
                activeTab === "monitor" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              المهام
            </button>
            <button 
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all ${
                activeTab === "ai" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              AI
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
             <div className="text-center px-2">
                <p className="text-[8px] font-black text-slate-400 uppercase">النشطة</p>
                <p className="text-xs font-black text-amber-600">{liveOrders.length}</p>
             </div>
             <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
             <div className="text-center px-2">
                <p className="text-[8px] font-black text-slate-400 uppercase">متصل</p>
                <p className="text-xs font-black text-emerald-600">{onlineDrivers.length}</p>
             </div>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleGenerateAiSummary}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg font-black text-[10px] shadow-lg shadow-indigo-200/50 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
            تقرير AI
          </motion.button>

          <button 
            onClick={onRefresh}
            disabled={actionLoading}
            className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-500 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* V19.3.0: Performance & Status Bar */}
        <PerformanceMonitor />

        <AnimatePresence mode="wait">
          {activeTab === "operations" ? (
            <motion.div 
              key="ops"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex gap-4 w-full h-full overflow-hidden"
            >
              {/* 1. Main Map Area (Integrated) */}
              <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                <LiveMap
                  drivers={mapDrivers}
                  vendors={mapVendors}
                  orders={mapOrders}
                  zoom={13}
                  className="h-full w-full"
                />

                {/* Map Overlays: Quick Actions */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">التوزيع التلقائي</p>
                    <button 
                      onClick={() => onToggleAutoRetry(!autoRetryEnabled)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                        autoRetryEnabled ? "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/10" : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Zap className={`w-3.5 h-3.5 ${autoRetryEnabled ? "animate-pulse" : ""}`} />
                      <span className="text-[11px] font-black">{autoRetryEnabled ? "مفعّل" : "معطّل"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Side Distribution Panel (Manual Distribution Integrated) */}
              <motion.div 
                animate={{ width: showSidePanel ? 340 : 0, opacity: showSidePanel ? 1 : 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                      <Truck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white">التوزيع</h3>
                      <p className="text-[9px] text-slate-400 font-bold">الطلبات النشطة ({pendingOrders.length})</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSidePanel(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                    <ChevronRight className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {/* Active Orders Section (V0.9.87 Redesign) */}
                  <div>
                    <h4 className="text-[9px] font-black text-slate-400 uppercase mb-2 px-1">قائمة الطلبات</h4>
                    {pendingOrders.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <CheckCircle className="w-6 h-6 text-emerald-500/20 mx-auto mb-1.5" />
                        <p className="text-[10px] font-bold text-slate-400">لا توجد طلبات</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {pendingOrders.map(order => {
                          const isSelected = selectedOrderId === order.id;
                          const assignedDriver = order.driver_id ? drivers.find(d => d.id_full === order.driver_id) : null;
                          
                          return (
                            <div key={order.id} className="flex flex-col gap-1">
                              <button
                                onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
                                className={`w-full text-right p-3 rounded-xl border transition-all ${
                                  isSelected 
                                  ? "bg-slate-900 text-white border-slate-800 shadow-lg" 
                                  : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200"
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                  <div className="flex flex-col">
                                    <p className={`text-[11px] font-black ${isSelected ? "text-white" : "text-slate-900 dark:text-white"}`}>{order.vendor_full_name}</p>
                                    <p className={`text-[9px] font-bold ${isSelected ? "text-white/60" : "text-slate-400"}`}>{order.customer_details?.name || "عميل"}</p>
                                  </div>
                                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md ${
                                    order.status === 'pending' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                    order.status === 'assigned' ? 'bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' :
                                    'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                  }`}>
                                    {order.status === 'pending' ? 'بانتظار' : order.status === 'assigned' ? 'تم التعيين' : 'في الطريق'}
                                  </span>
                                </div>

                                {order.driver_id && (
                                  <div className={`flex items-center gap-1.5 mt-1.5 pt-1.5 border-t ${isSelected ? "border-white/10" : "border-slate-50 dark:border-slate-700"}`}>
                                    <div className="w-5 h-5 bg-blue-500/20 rounded-md flex items-center justify-center text-blue-500">
                                      <User size={10} />
                                    </div>
                                    <p className={`text-[9px] font-black ${isSelected ? "text-blue-400" : "text-blue-600"}`}>
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
            <motion.div 
              key="monitor" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto"
            >
              <OrdersView 
                liveOrders={liveOrders} 
                activities={activities}
                onCancelOrder={onCancelOrder}
                onUpdateStatus={onUpdateStatus}
              />
            </motion.div>
          ) : activeTab === "ai" ? (
            <motion.div 
              key="ai" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto"
            >
              <AIMonitorView 
                stats={stats}
                allOrders={allOrders}
                onlineDrivers={onlineDrivers}
              />
            </motion.div>
          ) : activeTab === "charts" ? (
            <motion.div 
              key="charts" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-black/20"
            >
              <AdminCharts orders={allOrders} />
            </motion.div>
          ) : (
            <motion.div 
              key="system" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto"
            >
              <SystemControlView 
                autoRetryEnabled={autoRetryEnabled}
                onToggleAutoRetry={onToggleAutoRetry}
                maintenanceMode={maintenanceMode}
                drivers={drivers}
                actionLoading={actionLoading}
                onToggleMaintenance={onToggleMaintenance}
                onLockAllDrivers={onLockAllDrivers}
                onUnlockAllDrivers={onUnlockAllDrivers}
                onGlobalReset={onGlobalReset}
                onRefresh={onRefresh}
                onBroadcastMessage={onBroadcastMessage}
                onIntegrityCheck={onIntegrityCheck}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default OperationsCenter;
