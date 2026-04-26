"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Store, Eye, Camera, Bot, Edit2, CheckCircle, FileText, Phone, Trash2, Truck, Star } from "lucide-react";
import { translateStatus } from "@/lib/utils/format";
import type { Order } from "../types";

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

const OrderItem = ({
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl p-6 rounded-[48px] border border-slate-100 dark:border-slate-800/50 shadow-2xl shadow-slate-200/20 dark:shadow-none group relative overflow-hidden transition-all duration-500 hover:shadow-sky-500/10 dark:hover:bg-slate-900/60"
    >
      <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-sky-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-all duration-500" />
      
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-6">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[32px] flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 shadow-inner group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 transition-all duration-500 shrink-0"
          >
            <Store className="w-10 h-10" />
          </motion.div>
          <div>
            <div className="flex items-center gap-4">
              <h3 className="font-black text-xl text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors duration-300">{order.customer}</h3>
              {onRequestAIInsights && (
                <motion.button 
                  whileHover={{ scale: 1.2, rotate: 15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); onRequestAIInsights(); }}
                  className="w-8 h-8 bg-sky-500/10 dark:bg-sky-500/20 flex items-center justify-center rounded-2xl transition-all shadow-inner"
                  title="تحليل AI"
                >
                  <Bot className="w-5 h-5 text-sky-500" />
                </motion.button>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 tracking-widest uppercase shadow-sm">#{order.id.slice(-6)}</span>
              <span className={`text-[10px] px-4 py-1.5 rounded-full font-black border shadow-sm transition-all duration-300 uppercase tracking-widest ${getStatusStyle(order.status)}`}>
                {translateStatus(order.status)}
              </span>
            </div>
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="flex flex-col items-end bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-inner">
            <p className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase">EGP</span>
              {order.amount.replace(" ج.م", "")}
            </p>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.3em] uppercase mt-1 opacity-60">Total Amount</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-white dark:bg-slate-800/40 backdrop-blur-md p-5 rounded-[32px] border border-slate-100 dark:border-slate-700/50 flex items-center gap-5 shadow-sm group/card transition-all duration-300"
        >
          <div className="w-12 h-12 bg-red-500/10 dark:bg-red-500/20 rounded-2xl flex items-center justify-center shadow-inner group-hover/card:rotate-6 transition-transform"><MapPin className="w-6 h-6 text-red-500" /></div>
          <div className="overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase mb-1">Address</p>
            <p className="text-[13px] font-black text-slate-800 dark:text-slate-200 truncate">{order.address}</p>
          </div>
        </motion.div>
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-white dark:bg-slate-800/40 backdrop-blur-md p-5 rounded-[32px] border border-slate-100 dark:border-slate-700/50 flex items-center gap-5 shadow-sm group/card transition-all duration-300"
        >
          <div className="w-12 h-12 bg-sky-500/10 dark:bg-sky-500/20 rounded-2xl flex items-center justify-center shadow-inner group-hover/card:-rotate-6 transition-transform"><Clock className="w-6 h-6 text-sky-500" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase mb-1">Time</p>
            <p className="text-[13px] font-black text-slate-800 dark:text-slate-200">{order.time}</p>
          </div>
        </motion.div>
      </div>

      {((order.customers && order.customers.some(c => c.invoice_url)) || order.invoiceUrl) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {order.invoiceUrl && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onPreviewImage?.(order.invoiceUrl!);
              }}
              className="relative w-14 h-14 rounded-xl overflow-hidden border border-sky-100 dark:border-sky-900 shadow-sm group/mini bg-white/50 dark:bg-slate-800/50 active:scale-95 transition-transform"
            >
              <img 
                src={order.invoiceUrl} 
                alt="" 
                crossOrigin="anonymous"
                className="w-full h-full object-contain relative z-10"
              />
              <Camera size={14} className="absolute inset-0 m-auto text-gray-300 dark:text-slate-700 opacity-20 z-0" />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover/mini:opacity-100 transition-opacity">
                <Eye className="text-white w-3 h-3" />
              </div>
              <div className="absolute top-0.5 right-0.5 bg-sky-500 text-white text-[6px] px-1 py-0.5 rounded-md font-black">
                عام
              </div>
            </button>
          )}
          
          {order.customers?.map((cust, idx) => cust.invoice_url && (
            <button 
              key={idx} 
              onClick={(e) => {
                e.stopPropagation();
                onPreviewImage?.(cust.invoice_url!);
              }}
              className="relative w-14 h-14 rounded-xl overflow-hidden border border-orange-100 dark:border-orange-900 shadow-sm group/mini bg-white/50 dark:bg-slate-800/50 active:scale-95 transition-transform"
            >
              <img 
                src={cust.invoice_url} 
                alt="" 
                crossOrigin="anonymous"
                className="w-full h-full object-contain relative z-10"
              />
              <Camera size={14} className="absolute inset-0 m-auto text-gray-300 dark:text-slate-700 opacity-20 z-0" />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover/mini:opacity-100 transition-opacity">
                <Eye className="text-white w-3 h-3" />
              </div>
              <div className="absolute top-0.5 right-0.5 bg-orange-500 text-white text-[6px] px-1 py-0.5 rounded-md font-black">
                عميل {idx + 1}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Driver Section */}
      <div className="flex justify-between items-center pt-6 border-t border-slate-100/50 dark:border-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 relative group-hover:border-sky-300 transition-all duration-500 overflow-hidden shadow-inner">
            {order.driver ? (
              <div className="bg-slate-900 dark:bg-slate-800 w-full h-full flex items-center justify-center text-white text-sm font-black uppercase tracking-tighter">
                {order.driver.charAt(0)}
              </div>
            ) : (
              <Truck className="w-6 h-6 text-slate-200 dark:text-slate-800 animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-tight mb-0.5">الطيار المسؤول</p>
            <div className="flex flex-col">
              <p className={`text-[13px] font-black ${order.driver ? "text-slate-900 dark:text-slate-100" : "text-sky-500 animate-pulse"}`}>
                {order.driver || "بانتظار قبول طيار..."}
              </p>
              {order.driverPhone && (
                <motion.a 
                  whileHover={{ x: 3 }}
                  href={`tel:${order.driverPhone}`}
                  className="text-[10px] font-black text-sky-500 hover:text-sky-600 flex items-center gap-1.5 mt-1 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded-lg w-fit transition-colors"
                >
                  <Phone className="w-2.5 h-2.5" />
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
              className={`flex items-center justify-center w-11 h-11 rounded-2xl shadow-xl transition-all duration-300 ${
                uploadingInvoice && quickUploadOrderId === order.id
                  ? "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed"
                  : "bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-orange-200 dark:shadow-none"
              }`}
            >
              {uploadingInvoice && quickUploadOrderId === order.id ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </motion.button>
          )}
          {isEditable ? (
            <div className="flex gap-2">
              <motion.button
                onClick={() => onEditOrder(order)}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 px-5 rounded-[20px] font-black text-xs shadow-xl shadow-slate-200 dark:shadow-none transition-all duration-300"
              >
                <Edit2 className="w-3.5 h-3.5" />
                تعديل
              </motion.button>
              <motion.button
                onClick={() => onCancelOrder(order.id)}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="bg-red-500 hover:bg-red-600 text-white py-3 px-5 rounded-[20px] font-black text-xs shadow-xl shadow-red-100 dark:shadow-none transition-all duration-300"
              >
                إلغاء
              </motion.button>
            </div>
          ) : (
            <motion.button
              onClick={() => onEditOrder(order)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 px-6 rounded-[20px] font-black text-xs transition-all duration-300 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <Eye className="w-4 h-4" />
              عرض التفاصيل
            </motion.button>
          )}
        </div>
      </div>

      {order.status === "delivered" && setRatingOrder && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-5"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRatingOrder(order)}
            className="w-full bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-500/10 dark:to-indigo-500/10 text-blue-700 dark:text-blue-400 py-4 rounded-[24px] text-[11px] font-black border border-blue-200/50 dark:border-blue-900/30 hover:from-blue-600 hover:to-indigo-600 hover:text-white transition-all duration-500 flex items-center justify-center gap-3 group/rate shadow-sm"
          >
            <Star className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            تقييم تجربة الكابتن والخدمة
          </motion.button>
        </motion.div>
      )}

      {!order.vendorCollectedAt && onCollectDebt && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-5"
        >
          {order.driverConfirmedAt ? (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onCollectDebt(order.id)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4.5 rounded-[28px] text-xs font-black hover:from-emerald-600 hover:to-teal-600 transition-all duration-500 flex items-center justify-center gap-3 shadow-2xl shadow-emerald-200/50 dark:shadow-none border-b-4 border-emerald-700/30"
            >
              <CheckCircle className="w-5 h-5" />
              تأكيد استلام المديونية ({order.amount})
            </motion.button>
          ) : (
            (order.status === "delivered" || order.status === "in_transit") && (
              <div className="w-full bg-slate-50/80 dark:bg-slate-950/80 text-slate-400 dark:text-slate-600 py-4.5 rounded-[28px] text-[11px] font-black flex items-center justify-center gap-3 border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                <div className="relative">
                  <Clock className="w-4 h-4 text-sky-400/50" />
                  <div className="absolute inset-0 bg-sky-400/20 blur-sm rounded-full animate-pulse" />
                </div>
                بانتظار طلب التسوية من الكابتن
              </div>
            )
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default memo(OrderItem);