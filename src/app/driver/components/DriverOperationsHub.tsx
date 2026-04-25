"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Activity, Truck } from "lucide-react";
import DriverOrdersView from "./DriverOrdersView";
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
  onPickupOrder: (orderId: string) => Promise<void>;
  onDeliverOrder: (orderId: string) => Promise<void>;
  onConfirmPayment: (orderId: string) => Promise<void>;
  onDeliverCustomer?: (orderId: string, customerIndex: number) => Promise<void>;
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
  onConfirmPayment,
  onDeliverCustomer,
  onPreviewImage
}: DriverOperationsHubProps) {
  const activeOrdersCount = orders.filter(o => o.status === "assigned" || o.status === "in_transit").length;

  return (
    <div className="space-y-6">
      {/* View Switcher - SIMPLIFIED (NO HISTORY) */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex p-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl w-fit shadow-sm">
          <div
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-slate-900 dark:bg-slate-800 text-white shadow-lg shadow-slate-200 dark:shadow-none"
          >
            <Truck className="w-4 h-4" />
            المهام والطلبات
            {activeOrdersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-lg text-[9px] bg-white/20 text-white">
                {activeOrdersCount}
              </span>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${isActive ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30" : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-700"}`} />
            <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
              {isActive ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="orders-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
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
            onConfirmPayment={onConfirmPayment}
            onDeliverCustomer={onDeliverCustomer}
            onPreviewImage={onPreviewImage}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
