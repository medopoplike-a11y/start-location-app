"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Store, Eye, Camera, Bot, Edit2, CheckCircle, FileText, Phone, Trash2, Truck, Star, User } from "lucide-react";
import { translateStatus } from "@/lib/utils/format";
import type { Order } from "../types";
import { triggerHaptic } from "@/lib/native-utils";
import { ImpactStyle } from "@capacitor/haptics";

interface OrderItemProps {
  order: Order;
  index: number;
  getStatusStyle: (status: string) => string;
  onPreviewImage?: (url: string) => void;
  onRequestAIInsights?: () => void;
  onEditOrder: (order: Order) => void;
  onCancelOrder: (orderId: string) => void;
  onQuickInvoiceUpload?: (order: Order) => void;
  uploadingInvoice?: boolean;
  quickUploadOrderId?: string | null;
  onCollectDebt?: (orderId: string) => void;
  setRatingOrder?: (order: Order) => void;
}

const OrderItem = memo(({
  order,
  index,
  getStatusStyle,
  onPreviewImage,
  onRequestAIInsights,
  onEditOrder,
  onCancelOrder,
  onQuickInvoiceUpload,
  uploadingInvoice,
  quickUploadOrderId,
  onCollectDebt,
  setRatingOrder
}: OrderItemProps) => {
  const isDelivered = order.status === "delivered";
  const isCancelled = order.status === "cancelled";
  const isEditable = !isDelivered && !isCancelled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "circOut" }}
      whileHover={{ y: -1 }}
      className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-3xl p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-lg shadow-slate-200/10 dark:shadow-none group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:border-sky-200 dark:hover:border-sky-900/50"
    >
      {/* Premium Decorative Gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-500/10 to-transparent rounded-full -mr-16 -mt-16 blur-2xl group-hover:from-sky-500/20 transition-all duration-700" />
      
      {/* Header Section: Customer & Status */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: -5, scale: 1.05 }}
            className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 shadow-inner group-hover:bg-sky-500 group-hover:text-white transition-all duration-500 shrink-0"
          >
            <User className="w-6 h-6" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors duration-300 tracking-tight">
                {order.customer}
              </h3>
              {onRequestAIInsights && (
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    triggerHaptic(ImpactStyle.Light);
                    onRequestAIInsights(); 
                  }}
                  className="w-7 h-7 bg-sky-500/10 dark:bg-sky-500/20 flex items-center justify-center rounded-xl transition-all shadow-inner"
                >
                  <Bot className="w-4 h-4 text-sky-500" />
                </motion.button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800 tracking-wider">#{order.id.slice(-6).toUpperCase()}</span>
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-black border shadow-sm transition-all duration-300 tracking-wide ${getStatusStyle(order.status)}`}>
                {translateStatus(order.status)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-left shrink-0">
          <div className="bg-slate-900 dark:bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-800 dark:border-slate-100 transition-all duration-500 group-hover:scale-105">
            <p className="text-lg font-black text-white dark:text-slate-900 flex items-center gap-1 leading-none">
              {order.amount.replace(" ج.م", "")}
              <span className="text-[8px] font-black opacity-50">ج.م</span>
            </p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
        <div className="bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-3 transition-all duration-300 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
          <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0 shadow-sm"><MapPin className="w-4 h-4 text-red-500" /></div>
          <div className="overflow-hidden">
            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate leading-tight">{order.address}</p>
          </div>
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-3 transition-all duration-300 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
          <div className="w-8 h-8 bg-sky-500/10 rounded-lg flex items-center justify-center shrink-0 shadow-sm"><Clock className="w-4 h-4 text-sky-500" /></div>
          <div className="overflow-hidden">
            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate leading-tight">{order.time}</p>
          </div>
        </div>
      </div>

      {/* Multi-Stop Customers Summary (If applicable) */}
      {order.customers && order.customers.length > 1 && (
        <div className="mb-4 bg-orange-50/30 dark:bg-orange-950/10 p-3 rounded-2xl border border-orange-100/50 dark:border-orange-900/20">
          <p className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Truck className="w-3 h-3" />
            مسار السكة ({order.customers.length} محطات)
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {order.customers.map((c, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-orange-100 dark:border-orange-900/30 flex-shrink-0">
                <p className="text-[9px] font-black text-slate-800 dark:text-slate-200">{c.name}</p>
                <p className="text-[7px] font-bold text-slate-400">{c.orderValue} ج.م</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices Preview */}
      {((order.customers && order.customers.some(c => c.invoice_url)) || order.invoiceUrl) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {order.invoiceUrl && (
            <motion.button 
              whileHover={{ scale: 1.05, y: -1 }}
              onClick={(e) => { e.stopPropagation(); onPreviewImage?.(order.invoiceUrl!); }}
              className="relative w-12 h-12 rounded-xl overflow-hidden border border-white dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 group/img"
            >
              <img src={order.invoiceUrl} alt="Invoice" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </motion.button>
          )}
          {order.customers?.map((c, idx) => c.invoice_url && (
            <motion.button 
              key={idx}
              whileHover={{ scale: 1.05, y: -1 }}
              onClick={(e) => { e.stopPropagation(); onPreviewImage?.(c.invoice_url!); }}
              className="relative w-12 h-12 rounded-xl overflow-hidden border border-white dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 group/img"
            >
              <img src={c.invoice_url} alt={`Invoice ${idx}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-bold p-1 text-center leading-tight">
                فاتورة {c.name}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Footer: Driver & Actions */}
      <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-50 dark:bg-slate-950 rounded-[20px] flex items-center justify-center border border-slate-100 dark:border-slate-800 relative group-hover:border-sky-300 transition-all duration-500 overflow-hidden shadow-inner">
            {order.driver ? (
              <div className="bg-slate-900 dark:bg-slate-800 w-full h-full flex items-center justify-center text-white text-base font-black uppercase">
                {order.driver.charAt(0)}
              </div>
            ) : (
              <Truck className="w-7 h-7 text-slate-200 dark:text-slate-800 animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">الطيار</p>
            <div className="flex flex-col">
              <p className={`text-sm font-black tracking-tight ${order.driver ? "text-slate-900 dark:text-slate-100" : "text-sky-500 animate-pulse"}`}>
                {order.driver || "بانتظار قبول طيار..."}
              </p>
              {order.driverPhone && (
                <motion.a 
                  whileHover={{ x: 5 }}
                  href={`tel:${order.driverPhone}`}
                  className="text-[10px] font-black text-sky-500 hover:text-sky-600 flex items-center gap-2 mt-1.5 bg-sky-50 dark:bg-sky-500/10 px-3 py-1 rounded-xl w-fit transition-all border border-sky-100 dark:border-sky-900/30"
                >
                  <Phone className="w-3 h-3" />
                  {order.driverPhone}
                </motion.a>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          {isEditable && !order.invoiceUrl && onQuickInvoiceUpload && (
            <motion.button
              onClick={() => onQuickInvoiceUpload(order)}
              disabled={uploadingInvoice && quickUploadOrderId === order.id}
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl shadow-xl transition-all duration-300 ${
                uploadingInvoice && quickUploadOrderId === order.id
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-orange-200/50 dark:shadow-none"
              }`}
            >
              {uploadingInvoice && quickUploadOrderId === order.id ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <Camera className="w-5.5 h-5.5" />
              )}
            </motion.button>
          )}
          
          <div className="flex gap-2">
            {isEditable ? (
              <>
                <motion.button
                  onClick={() => onEditOrder(order)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 px-6 rounded-[22px] font-black text-xs shadow-xl shadow-slate-200/50 dark:shadow-none transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  تعديل
                </motion.button>
                <motion.button
                  onClick={() => onCancelOrder(order.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-red-50 dark:bg-red-950/30 text-red-500 py-3.5 px-5 rounded-[22px] font-black text-xs border border-red-100 dark:border-red-900/30 hover:bg-red-500 hover:text-white transition-all"
                >
                  إلغاء
                </motion.button>
              </>
            ) : (
              <motion.button
                onClick={() => onEditOrder(order)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 py-3.5 px-7 rounded-[22px] font-black text-xs transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <Eye className="w-4 h-4" />
                عرض السكة
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Actions: Rating & Collection */}
      {(order.status === "delivered" && setRatingOrder) || (!order.vendorCollectedAt && onCollectDebt && (order.status === "delivered" || order.status === "in_transit")) ? (
        <div className="mt-5 pt-5 border-t border-dashed border-slate-100 dark:border-slate-800 grid grid-cols-1 gap-3">
          {order.status === "delivered" && setRatingOrder && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setRatingOrder(order);
              }}
              className="w-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 py-4 rounded-2xl text-[11px] font-black border border-blue-100 dark:border-blue-900/30 hover:bg-blue-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-2.5"
            >
              <Star className="w-4.5 h-4.5" />
              تقييم الكابتن والخدمة
            </motion.button>
          )}

          {!order.vendorCollectedAt && onCollectDebt && (
            order.driverConfirmedAt ? (
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  triggerHaptic(ImpactStyle.Medium);
                  onCollectDebt(order.id);
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl text-[11px] font-black shadow-xl shadow-emerald-200/50 dark:shadow-none flex items-center justify-center gap-2.5"
              >
                <CheckCircle className="w-4.5 h-4.5" />
                تأكيد استلام المديونية ({order.amount})
              </motion.button>
            ) : (
              <div className="w-full bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-600 py-4 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2.5 border border-dashed border-slate-200 dark:border-slate-800">
                <Clock className="w-4 h-4 animate-spin-slow" />
                بانتظار طلب التسوية من الكابتن
              </div>
            )
          )}
        </div>
      ) : null}
    </motion.div>
  );
});

OrderItem.displayName = "OrderItem";

export default OrderItem;