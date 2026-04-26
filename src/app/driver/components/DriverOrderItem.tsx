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

const DriverOrderItem = memo(({
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
        className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-3xl p-6 rounded-[40px] border border-slate-100 dark:border-slate-800/50 shadow-2xl shadow-slate-200/40 dark:shadow-none overflow-hidden relative group"
      >
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl border-2 border-white/40 dark:border-slate-800/50 ${
              order.status === 'in_transit' ? "bg-indigo-600 shadow-indigo-500/30" : "bg-sky-600 shadow-sky-500/30"
            }`}>
              {order.status === 'in_transit' ? <Truck className="text-white w-8 h-8" /> : <Store className="text-white w-8 h-8" />}
            </div>
            <div>
              <h3 className="text-[18px] font-black text-slate-900 dark:text-white leading-tight mb-2 tracking-tight">{order.vendor}</h3>
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full animate-pulse ${order.status === 'in_transit' ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]' : 'bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.8)]'}`} />
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                  {order.status === 'assigned' ? 'بانتظار الاستلام' : 'جاري التوصيل الآن'}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-3">
            <div className="bg-emerald-500/10 dark:bg-emerald-500/5 px-5 py-2.5 rounded-[20px] border border-emerald-500/20 shadow-sm backdrop-blur-xl">
              <p className="text-[15px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">{order.fee}</p>
            </div>
            {order.status !== 'delivered' && onToggleNavigation && (
              <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleNavigation();
                }}
                className={`p-4 rounded-2xl border transition-all shadow-xl ${
                  isNavigating 
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/40" 
                  : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <Navigation className={`w-5 h-5 ${isNavigating ? "animate-pulse" : ""}`} />
              </motion.button>
            )}
          </div>
        </div>

        {aiAlert && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 p-5 rounded-[32px] flex items-center gap-4 border-2 backdrop-blur-2xl ${
            aiAlert.type === 'critical' 
              ? 'bg-red-500/10 text-red-600 border-red-500/20 shadow-red-500/10' 
              : 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/10'
          }`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${aiAlert.type === 'critical' ? 'bg-red-500/20 dark:bg-red-500/30' : 'bg-amber-500/20 dark:bg-amber-500/30'}`}>
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-60">تنبيه المساعد الذكي</p>
              <p className="text-[15px] font-black leading-tight mt-1">{aiAlert.message}</p>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50/50 dark:bg-slate-800/40 p-5 rounded-[30px] border border-slate-100 dark:border-slate-700/50 text-center shadow-sm backdrop-blur-xl group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
               <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-3">قيمة الطلب</p>
               <p className="text-[18px] font-black text-slate-900 dark:text-white tabular-nums">
                 {(order.customers?.reduce((acc, c) => acc + (Number(c?.orderValue) || 0), 0) || 0).toFixed(2)} <span className="text-[10px] opacity-40">ج.م</span>
               </p>
             </div>
             <div className="bg-indigo-500/5 dark:bg-indigo-500/10 p-5 rounded-[30px] border border-indigo-500/10 dark:border-indigo-500/20 text-center shadow-sm backdrop-blur-xl group-hover:bg-indigo-500/10 transition-colors">
               <p className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none mb-3">ربحك المتوقع</p>
               <p className="text-[18px] font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                 {(order.financials?.driver_earnings || 0).toFixed(2)} <span className="text-[10px] opacity-40">ج.م</span>
               </p>
             </div>
          </div>

          <div className="flex gap-4">
            <motion.button
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectOrder(order)}
              className="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-5 rounded-[28px] font-black text-[15px] shadow-2xl shadow-slate-900/30 dark:shadow-none transition-all border-b-4 border-slate-950 dark:border-slate-200"
            >
              إدارة الطلب
            </motion.button>
            
            {order.status === 'assigned' && onPickup && (
              <motion.button
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); onPickup(order.id); }}
                disabled={actionLoading}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-5 rounded-[28px] font-black text-[15px] shadow-2xl shadow-sky-500/40 dark:shadow-none transition-all border-b-4 border-sky-800"
              >
                {actionLoading ? "جاري الحفظ..." : "تأكيد الاستلام"}
              </motion.button>
            )}
            
            {order.status === 'in_transit' && (
              <motion.button
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); onSelectOrder(order); }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[28px] font-black text-[15px] shadow-2xl shadow-indigo-500/40 dark:shadow-none transition-all border-b-4 border-indigo-800"
              >
                إنهاء السكة
              </motion.button>
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
        className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-3xl p-6 rounded-[40px] border border-slate-100 dark:border-slate-800/50 shadow-2xl shadow-slate-200/40 dark:shadow-none relative group overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-500/20 rounded-2xl flex items-center justify-center border-2 border-amber-200/30 dark:border-amber-500/20 shadow-inner">
              <Zap className="w-7 h-7 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <div>
              <h4 className="font-black text-[17px] text-slate-900 dark:text-white leading-tight tracking-tight">{order.vendor}</h4>
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-1.5">طلب فوري متاح</p>
            </div>
          </div>
          <div className="bg-emerald-500/10 dark:bg-emerald-500/5 px-5 py-2.5 rounded-[20px] border border-emerald-500/20 shadow-sm backdrop-blur-xl">
            <span className="text-emerald-600 dark:text-emerald-400 font-black text-[15px] tabular-nums leading-none">{order.fee}</span>
          </div>
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-[30px] border border-slate-100 dark:border-slate-800/50 mb-6 flex items-start gap-3.5 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4.5 h-4.5 text-red-500/60" />
          </div>
          <p className="text-[13px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed pt-1.5">
            {order.address}
          </p>
        </div>

        <motion.button
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAccept?.(order.id)}
          disabled={actionLoading}
          className="w-full bg-amber-500 text-white py-5 rounded-[28px] font-black text-[15px] shadow-2xl shadow-amber-500/40 dark:shadow-none transition-all border-b-4 border-amber-700 relative z-10"
        >
          {actionLoading ? "جاري القبول..." : "قبول الطلب فوراً"}
        </motion.button>
      </motion.div>
    );
  }

  if (type === "completed") {
    return (
      <motion.div 
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-emerald-500/5 dark:bg-emerald-500/10 p-5 rounded-[32px] border border-emerald-500/10 dark:border-emerald-500/20 flex items-center justify-between group hover:bg-emerald-500/10 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-black text-[14px] text-slate-900 dark:text-white leading-tight">{order.vendor}</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1.5 mt-1">
              <MapPin className="w-3 h-3" /> {order.customer}
            </p>
          </div>
        </div>
        <div className="text-left">
          <p className="font-black text-emerald-600 dark:text-emerald-400 text-[15px] tabular-nums mb-1">{order.fee}</p>
          <div className="flex items-center justify-end gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">مكتمل</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === "cancelled") {
    return (
      <motion.div 
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-50/30 dark:bg-red-500/5 p-5 rounded-[32px] border border-red-100/50 dark:border-red-500/10 flex items-center justify-between opacity-70"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-2xl flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h4 className="font-black text-sm text-slate-900 dark:text-white">{order.vendor}</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5" /> {order.customer}
            </p>
          </div>
        </div>
        <div className="text-left">
          <p className="font-black text-red-600 dark:text-red-400 text-sm mb-1">{order.fee}</p>
          <span className="text-[9px] font-black text-red-500/60 uppercase tracking-widest">ملغي</span>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default memo(DriverOrderItem);