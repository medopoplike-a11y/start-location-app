"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import { 
  Store, 
  Truck, 
  MapPin, 
  Power, 
  Phone, 
  Navigation, 
  Zap, 
  Activity, 
  Clock, 
  ChevronUp, 
  ChevronDown,
  Layers,
  Map as MapIcon,
  Maximize2,
  CheckCircle2,
  CheckCircle,
  XCircle,
  Sparkles,
  Bot,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Order } from "../types";
import { requestAIAnalysis } from "@/lib/api/ai";
import OrderDetailsModal from "./OrderDetailsModal";
import RatingModal from "@/components/RatingModal";
import { SuccessCelebration } from "@/components/SuccessCelebration";
import DriverOrderItem from "./DriverOrderItem";
import { supabase } from "@/lib/supabaseClient";
import { aiVoice } from "@/lib/utils/voice"; // V19.3.0: Import AI Voice
import { useToast } from "@/hooks/useToast";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-slate-400 font-bold">
      جاري تحميل الخريطة الاحترافية...
    </div>
  ),
});

function TabButton({ active, onClick, icon, label, count, color }: { 
  active: boolean, 
  onClick: () => void, 
  icon: React.ReactNode, 
  label: string, 
  count: number,
  color: 'blue' | 'amber' | 'emerald'
}) {
  const colorClasses = {
    blue: active 
      ? "bg-blue-600 text-white border-blue-400/30 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10" 
      : "bg-white/50 dark:bg-slate-900/50 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-blue-500/30 dark:hover:border-blue-500/30",
    amber: active 
      ? "bg-amber-500 text-white border-amber-300/30 shadow-2xl shadow-amber-500/30 ring-4 ring-amber-500/10" 
      : "bg-white/50 dark:bg-slate-900/50 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-amber-500/30 dark:hover:border-amber-500/30",
    emerald: active 
      ? "bg-emerald-600 text-white border-emerald-400/30 shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-500/10" 
      : "bg-white/50 dark:bg-slate-900/50 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 dark:hover:border-emerald-500/30"
  };

  return (
    <motion.button 
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex-1 py-4 rounded-[24px] text-[12px] font-black transition-all flex items-center justify-center gap-2.5 border-2 backdrop-blur-xl ${colorClasses[color]}`}
    >
      {icon}
      <span className="hidden sm:inline tracking-tight">{label}</span>
      <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] ${active ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
        {count}
      </span>
    </motion.button>
  );
}

interface DriverOrdersViewProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  isActive: boolean;
  driverLocation: { lat: number; lng: number } | null;
  driverId: string | null;
  orders: Order[];
  autoAccept: boolean;
  onToggleAutoAccept: () => void;
  onAcceptOrder: (orderId: string) => Promise<void>;
  onPickupOrder: (orderId: string) => Promise<void>;
  onDeliverOrder: (orderId: string) => Promise<void>;
  onConfirmPayment: (orderId: string) => Promise<void>;
  onDeliverCustomer?: (orderId: string, customerIndex: number) => Promise<void>;
  onPreviewImage?: (url: string) => void;
  mapMode: boolean;
  onToggleMapMode: () => void;
}

const DriverOrdersView = memo(function DriverOrdersView({
  todayDeliveryFees,
  vendorDebt,
  isActive,
  driverLocation,
  driverId,
  orders,
  autoAccept,
  onToggleAutoAccept,
  onAcceptOrder,
  onPickupOrder,
  onDeliverOrder,
  onConfirmPayment,
  onDeliverCustomer,
  onPreviewImage,
  mapMode,
  onToggleMapMode,
}: DriverOrdersViewProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [activeOrderTab, setActiveOrderTab] = useState<"available" | "active" | "completed" | "cancelled">("available");
  const [isNavigating, setIsNavigating] = useState(false);
  const [aiRouteLoading, setAiRouteLoading] = useState(false);
  const [aiRouteResult, setAiRouteResult] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false); // V19.3.0: Success Celebration State
  const toast = useToast();

  const handleOptimizeRoute = async () => {
    if (aiRouteLoading || activeOrders.length < 2) return;
    setAiRouteLoading(true);
    try {
      const res = await requestAIAnalysis('route_optimization', {
        orders: activeOrders.map(o => ({
          id: o.id_full,
          vendor: o.vendor,
          customers: o.customers?.map(c => ({ name: c.name, area: c.area }))
        })),
        location: driverLocation
      }, 'driver');
      if (res.analysis?.content) setAiRouteResult(res.analysis.content);
    } catch (err) {
      console.error("Route Optimization Error:", err);
    } finally {
      setAiRouteLoading(false);
    }
  };

  // Optimistic UI improvements: use a local state for actions to prevent double-clicks and lag
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // 1. Action Handlers
  const handleAccept = async (orderId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    // Optimistic Update
    setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'assigned' } : o));
    try {
      aiVoice.playSound('success'); // V19.3.0: Success sound
      await onAcceptOrder(orderId);
      toast.success("تم قبول الطلب بنجاح");
      setSelectedOrder(null);
    } catch (err) {
      setLocalOrders(orders); // Rollback
      toast.error("فشل قبول الطلب، حاول مرة أخرى");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickup = async (orderId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    // Optimistic Update: Change status immediately in UI
    const previousOrders = [...localOrders];
    setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'in_transit', isPickedUp: true } : o));
    
    try {
      aiVoice.announceStatusChange(orderId, 'picked_up'); // V19.3.0: AI Voice announcement
      
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
      
      await onPickupOrder(orderId);
      toast.success("تم تأكيد استلام الطلب");
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'in_transit' } : null);
      }
    } catch (err) {
      setLocalOrders(previousOrders); // Rollback
      toast.error("فشل تأكيد الاستلام");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async (orderId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    // Optimistic Update: Remove from active immediately
    const previousOrders = [...localOrders];
    setLocalOrders(prev => prev.filter(o => o.id !== orderId));
    
    try {
      aiVoice.announceStatusChange(orderId, 'delivered'); // V19.3.0: AI Voice announcement
      
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { Haptics, NotificationType } = await import("@capacitor/haptics");
        Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      }
      
      await onDeliverOrder(orderId);
      toast.success("تم توصيل الطلب بنجاح! أحسنت");
      setShowCelebration(true); // V19.3.0: Trigger celebration
      setTimeout(() => setShowCelebration(false), 3000); // Hide after 3s
      
      setRatingOrder(selectedOrder);
      setSelectedOrder(null);
      setIsNavigating(false);
    } catch (err) {
      setLocalOrders(previousOrders); // Rollback
      toast.error("فشل تأكيد التوصيل");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverCustomer = async (orderId: string, customerIndex: number) => {
    if (!onDeliverCustomer) return;
    setActionLoading(true);
    try {
      await onDeliverCustomer(orderId, customerIndex);
      toast.success("تم تأكيد التوصيل للعميل");
      // Update local selectedOrder state to reflect the specific customer delivery
      if (selectedOrder && selectedOrder.id === orderId && selectedOrder.customers) {
        const newCustomers = [...selectedOrder.customers];
        newCustomers[customerIndex] = { ...newCustomers[customerIndex], status: 'delivered' };
        setSelectedOrder({ ...selectedOrder, customers: newCustomers });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    setActionLoading(true);
    try {
      await onConfirmPayment(orderId);
      toast.success("تم تأكيد تحصيل المبلغ");
    } catch (err) {
      toast.error("فشل تأكيد التحصيل");
    } finally {
      setActionLoading(false);
    }
  };

  const submitRating = async (rating: number, comment: string) => {
    if (!ratingOrder || !driverId) return;
    try {
      await supabase.from('ratings').insert({
        order_id: ratingOrder.id,
        from_id: driverId,
        to_id: ratingOrder.vendor_id,
        rating,
        comment,
        type: 'driver_to_vendor'
      });
    } catch (e) {
      console.error("Failed to submit rating", e);
    } finally {
      setRatingOrder(null);
    }
  };

  // Map Data Preparation
    const availableOrders = useMemo(() => localOrders.filter(o => o.status === 'pending' || o.status === 'searching'), [localOrders]);
  const activeOrders = useMemo(() => localOrders.filter(o => o.status === 'assigned' || o.status === 'pickup_reached' || o.status === 'in_transit' || o.status === 'delivery_reached'), [localOrders]);
  const completedOrders = useMemo(() => localOrders.filter(o => o.status === 'delivered'), [localOrders]);
  const cancelledOrders = useMemo(() => localOrders.filter(o => o.status === 'cancelled'), [localOrders]);

  const vendorMarkers = useMemo(() => 
    activeOrders
      .filter(o => o.vendorCoords?.lat && o.vendorCoords?.lng)
      .map(o => ({ 
        id: `v-${o.id}`, 
        name: o.vendor, 
        lat: o.vendorCoords!.lat, 
        lng: o.vendorCoords!.lng,
        type: 'vendor' as const,
        details: o.status === 'assigned' ? 'بانتظار الاستلام' : 'تم الاستلام'
      })),
  [activeOrders]);

  const orderMarkers = useMemo(() => 
    activeOrders
      .filter(o => o.customerCoords?.lat && o.customerCoords?.lng)
      .map(o => ({
        id: `c-${o.id}`,
        name: o.customer,
        lat: o.customerCoords!.lat,
        lng: o.customerCoords!.lng,
        type: 'order' as const,
        status: o.status,
        details: o.address
      })),
  [activeOrders]);

  const mapCenter = useMemo(() => 
    driverLocation ? [driverLocation.lat, driverLocation.lng] as [number, number] : [30.1450, 31.6350] as [number, number],
  [driverLocation]);

  // 2. Routing Logic: Determine the next target for the driver
  const navigationTarget = useMemo(() => {
    if (!isNavigating) return null;
    const firstActive = activeOrders[0];
    if (!firstActive) return null;
    
    // Target is vendor if not picked up, otherwise target is customer
    if (firstActive.status === 'assigned' && firstActive.vendorCoords) {
      return { lat: firstActive.vendorCoords.lat, lng: firstActive.vendorCoords.lng };
    } else if (firstActive.status === 'in_transit' && firstActive.customerCoords) {
      return { lat: firstActive.customerCoords.lat, lng: firstActive.customerCoords.lng };
    }
    return null;
  }, [activeOrders, isNavigating]);

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* 1. Full Screen Map Background */}
      <div className="absolute inset-0 z-0">
        {isActive && driverLocation && !isNaN(driverLocation.lat) && !isNaN(driverLocation.lng) ? (
          <LiveMap
            drivers={[{ 
              id: driverId || "me", 
              name: "أنا", 
              lat: driverLocation.lat,
              lng: driverLocation.lng,
              isOnline: true,
              status: activeOrders.length > 0 ? 'busy' : 'available'
            }]}
            vendors={vendorMarkers.filter(v => !isNaN(v.lat) && !isNaN(v.lng))}
            orders={orderMarkers.filter(o => !isNaN(o.lat) && !isNaN(o.lng))}
            center={mapCenter}
            zoom={16}
            className="h-full w-full"
            driverMode={true}
            isNavigating={isNavigating}
            navigationTarget={navigationTarget && !isNaN(navigationTarget.lat) && !isNaN(navigationTarget.lng) ? navigationTarget : null}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 p-8 text-center">
            <MapIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-black text-sm mb-2">الخريطة متوقفة</p>
            <p className="text-[10px] font-bold max-w-[200px]">قم بتفعيل الحالة (Online) لتشغيل التتبع والملاحة الاحترافية</p>
          </div>
        )}
      </div>

      {/* 2. Navigation Mode Overlay - REMOVED AS PER USER REQUEST */}

      {/* 3. Dynamic Orders Panel (Bottom Sheet) */}
      <motion.div 
        initial={false}
        animate={{ 
          height: mapMode ? (isPanelExpanded ? "85%" : (activeOrders.length > 0 ? "320px" : "180px")) : "85%"
        }}
        className="absolute bottom-0 left-0 right-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl rounded-t-[48px] shadow-[0_-20px_80px_rgba(0,0,0,0.15)] dark:shadow-none border-t border-white/40 dark:border-slate-800/50 flex flex-col transition-all duration-500"
      >
        {/* Map Mode Toggle Button - Floating above panel */}
        <div className="absolute top-[-85px] right-6 z-30">
          <motion.button
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleMapMode}
            className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl backdrop-blur-2xl border-2 transition-all duration-500 ${
              mapMode 
              ? "bg-blue-600 text-white border-blue-400/50 shadow-blue-500/40" 
              : "bg-white/95 dark:bg-slate-900/95 text-slate-500 border-white dark:border-slate-800 shadow-slate-200/50 dark:shadow-none"
            }`}
          >
            {mapMode ? <Maximize2 className="w-7 h-7" /> : <MapIcon className="w-7 h-7" />}
          </motion.button>
        </div>

        {/* Panel Handle & Tabs */}
        <div className="w-full flex flex-col items-center pt-4 shrink-0">
          <motion.button 
            whileHover={{ scaleX: 1.2 }}
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mb-6 transition-all"
          />
          
          {/* Order Tabs - PREMIUM VERSION */}
          <div className="flex w-full px-6 gap-3 mb-6">
            <TabButton 
              active={activeOrderTab === "active"} 
              onClick={() => { setActiveOrderTab("active"); setIsPanelExpanded(activeOrderTab !== "active" ? true : !isPanelExpanded); }}
              icon={<Zap className={`w-4 h-4 ${activeOrderTab === "active" ? "animate-pulse" : ""}`} />}
              label="النشطة"
              count={activeOrders.length}
              color="blue"
            />
            <TabButton 
              active={activeOrderTab === "available"} 
              onClick={() => { setActiveOrderTab("available"); setIsPanelExpanded(true); }}
              icon={<Maximize2 className="w-4 h-4" />}
              label="المتاحة"
              count={availableOrders.length}
              color="amber"
            />
            <TabButton 
              active={activeOrderTab === "completed"} 
              onClick={() => { setActiveOrderTab("completed"); setIsPanelExpanded(true); }}
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="مكتمل"
              count={completedOrders.length}
              color="emerald"
            />
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-10">
          {isActive ? (
            <div className="space-y-4 pt-2">
              <AnimatePresence mode="wait">
                {activeOrderTab === "active" && (
                  <motion.div key="active-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {/* V19.3.0: AI Route Optimization */}
                    {activeOrders.length >= 2 && (
                      <div className="mb-4">
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={handleOptimizeRoute}
                          disabled={aiRouteLoading}
                          className="w-full p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                              <Sparkles className="w-5 h-5 text-white animate-pulse" />
                            </div>
                            <div className="text-right">
                              <h4 className="text-[13px] font-black text-indigo-900 dark:text-indigo-100">ترتيب المسار الذكي</h4>
                              <p className="text-[10px] font-bold text-indigo-600/70">توفير الوقت والوقود بالذكاء الاصطناعي</p>
                            </div>
                          </div>
                          {aiRouteLoading ? (
                            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                          ) : (
                            <ChevronDown className={`w-5 h-5 text-indigo-600 transition-transform ${aiRouteResult ? 'rotate-180' : ''}`} />
                          )}
                        </motion.button>
                        
                        <AnimatePresence>
                          {aiRouteResult && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 p-4 bg-white dark:bg-slate-800 rounded-3xl border border-indigo-50 dark:border-indigo-900/50 shadow-sm"
                            >
                              <div className="flex gap-3">
                                <Bot className="w-5 h-5 text-indigo-600 shrink-0" />
                                <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {aiRouteResult}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {activeOrders.length > 0 ? (
                      activeOrders.map((order) => (
                        <DriverOrderItem
                          key={order.id}
                          order={order}
                          type="active"
                          actionLoading={actionLoading}
                          isNavigating={isNavigating}
                          onToggleNavigation={() => setIsNavigating(!isNavigating)}
                          onSelectOrder={setSelectedOrder}
                          onPickup={handlePickup}
                        />
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <Activity className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400">لا توجد طلبات نشطة حالياً</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeOrderTab === "available" && (
                  <motion.div key="available-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {availableOrders.length > 0 ? (
                      availableOrders.map((order) => (
                        <DriverOrderItem
                          key={order.id}
                          order={order}
                          type="available"
                          actionLoading={actionLoading}
                          onAccept={handleAccept}
                          onSelectOrder={setSelectedOrder}
                        />
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <Zap className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400">لا توجد طلبات متاحة الآن</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeOrderTab === "completed" && (
                  <motion.div key="completed-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {completedOrders.length > 0 ? (
                      completedOrders.map((order) => (
                        <DriverOrderItem
                          key={order.id}
                          order={order}
                          type="completed"
                          actionLoading={false}
                          onSelectOrder={setSelectedOrder}
                        />
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400">لا توجد طلبات مكتملة اليوم</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeOrderTab === "cancelled" && (
                  <motion.div key="cancelled-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {cancelledOrders.length > 0 ? (
                      cancelledOrders.map((order) => (
                        <DriverOrderItem
                          key={order.id}
                          order={order}
                          type="cancelled"
                          actionLoading={false}
                          onSelectOrder={setSelectedOrder}
                        />
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <XCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400">لا توجد طلبات ملغاة اليوم</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-10">
              <Power className="w-10 h-10 text-rose-500/20 mx-auto mb-3" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">أنت في وضع عدم الاتصال</p>
              <p className="text-[10px] text-slate-300 font-bold mt-1">قم بتفعيل الحالة من الأعلى لبدء استقبال الطلبات</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* 4. Modals */}
      <OrderDetailsModal
        order={selectedOrder}
        show={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAccept={handleAccept}
        onPickup={handlePickup}
        onDeliver={handleDeliver}
        onConfirmPayment={handleConfirmPayment}
        onDeliverCustomer={handleDeliverCustomer}
        onPreviewImage={onPreviewImage}
        onNavigate={() => {
          setIsNavigating(true);
          setIsPanelExpanded(false);
        }}
        isActive={isActive}
        loading={actionLoading}
      />

      <RatingModal
        isOpen={!!ratingOrder}
        onClose={() => setRatingOrder(null)}
        onSubmit={submitRating}
        title="تقييم المتجر"
        subtitle="كيف كانت تجربتك مع هذا المتجر في هذا الطلب؟"
        targetName={ratingOrder?.vendor || "المتجر"}
      />

      {/* V19.3.0: Success Celebration */}
      <SuccessCelebration 
        show={showCelebration} 
        message="تم التوصيل بنجاح! 🎉" 
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
});

export default DriverOrdersView;