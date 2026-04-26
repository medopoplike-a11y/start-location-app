"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { Truck, Store, Navigation, MapPin, Zap, CheckCircle2, XCircle, Bot, AlertCircle } from "lucide-react";
import type { Order } from "../types";

interface DriverOrderItemProps {
  order: Order;
  type: "active" | "available" | "completed" | "cancelled";
  actionLoading: boolean;
  isNavigating?: boolean;
  onToggleNavigation?: () => void;
  onSelectOrder: (order: Order) => void;
  onAccept?: (orderId: string) => void;
  onPickup?: (orderId: string) => void;
}

const DriverOrderItem = ({
  order,
  type,
  actionLoading,
  isNavigating,
  onToggleNavigation,
  onSelectOrder,
  onAccept,
  onPickup
}: DriverOrderItemProps) => {
  // V19.3.0: AI Delay Prediction Logic
  const getAIAlert = () => {
    if (order.status === 'assigned') {
      const assignedTime = new Date(order.assignedAt || order.updatedAt).getTime();
      const diffMins = (Date.now() - assignedTime) / 60000;
      if (diffMins > 10) return { type: 'delay', message: 'تأخر في الاستلام' };
    }
    if (order.status === 'in_transit') {
      const pickupTime = new Date(order.pickedUpAt || order.updatedAt).getTime();
      const diffMins = (Date.now() - pickupTime) / 60000;
      if (diffMins > 20) return { type: 'critical', message: 'تأخر في التوصيل' };
    }
    return null;
  };

  const aiAlert = getAIAlert();

  if (type === "active") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
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
            {order.status !== 'delivered' && onToggleNavigation && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleNavigation();
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

        {aiAlert && (
          <div className={`mb-3 p-2.5 rounded-2xl flex items-center gap-2.5 animate-pulse ${
            aiAlert.type === 'critical' 
              ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-800/30' 
              : 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30'
          }`}>
            <div className={`p-1.5 rounded-lg ${aiAlert.type === 'critical' ? 'bg-red-100 dark:bg-red-800/40' : 'bg-amber-100 dark:bg-amber-800/40'}`}>
              <Bot className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] font-black">{aiAlert.message}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 mb-1">
             <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-xl text-center">
               <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">قيمة الطلب</p>
               <p className="text-[10px] font-black text-slate-900 dark:text-white">{(order.customers?.reduce((acc, c) => acc + (Number(c?.orderValue) || 0), 0) || 0).toFixed(2)} ج.م</p>
             </div>
             <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl text-center">
               <p className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1">ربحك الصافي</p>
               <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{(order.financials?.driver_earnings || 0).toFixed(2)} ج.م</p>
             </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onSelectOrder(order)}
              className="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-3 rounded-xl font-black text-[11px]"
            >
              إدارة الطلب
            </button>
            
            {order.status === 'assigned' && onPickup && (
              <button
                onClick={(e) => { e.stopPropagation(); onPickup(order.id); }}
                disabled={actionLoading}
                className="flex-1 bg-sky-500 text-white py-3 rounded-xl font-black text-[11px] shadow-lg shadow-sky-100"
              >
                {actionLoading ? "جاري..." : "تأكيد الاستلام"}
              </button>
            )}
            
            {order.status === 'in_transit' && (
              <button
                onClick={(e) => { e.stopPropagation(); onSelectOrder(order); }}
                className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-black text-[11px] shadow-lg shadow-indigo-100"
              >
                إنهاء السكة
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === "available") {
    return (
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-800 p-4 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-sm"
      >
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-black text-xs dark:text-white">{order.vendor}</h4>
          <span className="text-emerald-600 font-black text-xs">{order.fee}</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-3 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-red-400" /> {order.address}
        </p>
        <button
          onClick={() => onAccept?.(order.id)}
          disabled={actionLoading}
          className="w-full bg-amber-500 text-white py-3 rounded-xl font-black text-[11px] shadow-lg shadow-amber-100 dark:shadow-none"
        >
          {actionLoading ? "جاري القبول..." : "قبول الطلب فوراً"}
        </button>
      </motion.div>
    );
  }

  if (type === "completed") {
    return (
      <motion.div 
        layout
        className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-[28px] border border-emerald-100 dark:border-emerald-800/30"
      >
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-black text-xs text-slate-900 dark:text-white">{order.vendor}</h4>
          <span className="text-emerald-600 font-black text-[10px] bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">مكتمل</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold">
          <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.customer}</p>
          <p className="font-black text-emerald-600">{order.fee}</p>
        </div>
      </motion.div>
    );
  }

  if (type === "cancelled") {
    return (
      <motion.div 
        layout
        className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-[28px] border border-red-100 dark:border-red-800/30"
      >
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-black text-xs text-slate-900 dark:text-white">{order.vendor}</h4>
          <span className="text-red-600 font-black text-[10px] bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full">ملغي</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold">
          <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.customer}</p>
          <p className="font-black text-red-600">{order.fee}</p>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default memo(DriverOrderItem);