"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Order } from "../types";
import OrderDetailsModal from "./OrderDetailsModal";
import RatingModal from "@/components/RatingModal";
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
}

export default function DriverOrdersView({
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
}: DriverOrdersViewProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [activeOrderTab, setActiveOrderTab] = useState<"available" | "active" | "history">("active");
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
        {isActive && driverLocation ? (
          <LiveMap
            drivers={[{ 
              id: driverId || "me", 
              name: "أنا", 
              ...driverLocation, 
              isOnline: true,
              status: activeOrders.length > 0 ? 'busy' : 'available'
            }]}
            vendors={vendorMarkers}
            orders={orderMarkers}
            center={mapCenter}
            zoom={16}
            className="h-full w-full"
            driverMode={true}
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
          height: isPanelExpanded ? "85%" : (activeOrders.length > 0 ? "240px" : "120px")
        }}
        className="absolute bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-slate-100 dark:border-slate-800 flex flex-col"
      >
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
              onClick={() => { setActiveOrderTab("history"); setIsPanelExpanded(true); }}
              className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${
                activeOrderTab === "history" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              المكتملة ({completedOrders.length})
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
                        <motion.div
                          key={order.id}
                          className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-[28px] border border-slate-100 dark:border-slate-700/50"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                order.status === 'in_transit' ? "bg-indigo-500" : "bg-sky-500"
                              }`}>
                                {order.status === 'in_transit' ? <Truck className="text-white w-5 h-5" /> : <Store className="text-white w-5 h-5" />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{order.vendor}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-1">{order.status === 'assigned' ? 'بانتظار الاستلام' : 'جاري التوصيل'}</p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <p className="text-xs font-black text-emerald-600">{order.fee}</p>
                              {order.status !== 'delivered' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsNavigating(!isNavigating);
                                  }}
                                  className={`p-2 rounded-xl border transition-all ${
                                    isNavigating 
                                    ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-100" 
                                    : "bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700"
                                  }`}
                                  title="تفعيل/إلغاء التوجيه على الخريطة"
                                >
                                  <Navigation className={`w-3.5 h-3.5 ${isNavigating ? "animate-pulse" : ""}`} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2 mb-1">
                              <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-xl text-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">قيمة الطلب</p>
                                <p className="text-[10px] font-black text-slate-900 dark:text-white">{(order.customers?.reduce((acc, c) => acc + (Number(c.orderValue) || 0), 0) || 0).toFixed(2)} ج.م</p>
                              </div>
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl text-center">
                                <p className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1">ربحك الصافي</p>
                                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{(order.financials?.driver_earnings || 0).toFixed(2)} ج.م</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-3 rounded-xl font-black text-[11px]"
                              >
                                إدارة الطلب
                              </button>
                              
                              {/* V1.0.9: Quick Action Buttons on Card */}
                              {order.status === 'assigned' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handlePickup(order.id); }}
                                  disabled={actionLoading}
                                  className="flex-1 bg-sky-500 text-white py-3 rounded-xl font-black text-[11px] shadow-lg shadow-sky-100"
                                >
                                  {actionLoading ? "جاري..." : "تأكيد الاستلام"}
                                </button>
                              )}
                              
                              {order.status === 'in_transit' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                                  className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-black text-[11px] shadow-lg shadow-indigo-100"
                                >
                                  إنهاء السكة
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
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
                        <div key={order.id} className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-black text-xs">{order.vendor}</h4>
                            <span className="text-emerald-600 font-black text-xs">{order.fee}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold mb-3 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-400" /> {order.address}
                          </p>
                          <button
                            onClick={() => handleAccept(order.id)}
                            disabled={actionLoading}
                            className="w-full bg-amber-500 text-white py-3 rounded-xl font-black text-[11px] shadow-lg shadow-amber-100"
                          >
                            {actionLoading ? "جاري القبول..." : "قبول الطلب فوراً"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <Zap className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400">لا توجد طلبات متاحة الآن</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeOrderTab === "history" && (
                  <motion.div key="history-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {completedOrders.length > 0 ? (
                      completedOrders.map((order) => (
                        <div key={order.id} className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-[28px] border border-emerald-100 dark:border-emerald-800/30">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-black text-xs text-slate-900 dark:text-white">{order.vendor}</h4>
                            <span className="text-emerald-600 font-black text-[10px] bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">مكتمل</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                            <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.customer}</p>
                            <p className="font-black text-emerald-600">{order.fee}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400">سجل الطلبات المكتملة فارغ</p>
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
}
