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
  Maximize2
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

  // 1. Action Handlers
  const handleAccept = async (orderId: string) => {
    setActionLoading(true);
    try {
      await onAcceptOrder(orderId);
      setSelectedOrder(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickup = async (orderId: string) => {
    setActionLoading(true);
    try {
      await onPickupOrder(orderId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async (orderId: string) => {
    setActionLoading(true);
    try {
      await onDeliverOrder(orderId);
      setRatingOrder(selectedOrder);
      setSelectedOrder(null);
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
  const availableOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders]);
  const activeOrders = useMemo(() => orders.filter(o => o.status === 'assigned' || o.status === 'in_transit'), [orders]);
  const completedOrders = useMemo(() => orders.filter(o => o.status === 'delivered'), [orders]);

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
    const firstActive = activeOrders[0];
    if (!firstActive) return null;
    
    // Target is vendor if not picked up, otherwise target is customer
    if (firstActive.status === 'assigned' && firstActive.vendorCoords) {
      return { lat: firstActive.vendorCoords.lat, lng: firstActive.vendorCoords.lng };
    } else if (firstActive.status === 'in_transit' && firstActive.customerCoords) {
      return { lat: firstActive.customerCoords.lat, lng: firstActive.customerCoords.lng };
    }
    return null;
  }, [activeOrders]);

  return (
    <div className="fixed inset-0 top-[76px] z-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* 1. Full Screen Map Background */}
      <div className="absolute inset-0 z-0">
        {isActive && driverLocation ? (
          <LiveMap
            drivers={[{ 
              id: driverId || "me", 
              name: "أنا", 
              ...driverLocation, 
              isOnline: true,
              targetLat: navigationTarget?.lat,
              targetLng: navigationTarget?.lng,
              status: activeOrders.length > 0 ? 'busy' : 'available'
            }]}
            vendors={vendorMarkers}
            orders={orderMarkers}
            center={mapCenter}
            zoom={16}
            className="h-full w-full"
            autoCenterOnDrivers={true}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 p-8 text-center">
            <MapIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-black text-sm mb-2">الخريطة متوقفة</p>
            <p className="text-[10px] font-bold max-w-[200px]">قم بتفعيل الحالة (Online) لتشغيل التتبع والملاحة الاحترافية</p>
          </div>
        )}
      </div>

      {/* 2. Floating Quick Controls (Top Right) - REMOVED AS PER USER REQUEST */}
      {/* 3. Dynamic Orders Panel (Bottom) */}
      <motion.div 
        initial={false}
        animate={{ 
          height: isPanelExpanded ? "85%" : (activeOrders.length > 0 ? "280px" : "100px")
        }}
        className="absolute bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-slate-100 dark:border-slate-800 flex flex-col"
      >
        {/* Panel Handle & Tabs */}
        <div className="w-full flex flex-col items-center pt-3 shrink-0">
          <button 
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-4"
          />
          
          {/* Order Tabs */}
          <div className="flex w-full px-6 gap-2 mb-4">
            <button 
              onClick={() => { setActiveOrderTab("active"); setIsPanelExpanded(true); }}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${
                activeOrderTab === "active" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-100 text-slate-400"
              }`}
            >
              النشطة ({activeOrders.length})
            </button>
            <button 
              onClick={() => { setActiveOrderTab("available"); setIsPanelExpanded(true); }}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${
                activeOrderTab === "available" ? "bg-amber-500 text-white shadow-lg shadow-amber-100" : "bg-slate-100 text-slate-400"
              }`}
            >
              المتاحة ({availableOrders.length})
            </button>
            <button 
              onClick={() => { setActiveOrderTab("history"); setIsPanelExpanded(true); }}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${
                activeOrderTab === "history" ? "bg-slate-800 text-white shadow-lg shadow-slate-200" : "bg-slate-100 text-slate-400"
              }`}
            >
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
                            <div className="text-right">
                              <p className="text-xs font-black text-emerald-600">{order.fee}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-3 rounded-xl font-black text-[11px]"
                            >
                              إدارة الطلب
                            </button>
                            {order.vendorCoords && (
                              <a
                                href={`https://maps.google.com/?q=${order.vendorCoords.lat},${order.vendorCoords.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 bg-white border border-slate-200 text-blue-600 rounded-xl flex items-center justify-center"
                              >
                                <Navigation className="w-5 h-5" />
                              </a>
                            )}
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
                        <div key={order.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 opacity-80">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs font-black">{order.vendor}</p>
                              <p className="text-[9px] text-slate-400 font-bold">{new Date(order.statusUpdatedAt || '').toLocaleTimeString('ar-EG')}</p>
                            </div>
                            <div className="text-emerald-600 font-black text-xs">تم التوصيل</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <Clock className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400">سجل اليوم فارغ</p>
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
        onDeliverCustomer={onDeliverCustomer}
        onPreviewImage={onPreviewImage}
        actionLoading={actionLoading}
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
