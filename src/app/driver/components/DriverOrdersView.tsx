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
  XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Order } from "../types";
import OrderDetailsModal from "./OrderDetailsModal";
import RatingModal from "@/components/RatingModal";
import DriverOrderItem from "./DriverOrderItem";
import { supabase } from "@/lib/supabaseClient";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-slate-400 font-bold">
      جاري تحميل الخريطة الاحترافية...
    </div>
  ),
});

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
      await onAcceptOrder(orderId);
      setSelectedOrder(null);
    } catch (err) {
      setLocalOrders(orders); // Rollback
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
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
      
      await onPickupOrder(orderId);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'in_transit' } : null);
      }
    } catch (err) {
      setLocalOrders(previousOrders); // Rollback
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
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { Haptics, NotificationType } = await import("@capacitor/haptics");
        Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      }
      
      await onDeliverOrder(orderId);
      setRatingOrder(selectedOrder);
      setSelectedOrder(null);
      setIsNavigating(false);
    } catch (err) {
      setLocalOrders(previousOrders); // Rollback
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverCustomer = async (orderId: string, customerIndex: number) => {
    if (!onDeliverCustomer) return;
    setActionLoading(true);
    try {
      await onDeliverCustomer(orderId, customerIndex);
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
  const availableOrders = useMemo(() => localOrders.filter(o => o.status === 'pending'), [localOrders]);
  const activeOrders = useMemo(() => localOrders.filter(o => o.status === 'assigned' || o.status === 'in_transit'), [localOrders]);
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
          height: mapMode ? (isPanelExpanded ? "85%" : (activeOrders.length > 0 ? "240px" : "120px")) : "85%"
        }}
        className="absolute bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-slate-100 dark:border-slate-800 flex flex-col"
      >
        {/* Map Mode Toggle Button - Floating above panel */}
        <div className="absolute top-[-70px] right-6 z-30">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onToggleMapMode}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-xl border transition-all ${
              mapMode 
              ? "bg-blue-600 text-white border-blue-400 shadow-blue-500/20" 
              : "bg-white/90 dark:bg-slate-900/90 text-slate-500 border-white/20 dark:border-slate-800"
            }`}
          >
            {mapMode ? <Maximize2 className="w-6 h-6" /> : <MapIcon className="w-6 h-6" />}
          </motion.button>
        </div>

        {/* Panel Handle & Tabs */}
        <div className="w-full flex flex-col items-center pt-3 shrink-0">
          <button 
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-3"
          />
          
          {/* Order Tabs - COMPACT VERSION */}
          <div className="flex w-full px-6 gap-2 mb-4">
            <button 
              onClick={() => { setActiveOrderTab("active"); setIsPanelExpanded(activeOrderTab !== "active" ? true : !isPanelExpanded); }}
              className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${
                activeOrderTab === "active" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              النشطة ({activeOrders.length})
            </button>
            <button 
              onClick={() => { setActiveOrderTab("available"); setIsPanelExpanded(true); }}
              className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${
                activeOrderTab === "available" ? "bg-amber-500 text-white shadow-lg shadow-amber-100" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              المتاحة ({availableOrders.length})
            </button>
            <button 
              onClick={() => { setActiveOrderTab("completed"); setIsPanelExpanded(true); }}
              className={`flex-1 py-2.5 rounded-2xl text-[9px] font-black transition-all flex items-center justify-center gap-1 ${
                activeOrderTab === "completed" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              مكتمل ({completedOrders.length})
            </button>
            <button 
              onClick={() => { setActiveOrderTab("cancelled"); setIsPanelExpanded(true); }}
              className={`flex-1 py-2.5 rounded-2xl text-[9px] font-black transition-all flex items-center justify-center gap-1 ${
                activeOrderTab === "cancelled" ? "bg-red-600 text-white shadow-lg shadow-red-100" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}
            >
              <XCircle className="w-3 h-3" />
              ملغي ({cancelledOrders.length})
            </button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {isActive ? (
            <div className="space-y-4 pt-2">
              <AnimatePresence mode="wait">
                {activeOrderTab === "active" && (
                  <motion.div key="active-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
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
    </div>
  );
});

export default DriverOrdersView;