"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Phone, MapPin, Store, User, Clock, Banknote,
  Truck, CheckCircle, Package, Navigation, AlertCircle, Camera, Star
} from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";
import type { Order } from "../types";
import { submitRating } from "@/lib/auth";

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
  onAccept: (orderId: string) => Promise<void>;
  onPickup: (orderId: string) => Promise<void>;
  onDeliver: (orderId: string) => Promise<void>;
  onConfirmPayment: (orderId: string) => Promise<void>;
  onDeliverCustomer?: (orderId: string, customerIndex: number) => Promise<void>;
  onPreviewImage?: (url: string) => void;
  isActive?: boolean;
  loading?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; step: number }> = {
  pending:    { label: "بانتظار القبول",           color: "text-amber-600",   bg: "bg-amber-50 border-amber-100",   step: 0 },
  assigned:   { label: "تم القبول — توجه للمحل",    color: "text-sky-600",     bg: "bg-sky-50 border-sky-100",       step: 1 },
  in_transit: { label: "في الطريق للعميل",         color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-100", step: 2 },
  delivered:  { label: "تم التوصيل",               color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", step: 3 },
};

const steps = [
  { icon: Package,     label: "قبول" },
  { icon: Store,       label: "استلام" },
  { icon: Truck,       label: "توصيل" },
  { icon: CheckCircle, label: "تم" },
];

export default function OrderDetailsModal({
  order,
  onClose,
  onAccept,
  onPickup,
  onDeliver,
  onConfirmPayment,
  onDeliverCustomer,
  onPreviewImage,
  isActive = false,
  loading = false,
}: OrderDetailsModalProps) {
  useBackButton(onClose, !!order);

  if (!order) return null;

  const currentStep = statusConfig[order.status]?.step ?? 0;
  const config = statusConfig[order.status] ?? statusConfig.pending;

  const totalOrderValue = order.customers?.reduce((acc, c) => acc + (Number(c.orderValue) || 0), 0) || 0;
  const totalDeliveryFee = order.customers?.reduce((acc, c) => acc + (Number(c.deliveryFee) || 0), 0) || 0;

  const handleAction = async () => {
    if (loading) return;
    if (order.status === "pending")    await onAccept(order.id);
    else if (order.status === "assigned")   await onPickup(order.id);
    else if (order.status === "in_transit") {
      if (order.customers && order.customers.length > 0) {
        const allDelivered = order.customers.every(c => c.status === 'delivered');
        if (allDelivered) {
          await onDeliver(order.id);
        } else {
          alert("يرجى تأكيد تسليم جميع العملاء أولاً");
        }
      } else {
        await onDeliver(order.id);
      }
    } else if (order.status === "delivered" && !order.driverConfirmedAt) {
      await onConfirmPayment(order.id);
    }
  };

  const actionLabel = () => {
    if (order.status === "pending")    return "قبول الطلب";
    if (order.status === "assigned")   return "تأكيد الاستلام من المحل";
    if (order.status === "in_transit") {
      if (order.customers && order.customers.length > 0) {
        const allDelivered = order.customers.every(c => c.status === 'delivered');
        return allDelivered ? "إنهاء السكة بالكامل" : "يرجى تسليم العملاء بالأسفل";
      }
      return "تأكيد التوصيل للعميل";
    }
    if (order.status === "delivered") {
      if (order.driverConfirmedAt) return "بانتظار تأكيد المحل ✓";
      return "تأكيد تسليم المبلغ للمحل";
    }
    return null;
  };

  const actionColor = () => {
    if (order.status === "pending")    return "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200";
    if (order.status === "assigned")   return "bg-sky-500 hover:bg-sky-600 shadow-sky-200";
    if (order.status === "in_transit") return "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200";
    if (order.status === "delivered") {
      if (order.driverConfirmedAt) return "bg-amber-500 hover:bg-amber-600 shadow-amber-200";
      return "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200";
    }
    return "";
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="bg-white w-full sm:max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle Bar */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">طلب #{order.id.slice(0, 8)}</p>
              <h2 className="text-lg font-black text-slate-900">{order.vendor}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                      isCurrent   ? "bg-white border-sky-500 text-sky-500 shadow-lg shadow-sky-100" :
                                    "bg-white border-slate-200 text-slate-300"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[9px] font-black ${isCurrent ? "text-sky-600" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Connector Lines */}
            <div className="flex items-center mt-[-28px] mb-3 px-5">
              {steps.slice(0, -1).map((_, i) => (
                <div key={i} className={`flex-1 h-0.5 mx-1 mt-[-4px] transition-colors ${i < currentStep ? "bg-emerald-400" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>

          {/* Status Badge */}
          <div className={`mx-6 mt-4 px-4 py-3 rounded-2xl border flex items-center gap-3 ${config.bg}`}>
            <AlertCircle className={`w-4 h-4 ${config.color} flex-shrink-0`} />
            <p className={`text-sm font-black ${config.color}`}>{config.label}</p>
          </div>

          {/* Details */}
          <div className="px-6 py-4 space-y-4">

            {/* Vendor (Pickup Point) - Moved higher for visibility */}
            <div className="bg-sky-50/40 rounded-3xl p-5 border border-sky-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-sky-600 shadow-sm border border-sky-50">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">نقطة الاستلام (المحل)</p>
                    <h3 className="font-black text-slate-900 text-lg">{order.vendor}</h3>
                    {order.vendorArea && (
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-400" />
                        {order.vendorArea}
                      </p>
                    )}
                  </div>
                </div>
                {order.vendorPhone && (
                  <a
                    href={`tel:${order.vendorPhone}`}
                    className="w-12 h-12 bg-white text-sky-500 border border-sky-100 rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all"
                    title="اتصال بالمحل"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                )}
              </div>

              {/* Vendor Actions */}
              <div className="flex gap-2">
                {order.vendorCoords ? (
                  <a
                    href={`https://maps.google.com/?q=${order.vendorCoords.lat},${order.vendorCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center gap-2 bg-sky-500 text-white px-4 py-3 rounded-2xl text-[11px] font-black shadow-lg shadow-sky-100 active:scale-95 transition-all justify-center"
                  >
                    <Navigation className="w-4 h-4" />
                    توجيه للمحل (GPS)
                  </a>
                ) : (
                  <div className="flex-1 bg-slate-100 text-slate-400 px-4 py-3 rounded-2xl text-[10px] font-bold flex items-center justify-center gap-2 border border-slate-200">
                    <MapPin className="w-3.5 h-3.5" />
                    الموقع غير متاح — اتصل بالمحل
                  </div>
                )}
                
                {/* Invoice Preview if exists (moved here for vendor context) */}
                {(order as any).invoiceUrl && (
                  <button 
                    onClick={() => {
                      if (onPreviewImage) {
                        onPreviewImage((order as any).invoiceUrl);
                      } else {
                        // Fallback if no previewer provided
                        window.open((order as any).invoiceUrl, '_blank');
                      }
                    }}
                    className="bg-orange-500 text-white px-4 py-3 rounded-2xl text-[11px] font-black shadow-lg shadow-orange-100 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    الفاتورة
                  </button>
                )}
              </div>
            </div>

            {/* Routing / Map Buttons (Only for active sikka) */}
            {order.status === 'in_transit' && order.vendorCoords && order.customers && order.customers.length > 0 && (
              <a
                href={`https://www.google.com/maps/dir/${order.vendorCoords.lat},${order.vendorCoords.lng}/${order.customers.map(c => encodeURIComponent(c.address)).join('/')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center gap-2 bg-indigo-500 text-white px-4 py-4 rounded-[28px] text-[12px] font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all justify-center"
              >
                <Navigation className="w-5 h-5" />
                رسم خط سير السكة بالكامل
              </a>
            )}

                {/* Sikka Total Summary */}
                {order.customers && order.customers.length > 0 && (
                  <div className="bg-slate-900 rounded-[32px] p-5 text-white shadow-xl shadow-slate-200 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي المديونية للمحل</p>
                      <p className="text-xl font-black text-white">{totalOrderValue} <span className="text-xs font-bold opacity-60">ج.م</span></p>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="space-y-1 text-left">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">صافي ربح السكة</p>
                      <p className="text-xl font-black text-orange-500">{totalDeliveryFee} <span className="text-xs font-bold opacity-60">ج.م</span></p>
                    </div>
                  </div>
                )}

                {/* Vendor Rating (Visible after delivery) */}
                {order.status === 'delivered' && (
                  <div className="bg-white border border-slate-100 rounded-[32px] p-6 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                        <User className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-black text-slate-700">تقييمك للمحل</p>
                    </div>
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => {
                            const comment = prompt("أضف تعليقاً (اختياري):") || "";
                            submitRating(order.id, order.driverId || "", order.vendorId, star, comment)
                              .then(({ error }) => {
                                if (!error) {
                                  alert("تم إرسال تقييمك بنجاح! شكراً لك.");
                                  onClose();
                                }
                                else alert("فشل إرسال التقييم: " + error.message);
                              });
                          }}
                          className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-amber-500 hover:text-white text-slate-300 transition-all flex items-center justify-center"
                        >
                          <Star size={20} fill="currentColor" />
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-center text-slate-400 font-bold">رأيك يساعدنا في تحسين جودة التعامل مع المحلات</p>
                  </div>
                )}

            {/* Customers List */}
            {order.customers && order.customers.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-900 mr-2">قائمة العملاء في السكة ({order.customers.length})</p>
                {order.customers.map((cust, idx) => (
                  <div key={idx} className={`rounded-3xl p-4 border transition-all ${cust.status === 'delivered' ? 'bg-emerald-50 border-emerald-100 opacity-70' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 bg-slate-900 text-white text-[10px] font-black flex items-center justify-center rounded-full">{idx + 1}</span>
                          <p className="font-black text-slate-900 text-sm">{cust.name}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
                          <MapPin size={12} className="text-red-400" />
                          {cust.address}
                        </div>
                      </div>
                        <div className="flex items-center gap-2">
                          {cust.invoice_url ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreviewImage?.(cust.invoice_url!);
                              }}
                              className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm active:scale-90 transition-all overflow-hidden"
                              title="عرض الفاتورة"
                            >
                              <img src={cust.invoice_url} className="w-full h-full object-cover" alt="Invoice" />
                            </button>
                          ) : (
                            <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 italic text-[8px] text-center p-1">
                              لا توجد فاتورة
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            <a href={`tel:${cust.phone}`} className="w-10 h-10 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-sky-500 shadow-sm active:scale-90 transition-all">
                              <Phone size={18} />
                            </a>
                            <a 
                              href={`https://maps.google.com/?q=${encodeURIComponent(cust.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-10 h-10 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-red-500 shadow-sm active:scale-90 transition-all"
                            >
                              <MapPin size={18} />
                            </a>
                          </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-white/60 p-2 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-bold text-slate-400 uppercase">قيمة الأوردر</p>
                        <p className="text-xs font-black text-slate-700">{cust.orderValue} ج.م</p>
                      </div>
                      <div className="bg-white/60 p-2 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-bold text-slate-400 uppercase">سعر التوصيل</p>
                        <p className="text-xs font-black text-emerald-600">{cust.deliveryFee} ج.م</p>
                      </div>
                    </div>

                    {order.status === 'in_transit' && cust.status === 'pending' && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={loading}
                        onClick={() => onDeliverCustomer?.(order.id, idx)}
                        className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16} />
                        تم التسليم لهذا العميل
                      </motion.button>
                    )}

                    {cust.status === 'delivered' && (
                      <div className="flex items-center justify-center gap-2 py-2 text-emerald-600 font-black text-xs">
                        <CheckCircle size={16} />
                        تم التسليم
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Legacy Single Customer View (Fallthrough) */
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> العميل (نقطة التوصيل)
                </p>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-black text-slate-900">{order.customer}</p>
                  {order.customerPhone && (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-100 active:scale-95 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      اتصال
                    </a>
                  )}
                </div>
                <div className="flex items-start gap-2 text-slate-600 mb-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-red-400 flex-shrink-0" />
                  <p className="text-sm font-medium">{order.address}</p>
                </div>
                {/* Customer Location Navigation */}
                {order.customerCoords ? (
                  <a
                    href={`https://maps.google.com/?q=${order.customerCoords.lat},${order.customerCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all w-full justify-center"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    التوجه إلى العميل على الخريطة
                  </a>
                ) : (
                  <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    إحداثيات العميل غير محددة
                  </div>
                )}
              </div>
            )}

            {/* Financial Info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-2xl p-3 border border-green-100 text-center">
                <Banknote className="w-4 h-4 text-green-500 mx-auto mb-1" />
                <p className="text-[9px] font-bold text-green-600 uppercase">عمولة</p>
                <p className="text-sm font-black text-green-700">{order.fee}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                <MapPin className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-[9px] font-bold text-slate-400 uppercase">المسافة</p>
                <p className="text-sm font-black text-slate-700">{order.distance}</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 text-center">
                <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <p className="text-[9px] font-bold text-amber-600 uppercase">تجهيز</p>
                <p className="text-sm font-black text-amber-700">{order.prepTime} دقيقة</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="px-6 pb-8 pt-2">
            {actionLabel() && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAction}
                disabled={loading || !isActive || (order.status === "in_transit" && order.customers && order.customers.length > 0 && !order.customers.every(c => c.status === 'delivered')) || (order.status === "delivered" && !!order.driverConfirmedAt)}
                className={`w-full py-5 rounded-2xl text-white font-black text-sm shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${actionColor()}`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    جاري التحديث...
                  </div>
                ) : !isActive && order.status === "pending" ? (
                  "فعل الحالة للقبول"
                ) : (
                  actionLabel()
                )}
              </motion.button>
            )}
            {order.status === "delivered" && (
              <div className="flex flex-col items-center py-4 text-emerald-600 gap-2">
                <CheckCircle className="w-12 h-12" />
                <p className="font-black text-lg">تم التوصيل بنجاح!</p>
                <p className="text-xs text-emerald-500 font-bold">توجه لمحفظتك لتأكيد تسليم المبلغ للمحل</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
