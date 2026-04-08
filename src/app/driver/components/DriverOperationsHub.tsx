"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListFilter, History, Search, Zap, Activity, Truck } from "lucide-react";
import DriverOrdersView from "./DriverOrdersView";
import DriverHistoryView from "./DriverHistoryView";
import type { Order, DBDriverOrder } from "../types";

interface DriverOperationsHubProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  isActive: boolean;
  driverLocation: { lat: number; lng: number } | null;
  driverId: string | null;
  orders: Order[];
  todayHistory: DBDriverOrder[];
  autoAccept: boolean;
  onToggleAutoAccept: () => void;
  onAcceptOrder: (orderId: string) => void;
  onPickupOrder: (orderId: string) => void;
  onDeliverOrder: (orderId: string) => void;
  onDeliverCustomer?: (orderId: string, customerIndex: number) => void;
  onPreviewImage?: (url: string) => void;
}

export default function DriverOperationsHub({
  todayDeliveryFees,
  vendorDebt,
  isActive,
  driverLocation,
  driverId,
  orders,
  todayHistory,
  autoAccept,
  onToggleAutoAccept,
  onAcceptOrder,
  onPickupOrder,
  onDeliverOrder,
  onDeliverCustomer,
  onPreviewImage
}: DriverOperationsHubProps) {
  const [viewMode, setViewMode] = useState<"orders" | "history">("orders");

  const activeOrdersCount = orders.filter(o => o.status === "assigned" || o.status === "in_transit").length;

  return (
    <div className="space-y-6">
      {/* View Switcher */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex p-1 bg-white/60 backdrop-blur-md border border-slate-200 rounded-2xl w-fit shadow-sm">
          <button
            onClick={() => setViewMode("orders")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              viewMode === "orders"
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Truck className="w-4 h-4" />
            المهام والطلبات
            {activeOrdersCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-lg text-[9px] ${viewMode === "orders" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
                {activeOrdersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              viewMode === "history"
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="w-4 h-4" />
            سجل اليوم
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${isActive ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
            <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? "text-emerald-600" : "text-slate-400"}`}>
              {isActive ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {viewMode === "orders" ? (
            <DriverOrdersView
              todayDeliveryFees={todayDeliveryFees}
              vendorDebt={vendorDebt}
              isActive={isActive}
              driverLocation={driverLocation}
              driverId={driverId}
              orders={orders}
              autoAccept={autoAccept}
              onToggleAutoAccept={onToggleAutoAccept}
              onAcceptOrder={onAcceptOrder}
              onPickupOrder={onPickupOrder}
              onDeliverOrder={onDeliverOrder}
              onDeliverCustomer={onDeliverCustomer}
              onPreviewImage={onPreviewImage}
            />
          ) : (
            <DriverHistoryView 
              history={todayHistory} 
              onPreviewImage={onPreviewImage}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
