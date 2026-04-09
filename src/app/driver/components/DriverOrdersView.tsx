"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Store, TrendingUp, TrendingDown, Truck, Clock, MapPin, Power, ListChecks, Phone, Eye } from "lucide-react";
import { PremiumCard } from "@/components/PremiumCard";
import { motion, AnimatePresence } from "framer-motion";
import type { Order } from "../types";
import OrderDetailsModal from "./OrderDetailsModal";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-44 w-full bg-slate-100/50 animate-pulse rounded-[32px] flex items-center justify-center text-slate-400 font-bold border border-slate-100/50 backdrop-blur-sm">
      جاري تحميل الخريطة...
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
  onDeliverCustomer?: (orderId: string, customerIndex: number) => Promise<void>;
  onPreviewImage?: (url: string) => void;
}

const statusConfig: Record<string, { label: string; dotColor: string; bg: string; text: string }> = {
  pending:    { label: "بانتظار القبول", dotColor: "bg-amber-400",  bg: "bg-amber-50 border-amber-100",  text: "text-amber-700" },
  assigned:   { label: "تم القبول",       dotColor: "bg-sky-500",   bg: "bg-sky-50 border-sky-100",     text: "text-sky-700"   },
  in_transit: { label: "في الطريق",       dotColor: "bg-indigo-500",bg: "bg-indigo-50 border-indigo-100",text: "text-indigo-700"},
  delivered:  { label: "تم التوصيل",      dotColor: "bg-emerald-500",bg:"bg-emerald-50 border-emerald-100",text:"text-emerald-700"},
};

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
  onDeliverCustomer,
  onPreviewImage,
}: DriverOrdersViewProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<"available" | "active" | "completed">("available");

  const handleAccept = async (orderId: string) => {
    setActionLoading(true);
    await onAcceptOrder(orderId);
    setActionLoading(false);
    setSelectedOrder((prev) => prev ? { ...prev, status: "assigned" } : null);
  };

  const handlePickup = async (orderId: string) => {
    setActionLoading(true);
    await onPickupOrder(orderId);
    setActionLoading(false);
    setSelectedOrder((prev) => prev ? { ...prev, status: "in_transit", isPickedUp: true } : null);
  };

  const handleDeliver = async (orderId: string) => {
    setActionLoading(true);
    await onDeliverOrder(orderId);
    setActionLoading(false);
    setSelectedOrder(null);
  };

  const filteredOrders = orders.filter(o => {
    // If not active, hide available orders
    if (!isActive && o.status === "pending") return false;
    
    if (filterTab === "available") return o.status === "pending";
    if (filterTab === "active") return o.status === "assigned" || o.status === "in_transit";
    if (filterTab === "completed") return o.status === "delivered";
    return true;
  }).sort((a, b) => a.priority - b.priority);

  const vendorMarkersForMap = filteredOrders
    .filter(o => (o.status === "assigned" || o.status === "in_transit") && o.vendorCoords?.lat && o.vendorCoords?.lng)
    .map(o => ({ id: o.vendorId || o.id, name: o.vendor, lat: o.vendorCoords!.lat, lng: o.vendorCoords!.lng }));

  return (
    <>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <PremiumCard
            title="أرباح اليوم"
            value={todayDeliveryFees}
            icon={<div className="bg-green-500/10 p-2 rounded-xl"><TrendingUp className="text-green-500 w-5 h-5" /></div>}
            subtitle="ج.م"
            delay={0.1}
          />
          <PremiumCard
            title="مديونية المحلات"
            value={vendorDebt}
            icon={<div className="bg-orange-500/10 p-2 rounded-xl"><TrendingDown className="text-orange-500 w-5 h-5" /></div>}
            subtitle="ج.م"
            delay={0.2}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          {[
            { id: "available", label: "متاحة", count: orders.filter(o => o.status === "pending").length },
            { id: "active", label: "نشطة", count: orders.filter(o => o.status === "assigned" || o.status === "in_transit").length },
            { id: "completed", label: "مكتملة", count: orders.filter(o => o.status === "delivered").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black transition-all whitespace-nowrap px-4 ${
                filterTab === tab.id
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-lg text-[9px] ${filterTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Live Map or Inactive Warning */}
        <section>
          <AnimatePresence mode="wait">
            {isActive && driverLocation ? (
              <motion.div
                key="map"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="relative"
              >
                <LiveMap
                  drivers={[{ id: driverId || "me", name: "موقعي", ...driverLocation }]}
                  vendors={vendorMarkersForMap}
                  center={[driverLocation.lat, driverLocation.lng]}
                  zoom={15}
                  className="h-44 w-full rounded-[32px] overflow-hidden shadow-sm border border-slate-100/50"
                />
                <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">تتبع مباشر</span>
                </div>
              </motion.div>
            ) : isActive && !driverLocation ? (
              <motion.div
                key="gps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-sky-50/60 border border-sky-100 p-5 rounded-[28px] flex items-center gap-4"
              >
                <MapPin className="w-6 h-6 text-sky-500 flex-shrink-0 animate-bounce" />
                <div>
                  <p className="text-sm font-black text-sky-700">جاري تحديد الموقع...</p>
                  <p className="text-[10px] text-sky-500 font-bold">تأكد من تفعيل GPS</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="inactive"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-amber-50/50 border border-amber-100/50 p-6 rounded-[32px] text-center backdrop-blur-sm"
              >
                <Power className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-amber-600">قم بتفعيل الحالة لاستقبال الطلبات وتتبع موقعك</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Orders List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-sky-500" />
              الطلبات الحالية
            </h2>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              {filteredOrders.length} طلب
            </span>
          </div>

          {/* Auto-Accept Toggle */}
          {filterTab === "available" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between px-5 py-4 rounded-[24px] border transition-all ${
                autoAccept
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-white border-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  autoAccept ? "bg-emerald-500" : "bg-slate-100"
                }`}>
                  <Truck className={`w-4 h-4 ${autoAccept ? "text-white" : "text-slate-400"}`} />
                </div>
                <div>
                  <p className={`text-[11px] font-black ${autoAccept ? "text-emerald-800" : "text-slate-700"}`}>
                    القبول التلقائي
                  </p>
                  <p className={`text-[9px] font-bold ${autoAccept ? "text-emerald-500" : "text-slate-400"}`}>
                    {autoAccept ? "مفعّل — يُقبل أول طلب تلقائياً" : "معطّل — قبول يدوي فقط"}
                  </p>
                </div>
              </div>
              <button
                onClick={onToggleAutoAccept}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                  autoAccept ? "bg-emerald-500" : "bg-slate-200"
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 700, damping: 30 }}
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md ${
                    autoAccept ? "right-0.5" : "left-0.5"
                  }`}
                />
              </button>
            </motion.div>
          )}

          {filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/60 p-12 rounded-[40px] shadow-sm text-center border border-slate-100/50 backdrop-blur-sm"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Truck className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-sm text-slate-400 font-bold">لا توجد طلبات {filterTab === "available" ? "متاحة" : filterTab === "active" ? "نشطة" : "مكتملة"} حالياً</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => {
                const sc = statusConfig[order.status] ?? statusConfig.pending;
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    {/* Priority indicator */}
                    <div className={`absolute top-0 right-0 w-1 h-full rounded-l-full ${
                      order.status === "pending" ? "bg-amber-400" :
                      order.status === "assigned" ? "bg-sky-500" :
                      "bg-indigo-500"
                    }`} />

                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-sky-50 transition-colors shrink-0">
                          <Store className="w-6 h-6 text-slate-400 group-hover:text-sky-500 transition-colors" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-black text-slate-900 text-sm truncate">{order.vendor}</h3>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">#{order.id.slice(0, 8)}</p>
                          {order.vendorPhone && (
                            <a href={`tel:${order.vendorPhone}`} className="flex items-center gap-1 text-[10px] font-black text-sky-600 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {order.vendorPhone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-left bg-green-50 px-3 py-2 rounded-2xl border border-green-100 shrink-0">
                        <p className="text-xs font-black text-green-600">{order.fee}</p>
                        <p className="text-[8px] font-bold text-green-500/60 uppercase">عمولة</p>
                      </div>
                    </div>

                    {/* Customers Quick Info */}
                    {order.customers && order.customers.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {order.customers.slice(0, 2).map((c, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="w-4 h-4 bg-slate-900 text-white text-[8px] font-black flex items-center justify-center rounded-full shrink-0">{i + 1}</span>
                              <div className="overflow-hidden">
                                <p className="text-[10px] font-black text-slate-800 truncate">{c.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 truncate flex items-center gap-1">
                                  <MapPin className="w-2 h-2 text-red-400" />
                                  {c.address}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {c.invoice_url && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPreviewImage?.(c.invoice_url!);
                                  }}
                                  className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-orange-500 shadow-sm active:scale-90 transition-all overflow-hidden relative group/inv"
                                >
                                  <img src={c.invoice_url} className="w-full h-full object-cover" alt="Inv" />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/inv:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye size={8} className="text-white" />
                                  </div>
                                </button>
                              )}
                              <a href={`tel:${c.phone}`} className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-sky-500 shadow-sm active:scale-90 transition-all">
                                <Phone size={12} />
                              </a>
                            </div>
                          </div>
                        ))}
                        {order.customers.length > 2 && (
                          <p className="text-[9px] text-center font-bold text-slate-400">+ {order.customers.length - 2} عملاء آخرين (اضغط للتفاصيل)</p>
                        )}
                      </div>
                    )}

                    {/* Status & Info */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border mb-4 ${sc.bg}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${sc.dotColor} animate-pulse`} />
                      <span className={`text-[10px] font-black ${sc.text}`}>{sc.label}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-[9px] font-bold text-slate-400">المسافة</p>
                          <p className="text-[10px] font-black text-slate-700">{order.distance}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                        <div>
                          <p className="text-[9px] font-bold text-slate-400">التجهيز</p>
                          <p className="text-[10px] font-black text-slate-700">{order.prepTime || "15"} دقيقة</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <motion.button
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-black text-xs shadow-lg shadow-slate-200 transition-all active:scale-95"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedOrder(order)}
                      >
                        التفاصيل
                      </motion.button>
                      {order.status === "pending" && (
                        <motion.button
                          className="bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 px-5 rounded-2xl font-black text-xs shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                          whileTap={{ scale: 0.97 }}
                          disabled={actionLoading || !isActive}
                          onClick={() => handleAccept(order.id)}
                        >
                          ✓ قبول
                        </motion.button>
                      )}
                      {order.status === "assigned" && (
                        <motion.button
                          className="bg-sky-500 hover:bg-sky-600 text-white py-3.5 px-3 rounded-2xl font-black text-[10px] shadow-lg shadow-sky-100 transition-all active:scale-95 disabled:opacity-50"
                          whileTap={{ scale: 0.97 }}
                          disabled={actionLoading}
                          onClick={() => handlePickup(order.id)}
                        >
                          استلمت
                        </motion.button>
                      )}
                      {order.status === "in_transit" && (
                        <motion.button
                          className="bg-indigo-500 hover:bg-indigo-600 text-white py-3.5 px-3 rounded-2xl font-black text-[10px] shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                          whileTap={{ scale: 0.97 }}
                          disabled={actionLoading}
                          onClick={() => handleDeliver(order.id)}
                        >
                          وصّلت
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAccept={handleAccept}
          onPickup={handlePickup}
          onDeliver={handleDeliver}
          onDeliverCustomer={onDeliverCustomer}
          onPreviewImage={onPreviewImage}
          isActive={isActive}
          loading={actionLoading}
        />
      )}
    </>
  );
}
