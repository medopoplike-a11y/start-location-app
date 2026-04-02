"use client";

import dynamic from "next/dynamic";
import { Store, TrendingDown, Truck, Clock, MapPin, ChevronLeft, Power } from "lucide-react";
import { PremiumCard } from "@/components/PremiumCard";
import { motion, AnimatePresence } from "framer-motion";
import type { Order } from "../types";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => <div className="h-44 w-full bg-slate-100/50 animate-pulse rounded-[32px] flex items-center justify-center text-slate-400 font-bold border border-slate-100/50 backdrop-blur-sm">جاري تحميل الخريطة...</div>,
});

interface DriverOrdersViewProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  isActive: boolean;
  driverLocation: { lat: number; lng: number } | null;
  driverId: string | null;
  orders: Order[];
}

export default function DriverOrdersView({
  todayDeliveryFees,
  vendorDebt,
  isActive,
  driverLocation,
  driverId,
  orders,
}: DriverOrdersViewProps) {
  const activeOrders = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned': return <span className="bg-sky-50 text-sky-600 px-3 py-1 rounded-full text-[10px] font-black border border-sky-100">تم التعيين</span>;
      case 'in_transit': return <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black border border-amber-100">في الطريق</span>;
      default: return <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black border border-slate-100">متاح</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <PremiumCard 
          title="أرباح اليوم" 
          value={todayDeliveryFees} 
          icon={<div className="bg-green-500/10 p-2 rounded-xl"><TrendingDown className="text-green-500 w-5 h-5" /></div>} 
          subtitle="ج.م" 
          delay={0.1} 
        />
        <PremiumCard 
          title="مديونية المحلات" 
          value={vendorDebt} 
          icon={<div className="bg-orange-500/10 p-2 rounded-xl"><Store className="text-orange-500 w-5 h-5" /></div>} 
          subtitle="ج.م" 
          delay={0.2} 
        />
      </div>

      <section className="space-y-4">
        <AnimatePresence mode="wait">
          {isActive && driverLocation ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative"
            >
              <LiveMap 
                drivers={[{ id: driverId || "me", name: "موقعي", ...driverLocation }]} 
                center={[driverLocation.lat, driverLocation.lng]} 
                zoom={15} 
                className="h-44 w-full rounded-[32px] overflow-hidden shadow-sm border border-slate-100/50" 
              />
              <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">تتبع مباشر</span>
              </div>
            </motion.div>
          ) : !isActive && (
             <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-amber-50/50 border border-amber-100/50 p-6 rounded-[32px] text-center backdrop-blur-sm"
             >
                <Power className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-amber-600">قم بتفعيل الحالة لاستقبال الطلبات وتتبع موقعك</p>
             </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between px-2 pt-2">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-500" />
            الطلبات الحالية
          </h2>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            {activeOrders.length} طلب نشط
          </span>
        </div>

        {activeOrders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/60 p-12 rounded-[40px] shadow-sm text-center border border-slate-100/50 backdrop-blur-sm"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-sm text-slate-400 font-bold">لا توجد طلبات متاحة حالياً</p>
            <p className="text-[10px] text-slate-300 mt-1 italic">سيتم إخطارك فور توفر طلبات جديدة</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map((order, index) => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-1 h-full bg-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-sky-50 group-hover:text-sky-500 transition-colors shrink-0">
                      <Store className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black text-slate-900 group-hover:text-sky-600 transition-colors">{order.vendor}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">#{order.id.slice(0, 8)}</span>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  </div>
                  <div className="text-left bg-green-50 px-4 py-2 rounded-2xl border border-green-100">
                    <p className="text-xs font-black text-green-600">{order.fee}</p>
                    <p className="text-[8px] font-bold text-green-500/60 uppercase">عمولة</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                   <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm"><MapPin className="w-3.5 h-3.5 text-red-500" /></div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-slate-400">الوجهة</p>
                        <p className="text-[10px] font-black text-slate-700 truncate">{order.distance}</p>
                      </div>
                   </div>
                   <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm"><Clock className="w-3.5 h-3.5 text-sky-500" /></div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400">التجهيز</p>
                        <p className="text-[10px] font-black text-slate-700">{order.prepTime || '15'} دقيقة</p>
                      </div>
                   </div>
                </div>

                <div className="flex gap-3">
                  <motion.button 
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-emerald-100 transition-all active:scale-95"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {/* show order details modal */}}
                  >
                    تفاصيل
                  </motion.button>
                  {order.status === 'pending' && (
                    <motion.button 
                      className="bg-blue-500 hover:bg-blue-600 text-white py-4 px-3 rounded-2xl font-bold text-xs shadow-lg shadow-blue-100 transition-all active:scale-95 flex-0 flex-shrink-0"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {/* accept order */}}
                    >
                      قبول
                    </motion.button>
                  )}
                </div>
                <div className="flex items-center mt-3 p-3 bg-slate-50 rounded-2xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-[10px] font-bold text-slate-600">قبول تلقائي</span>
                  </label>
                </div>

              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
