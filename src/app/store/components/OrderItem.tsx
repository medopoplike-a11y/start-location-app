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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-1 h-full bg-slate-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 group-hover:bg-slate-900 dark:group-hover:bg-slate-100 group-hover:text-white dark:group-hover:text-slate-900 transition-all shrink-0">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{order.customer}</h3>
              {onRequestAIInsights && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onRequestAIInsights(); }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  title="تحليل AI"
                >
                  <Bot className="w-3 h-3 text-sky-500" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700 tracking-tighter">#{order.id.slice(0, 8)}</span>
              <span className={`text-[9px] px-3 py-1 rounded-full font-black border ${getStatusStyle(order.status)}`}>
                {translateStatus(order.status)}
              </span>
            </div>
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="flex flex-col items-end">
            <p className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">ج.م</span>
              {order.amount.replace(" ج.م", "")}
            </p>
            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">الإجمالي</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3.5 rounded-[22px] border border-slate-100/50 dark:border-slate-700/50 flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"><MapPin className="w-3.5 h-3.5 text-red-500" /></div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-tight">العنوان</p>
            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate">{order.address}</p>
          </div>
        </div>
        <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3.5 rounded-[22px] border border-slate-100/50 dark:border-slate-700/50 flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"><Clock className="w-3.5 h-3.5 text-sky-500" /></div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-tight">وقت الطلب</p>
            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">{order.time}</p>
          </div>
        </div>
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
      <div className="flex justify-between items-center pt-5 border-t border-slate-50 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 relative group-hover:border-sky-200 transition-all overflow-hidden">
            {order.driver ? (
              <div className="bg-slate-900 dark:bg-slate-700 w-full h-full flex items-center justify-center text-white text-xs font-black uppercase">
                {order.driver.charAt(0)}
              </div>
            ) : (
              <Truck className="w-5 h-5 text-slate-200 dark:text-slate-700 animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">الطيار</p>
            <div className="flex flex-col">
              <p className={`text-xs font-black ${order.driver ? "text-slate-800 dark:text-slate-200" : "text-sky-500 animate-pulse"}`}>
                {order.driver || "بانتظار الموافقة..."}
              </p>
              {order.driverPhone && (
                <a 
                  href={`tel:${order.driverPhone}`}
                  className="text-[10px] font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1 mt-0.5"
                >
                  <Phone className="w-2.5 h-2.5" />
                  {order.driverPhone}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditable && !order.invoiceUrl && onQuickInvoiceUpload && (
            <motion.button
              onClick={() => onQuickInvoiceUpload(order)}
              disabled={uploadingInvoice && quickUploadOrderId === order.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center justify-center w-10 h-10 rounded-xl shadow-lg transition-all ${
                uploadingInvoice && quickUploadOrderId === order.id
                  ? "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed"
                  : "bg-orange-500 text-white shadow-orange-100"
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
            <>
              <motion.button
                onClick={() => onEditOrder(order)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white py-2.5 px-4 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                تعديل
              </motion.button>
              <motion.button
                onClick={() => onCancelOrder(order.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-red-500 hover:bg-red-600 text-white py-2.5 px-4 rounded-2xl font-bold text-sm shadow-lg shadow-red-100 transition-all"
              >
                إلغاء
              </motion.button>
            </>
          ) : (
            <motion.button
              onClick={() => onEditOrder(order)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 px-4 rounded-2xl font-bold text-sm transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              تفاصيل
            </motion.button>
          )}
        </div>
      </div>

      {order.status === "delivered" && setRatingOrder && (
        <div className="mt-4 flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRatingOrder(order)}
            className="w-full bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 py-3 rounded-2xl text-[10px] font-black border border-blue-600/20 dark:border-blue-900/30 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Star className="w-4 h-4" />
            تقييم تجربة الطيار
          </motion.button>
        </div>
      )}

      {!order.vendorCollectedAt && onCollectDebt && (
        <div className="mt-5">
          {order.driverConfirmedAt ? (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onCollectDebt(order.id)}
              className="w-full bg-green-500 text-white py-4 rounded-[24px] text-[11px] font-black hover:bg-green-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-100 dark:shadow-none"
            >
              <CheckCircle className="w-5 h-5" />
              تأكيد استلام المديونية ({order.amount})
            </motion.button>
          ) : (
            (order.status === "delivered" || order.status === "in_transit") && (
              <div className="w-full bg-slate-50/80 dark:bg-slate-950/80 text-slate-400 dark:text-slate-600 py-4 rounded-[24px] text-[10px] font-black flex items-center justify-center gap-3 border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                <Clock className="w-4 h-4 text-sky-400/50" />
                بانتظار طلب التسوية من الطيار
              </div>
            )
          )}
        </div>
      )}
    </motion.div>
  );
};

export default memo(OrderItem);