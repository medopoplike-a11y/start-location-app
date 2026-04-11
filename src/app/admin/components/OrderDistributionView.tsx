"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Store, User, MapPin, Banknote, CheckCircle, Zap, AlertCircle, X } from "lucide-react";
import type { LiveOrderItem, DriverCard } from "../types";

interface OrderDistributionViewProps {
  liveOrders: LiveOrderItem[];
  drivers: DriverCard[];
  onAssign: (orderId: string, driverId: string, driverName: string) => Promise<void>;
}

export default function OrderDistributionView({ liveOrders, drivers, onAssign }: OrderDistributionViewProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const pendingOrders = liveOrders.filter(o => o.status === "جاري البحث" || o.status === "pending");
  const availableDrivers = drivers.filter(d => !d.isShiftLocked);
  const selectedOrder = pendingOrders.find(o => o.id_full === selectedOrderId);

  // Advanced Sorting for Manual Distribution Helpers
  const sortedDrivers = [...availableDrivers].sort((a, b) => {
    // 1. Fewer active orders first (Load balance suggestion)
    const aActive = a.totalOrders || 0; // In a real app, this would be current active orders
    const bActive = b.totalOrders || 0;
    return aActive - bActive;
  });

  const handleAssign = async (driverId: string, driverName: string) => {
    if (!selectedOrderId) return;
    
    // Manual Override Confirmation
    const order = pendingOrders.find(o => o.id_full === selectedOrderId);
    if (order && order.driver_id) {
      if (!confirm(`هذا الطلب معين بالفعل للطيار ${order.driver}. هل تريد تحويله للطيار ${driverName}؟`)) return;
    }

    setAssigning(true);
    try {
      await onAssign(selectedOrderId, driverId, driverName);
      setSuccessId(selectedOrderId);
      setSelectedOrderId(null);
      setTimeout(() => setSuccessId(null), 3000);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[32px] p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              توزيع الطلبات يدوياً
            </h2>
            <p className="text-[11px] text-slate-400 font-bold mt-1">اختر طلباً ثم اختر الطيار المناسب</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-2xl">
              <p className="text-lg font-black text-amber-600">{pendingOrders.length}</p>
              <p className="text-[9px] font-bold text-amber-500 uppercase">طلب انتظار</p>
            </div>
            <div className="text-center bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-2xl">
              <p className="text-lg font-black text-emerald-600">{availableDrivers.length}</p>
              <p className="text-[9px] font-bold text-emerald-500 uppercase">طيار متاح</p>
            </div>
          </div>
        </div>
      </div>

      {successId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-black text-emerald-700">تم تعيين الطيار بنجاح!</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Orders */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[32px] p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4">
            <Store className="w-4 h-4 text-amber-500" />
            الطلبات بانتظار التعيين
          </h3>
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-slate-300">
              <CheckCircle className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-bold">جميع الطلبات مُعيَّنة</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {pendingOrders.map((order, i) => (
                <motion.button
                  key={order.id_full}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedOrderId(prev => prev === order.id_full ? null : order.id_full)}
                  className={`w-full text-right p-4 rounded-2xl border transition-all ${
                    selectedOrderId === order.id_full
                      ? "bg-sky-50 border-sky-300 shadow-md shadow-sky-100"
                      : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedOrderId === order.id_full ? "bg-sky-500" : "bg-amber-400"} animate-pulse`} />
                      <span className="text-[9px] font-black text-slate-400 uppercase">#{order.id}</span>
                    </div>
                    {selectedOrderId === order.id_full && (
                      <span className="text-[9px] font-black text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">محدد</span>
                    )}
                  </div>
                  <p className="text-sm font-black text-slate-900 mb-1">{order.vendor}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                      <User className="w-3 h-3" />
                      {order.customer}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-green-600 font-black">
                      <Banknote className="w-3 h-3" />
                      {order.delivery_fee} ج.م
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Available Drivers */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[32px] p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-emerald-500" />
            الطيارين المتاحين
            {!selectedOrder && (
              <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full mr-auto">اختر طلباً أولاً</span>
            )}
          </h3>

          {!selectedOrder ? (
            <div className="flex flex-col items-center py-14 text-slate-300">
              <AlertCircle className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-bold">اختر طلباً من القائمة</p>
              <p className="text-[10px] text-slate-400 mt-1">ستظهر هنا قائمة الطيارين المتاحين</p>
            </div>
          ) : availableDrivers.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-slate-300">
              <Truck className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-bold">لا يوجد طيارين متاحين الآن</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              <AnimatePresence>
                {selectedOrder && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-sky-50 border border-sky-200 rounded-2xl p-3 mb-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[10px] font-black text-sky-700">الطلب المحدد</p>
                      <p className="text-xs font-black text-sky-900">{selectedOrder.vendor} — {selectedOrder.customer}</p>
                    </div>
                    <button onClick={() => setSelectedOrderId(null)} className="p-1 hover:bg-sky-100 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-sky-400" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {sortedDrivers.map((driver, i) => (
                <motion.button
                  key={driver.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  disabled={assigning}
                  onClick={() => handleAssign(driver.id_full, driver.name)}
                  className="w-full text-right p-4 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-md hover:shadow-emerald-50 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-emerald-100 transition-colors">
                        <Truck className="w-4.5 h-4.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{driver.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-300" />
                          <span className="text-[9px] font-bold text-slate-400">الحد: {driver.max_active_orders || 3}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <p className="text-[10px] font-black text-emerald-600">{driver.earnings} ج.م</p>
                        <p className="text-[8px] text-slate-400 font-bold">أرباح اليوم</p>
                      </div>
                      <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md shadow-emerald-200">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
