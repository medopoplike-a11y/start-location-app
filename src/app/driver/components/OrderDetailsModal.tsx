"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Phone, MapPin, Store, User, Clock, Banknote, 
  Truck, CheckCircle, Package, Navigation, AlertCircle 
} from "lucide-react";
import type { Order } from "../types";

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
  onAccept: (orderId: string) => Promise<void>;
  onPickup: (orderId: string) => Promise<void>;
  onDeliver: (orderId: string) => Promise<void>;
  loading?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; step: number }> = {
  pending:    { label: "بانتظار القبول", color: "text-amber-600", bg: "bg-amber-50 border-amber-100", step: 0 },
  assigned:   { label: "تم القبول - انتظر الاستلام", color: "text-sky-600", bg: "bg-sky-50 border-sky-100", step: 1 },
  in_transit: { label: "في الطريق للعميل", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100", step: 2 },
  delivered:  { label: "تم التوصيل", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", step: 3 },
};

const steps = [
  { icon: Package, label: "قبول" },
  { icon: Store, label: "استلام" },
  { icon: Truck, label: "توصيل" },
  { icon: CheckCircle, label: "تم" },
];

export default function OrderDetailsModal({
  order,
  onClose,
  onAccept,
  onPickup,
  onDeliver,
  loading = false,
}: OrderDetailsModalProps) {
  if (!order) return null;

  const currentStep = statusConfig[order.status]?.step ?? 0;
  const config = statusConfig[order.status] ?? statusConfig.pending;

  const handleAction = async () => {
    if (loading) return;
    if (order.status === "pending") await onAccept(order.id);
    else if (order.status === "assigned") await onPickup(order.id);
    else if (order.status === "in_transit") await onDeliver(order.id);
  };

  const actionLabel = () => {
    if (order.status === "pending") return "قبول الطلب";
    if (order.status === "assigned") return "تأكيد الاستلام من المحل";
    if (order.status === "in_transit") return "تأكيد التوصيل للعميل";
    return null;
  };

  const actionColor = () => {
    if (order.status === "pending") return "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200";
    if (order.status === "assigned") return "bg-sky-500 hover:bg-sky-600 shadow-sky-200";
    if (order.status === "in_transit") return "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200";
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
                      isCurrent ? "bg-white border-sky-500 text-sky-500 shadow-lg shadow-sky-100" :
                      "bg-white border-slate-200 text-slate-300"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[9px] font-black ${isCurrent ? "text-sky-600" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                      {step.label}
                    </span>
                    {i < steps.length - 1 && (
                      <div className="absolute" />
                    )}
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
          <div className="px-6 py-4 space-y-3">
            {/* Vendor */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <Store className="w-3 h-3" /> المحل
              </p>
              <div className="flex items-center justify-between">
                <p className="font-black text-slate-900">{order.vendor}</p>
                {order.vendorPhone && (
                  <a
                    href={`tel:${order.vendorPhone}`}
                    className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-sky-100 active:scale-95 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    اتصال
                  </a>
                )}
              </div>
            </div>

            {/* Customer */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <User className="w-3 h-3" /> العميل
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
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-red-400 flex-shrink-0" />
                <p className="text-sm font-medium">{order.address}</p>
              </div>
              {order.coords && (
                <a
                  href={`https://maps.google.com/?q=${order.coords.lat},${order.coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 text-sky-600 text-xs font-bold"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  فتح في الخرائط
                </a>
              )}
            </div>

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
                disabled={loading}
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
                ) : (
                  actionLabel()
                )}
              </motion.button>
            )}
            {order.status === "delivered" && (
              <div className="flex flex-col items-center py-4 text-emerald-600 gap-2">
                <CheckCircle className="w-12 h-12" />
                <p className="font-black text-lg">تم التوصيل بنجاح!</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
