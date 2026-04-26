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
      <div className="flex items-center justify-between gap-4 px-2">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex p-1.5 bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-200/50 dark:border-slate-800/50 rounded-[28px] w-fit shadow-2xl shadow-slate-200/20 dark:shadow-none"
        >
          <div
            className="flex items-center gap-3 px-6 py-3 rounded-[24px] text-xs font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/20 dark:shadow-none transition-all"
          >
            <div className="p-1.5 bg-white/10 dark:bg-slate-900/10 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
            <span className="tracking-tight uppercase">المهام والطلبات</span>
            {activeOrdersCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] bg-blue-500 text-white font-black ring-4 ring-slate-900 dark:ring-white/20"
              >
                {activeOrdersCount}
              </motion.span>
            )}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="hidden md:flex items-center gap-3"
        >
          <div className={`flex items-center gap-3 px-6 py-3 rounded-[28px] border transition-all duration-500 backdrop-blur-2xl ${
            isActive 
            ? "bg-emerald-500/10 dark:bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/10" 
            : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "bg-slate-300 dark:bg-slate-700"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
              {isActive ? "System Online" : "System Offline"}
            </span>
          </div>
        </motion.div>
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
