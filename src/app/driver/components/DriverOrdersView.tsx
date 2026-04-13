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
  const activeOrders = useMemo(() => 
    orders.filter(o => o.status === "assigned" || o.status === "in_transit"),
  [orders]);

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

  return (
    <div className="fixed inset-0 top-[76px] z-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* 1. Full Screen Map Background */}
      <div className="absolute inset-0 z-0">
        {isActive && driverLocation ? (
          <LiveMap
            drivers={[{ id: driverId || "me", name: "أنا", ...driverLocation, isOnline: true }]}
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

      {/* 2. Floating Quick Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleAutoAccept}
          className={`p-4 rounded-[24px] shadow-2xl backdrop-blur-xl border transition-all flex items-center gap-3 ${
            autoAccept 
            ? "bg-emerald-500 text-white border-emerald-400" 
            : "bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-white/20 dark:border-slate-700"
          }`}
        >
          <Zap className={`w-5 h-5 ${autoAccept ? "animate-pulse" : ""}`} />
          <div className="text-right">
            <p className="text-[10px] font-black leading-none">القبول التلقائي</p>
            <p className="text-[8px] font-bold opacity-70 mt-0.5">{autoAccept ? "مفعّل" : "معطّل"}</p>
          </div>
        </motion.button>

        <motion.div 
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-3 rounded-[24px] shadow-2xl border border-white/20 dark:border-slate-700 flex flex-col items-center gap-3"
        >
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">الأرباح</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{todayDeliveryFees}</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-100 dark:bg-slate-700" />
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">المديونية</span>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400">{vendorDebt}</span>
          </div>
        </motion.div>
      </div>

      {/* 3. Dynamic Orders Panel (Bottom) */}
      <motion.div 
        initial={false}
        animate={{ 
          height: isPanelExpanded ? "85%" : (activeOrders.length > 0 ? "240px" : "100px")
        }}
        className="absolute bottom-0 left-0 right-0 z-20 bg-white dark:bg-slate-900 rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-slate-100 dark:border-slate-800 flex flex-col"
      >
        {/* Panel Handle */}
        <button 
          onClick={() => setIsPanelExpanded(!isPanelExpanded)}
          className="w-full flex flex-col items-center pt-3 pb-2"
        >
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-2" />
          <div className="flex items-center gap-2 px-6 w-full justify-between">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${isActive ? "text-emerald-500 animate-pulse" : "text-slate-300"}`} />
              <h2 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                {activeOrders.length > 0 ? `لديك ${activeOrders.length} مهام نشطة` : "قائمة المهام"}
              </h2>
            </div>
            {isPanelExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {isActive ? (
            <div className="space-y-4 pt-2">
              {activeOrders.length > 0 ? (
                activeOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layoutId={order.id}
                    className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700/50 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          order.status === 'in_transit' ? "bg-indigo-500" : "bg-sky-500"
                        }`}>
                          {order.status === 'in_transit' ? <Truck className="text-white w-6 h-6" /> : <Store className="text-white w-6 h-6" />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{order.vendor}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {order.status === 'assigned' ? 'بانتظار الاستلام' : 'جاري التوصيل للعميل'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{order.fee}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">أجرة التوصيل</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">{order.address}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg"
                      >
                        إدارة الطلب
                      </button>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="p-4 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-600 active:scale-95 transition-all shadow-sm"
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                  </div>
                  <p className="text-xs text-slate-400 font-bold">لا توجد مهام نشطة حالياً</p>
                  <p className="text-[9px] text-slate-300 mt-1">الطلبات المتاحة ستظهر هنا فور قبولها</p>
                </div>
              )}

              {/* Quick View Available Button */}
              {activeOrders.length === 0 && orders.filter(o => o.status === 'pending').length > 0 && (
                <button 
                  onClick={() => setIsPanelExpanded(true)}
                  className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 font-black text-xs animate-pulse"
                >
                  يوجد {orders.filter(o => o.status === 'pending').length} طلبات متاحة حالياً
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <Power className="w-10 h-10 text-rose-500/20 mx-auto mb-3" />
              <p className="text-xs font-black text-slate-400">أنت في وضع عدم الاتصال</p>
              <p className="text-[9px] text-slate-300 mt-1">قم بتفعيل الحالة من الأعلى لبدء العمل</p>
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
