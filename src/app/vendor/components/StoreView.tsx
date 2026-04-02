"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Clock, MapPin, Truck, Wallet, ShieldCheck, Filter, Store, Eye, Edit2 } from "lucide-react";
import dynamic from "next/dynamic";
import { PremiumCard } from "@/components/PremiumCard";
import type { OnlineDriver, Order, VendorLocation } from "../types";
import { translateVendorOrderStatus } from "../utils";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse rounded-[32px] border border-slate-100/50" />,
});

interface ActivityItem {
  id: string;
  text: string;
  time: string;
}

interface StoreViewProps {
  orders: Order[];
  searchQuery: string;
  activeTab: string;
  activityLog: ActivityItem[];
  balance: number;
  onlineDrivers: OnlineDriver[];
  companyCommission: number;
  showLiveMap: boolean;
  vendorLocation: VendorLocation | null;
  vendorId: string | null;
  vendorName: string;
  onSetActiveTab: (tab: string) => void;
  onCollectDebt: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  onEditOrder: (order: Order) => void;
}

export default function StoreView({
  orders,
  searchQuery,
  activeTab,
  activityLog,
  balance,
  onlineDrivers,
  companyCommission,
  showLiveMap,
  vendorLocation,
  vendorId,
  vendorName,
  onSetActiveTab,
  onCollectDebt,
  onCancelOrder,
  onEditOrder,
}: StoreViewProps) {
  const filteredOrders = orders.filter((o) => {
    const search = searchQuery.toLowerCase();
    const match = o.customer.toLowerCase().includes(search) || o.id.toLowerCase().includes(search);
    if (!match) return false;
    if (activeTab === "نشط" || activeTab === "active") return o.status !== "delivered" && o.status !== "cancelled";
    return activeTab === "مكتمل" ? o.status === "delivered" : o.status === "cancelled";
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-500/10 text-green-600 border-green-100";
      case "cancelled": return "bg-red-500/10 text-red-600 border-red-100";
      case "pending": return "bg-sky-500/10 text-sky-600 border-sky-100";
      case "assigned": return "bg-amber-500/10 text-amber-600 border-amber-100";
      case "in_transit": return "bg-purple-500/10 text-purple-600 border-purple-100";
      default: return "bg-slate-100 text-slate-500 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {activityLog.length > 0 && (
          <div className="bg-slate-900/5 backdrop-blur-xl border border-white/20 rounded-[28px] p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 bottom-0 w-1 bg-sky-500/50 group-hover:bg-sky-500 transition-colors" />
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">آخر النشاطات</span>
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
            </div>
            <AnimatePresence mode="popLayout">
              {activityLog.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex justify-between items-center bg-white/40 p-2 rounded-xl border border-white/40"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span className="text-[10px] font-bold text-slate-700">{log.text}</span>
                  </div>
                  <span className="text-[8px] font-black text-slate-400 bg-white/60 px-2 py-0.5 rounded-lg border border-slate-100">{log.time}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <PremiumCard
            title="مديونية الطيارين"
            value={balance.toLocaleString()}
            icon={<div className="bg-green-500/10 p-2 rounded-xl"><Wallet className="text-green-600 w-5 h-5" /></div>}
            subtitle="ج.م"
            delay={0.1}
          />
          <PremiumCard
            title="الطيارين المتصلين"
            value={onlineDrivers.length}
            icon={<div className="bg-sky-500/10 p-2 rounded-xl"><MapPin className="text-sky-600 w-5 h-5" /></div>}
            subtitle="طيار"
            delay={0.2}
            className={showLiveMap ? "ring-2 ring-sky-500 shadow-lg shadow-sky-100" : ""}
          />
        </div>

        <PremiumCard
          title="عمولة الشركة المستحقة"
          value={companyCommission.toLocaleString()}
          icon={<div className="bg-red-500/10 p-2 rounded-xl"><ShieldCheck className="text-red-600 w-5 h-5" /></div>}
          subtitle="ج.م"
          className="mt-2"
          delay={0.3}
        />
      </div>

      <AnimatePresence>
        {showLiveMap && (
          <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: "auto", opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <LiveMap
              drivers={onlineDrivers}
              vendors={vendorLocation ? [{ id: vendorId || "me", name: vendorName, lat: vendorLocation.lat, lng: vendorLocation.lng }] : []}
              center={vendorLocation ? [vendorLocation.lat, vendorLocation.lng] : undefined}
              className="h-64 w-full rounded-[40px] overflow-hidden shadow-xl border border-white/20"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-20 z-30 bg-white/60 backdrop-blur-xl p-1.5 rounded-[28px] flex border border-white/40 shadow-sm">
        {["نشط", "مكتمل", "ملغي"].map((tab) => (
          <motion.button
            key={tab}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSetActiveTab(tab === "نشط" ? "active" : tab)}
            className={`flex-1 py-3.5 rounded-[22px] text-[10px] font-black tracking-wider transition-all uppercase ${
              (activeTab === "active" && tab === "نشط") || activeTab === tab
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                : "text-slate-400 hover:bg-slate-100/50"
            }`}
          >
            {tab}
          </motion.button>
        ))}
      </div>

      <section className="space-y-5 pb-10">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-500" />
            الطلبات {activeTab === "active" ? "النشطة" : activeTab}
          </h2>
          <span className="text-[10px] font-black text-slate-400 bg-slate-100/50 px-3 py-1 rounded-full border border-slate-100">{filteredOrders.length}</span>
        </div>

        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 bg-white/40 rounded-[40px] border border-dashed border-slate-200 backdrop-blur-sm"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-sm text-slate-400 font-bold">لا توجد طلبات في هذا القسم</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order, index) => {
              const isDelivered = order.status === "delivered";
              const isCancelled = order.status === "cancelled";
              const isEditable = !isDelivered && !isCancelled;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-1 h-full bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0">
                        <Store className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 group-hover:text-sky-600 transition-colors">{order.customer}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 tracking-tighter">#{order.id.slice(0, 8)}</span>
                          <span className={`text-[9px] px-3 py-1 rounded-full font-black border ${getStatusStyle(order.status)}`}>
                            {translateVendorOrderStatus(order.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-900">{order.amount}</p>
                      <p className="text-[8px] font-black text-slate-400 tracking-widest uppercase">الإجمالي</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50/50 p-3.5 rounded-[22px] border border-slate-100/50 flex items-center gap-3">
                      <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm"><MapPin className="w-3.5 h-3.5 text-red-500" /></div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-slate-400 tracking-tight">العنوان</p>
                        <p className="text-[10px] font-black text-slate-700 truncate">{order.address}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 p-3.5 rounded-[22px] border border-slate-100/50 flex items-center gap-3">
                      <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm"><Clock className="w-3.5 h-3.5 text-sky-500" /></div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 tracking-tight">وقت الطلب</p>
                        <p className="text-[10px] font-black text-slate-700">{order.time}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 relative group-hover:border-sky-200 transition-all overflow-hidden">
                        {order.driver ? (
                          <div className="bg-slate-900 w-full h-full flex items-center justify-center text-white text-xs font-black uppercase">
                            {order.driver.charAt(0)}
                          </div>
                        ) : (
                          <Truck className="w-5 h-5 text-slate-200 animate-pulse" />
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400">الطيار</p>
                        <p className={`text-xs font-black ${order.driver ? "text-slate-800" : "text-sky-500 animate-pulse"}`}>
                          {order.driver || "بانتظار الموافقة..."}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
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
                          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-2xl font-bold text-sm transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          تفاصيل
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {!order.vendorCollectedAt && (
                    <div className="mt-5">
                      {order.driverConfirmedAt ? (
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onCollectDebt(order.id)}
                          className="w-full bg-green-500 text-white py-4 rounded-[24px] text-[11px] font-black hover:bg-green-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-100"
                        >
                          <CheckCircle className="w-5 h-5" />
                          تأكيد استلام المديونية ({order.amount})
                        </motion.button>
                      ) : (
                        order.status === "delivered" && (
                          <div className="w-full bg-slate-50/80 text-slate-400 py-4 rounded-[24px] text-[10px] font-black flex items-center justify-center gap-3 border border-dashed border-slate-200 backdrop-blur-sm">
                            <Clock className="w-4 h-4 text-sky-400/50" />
                            بانتظار طلب التسوية من الطيار
                          </div>
                        )
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </section>
    </div>
  );
}
