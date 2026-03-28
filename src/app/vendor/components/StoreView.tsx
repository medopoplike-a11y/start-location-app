"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Clock, MapPin, Truck, Wallet, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { PremiumCard } from "@/components/PremiumCard";
import type { OnlineDriver, Order, VendorLocation } from "../types";
import { translateVendorOrderStatus } from "../utils";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

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
}: StoreViewProps) {
  const filteredOrders = orders.filter((o) => {
    const search = searchQuery.toLowerCase();
    const match = o.customer.toLowerCase().includes(search) || o.id.toLowerCase().includes(search);
    if (!match) return false;
    if (activeTab === "active") return o.status !== "delivered" && o.status !== "cancelled";
    return activeTab === "مكتمل" ? o.status === "delivered" : o.status === "cancelled";
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {activityLog.length > 0 && (
          <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-[24px] p-3 flex flex-col gap-1 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-brand-orange animate-pulse" />
            <AnimatePresence mode="popLayout">
              {activityLog.map((log) => (
                <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-brand-orange" /><span className="text-[10px] font-bold text-gray-600">{log.text}</span></div>
                  <span className="text-[8px] font-bold text-gray-400">{log.time}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <PremiumCard title="مديونية الطيارين" value={balance.toLocaleString()} icon={<Wallet className="text-green-600 w-5 h-5" />} subtitle="ج.م" delay={0.1} />
          <PremiumCard title="الطيارين المتصلين" value={onlineDrivers.length} icon={<MapPin className="text-brand-orange w-5 h-5" />} subtitle="طيار" delay={0.2} className={showLiveMap ? "ring-2 ring-brand-orange" : ""} />
        </div>

        <PremiumCard title="عمولة الشركة المستحقة" value={companyCommission.toLocaleString()} icon={<ShieldCheck className="text-brand-red w-5 h-5" />} subtitle="ج.م" className="mt-4" delay={0.3} />
      </div>

      <AnimatePresence>
        {showLiveMap && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <LiveMap drivers={onlineDrivers} vendors={vendorLocation ? [{ id: vendorId || "me", name: vendorName, lat: vendorLocation.lat, lng: vendorLocation.lng }] : []} center={vendorLocation ? [vendorLocation.lat, vendorLocation.lng] : undefined} className="h-64 w-full rounded-[32px] overflow-hidden shadow-sm border border-gray-100" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-1 rounded-2xl flex border border-gray-100 items-center">
        {["نشط", "مكتمل", "ملغي"].map((tab) => (
          <button key={tab} onClick={() => onSetActiveTab(tab === "نشط" ? "active" : tab)} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${(activeTab === "active" && tab === "نشط") || activeTab === tab ? "bg-brand-orange text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}>{tab}</button>
        ))}
      </div>

      <section className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200"><Truck className="w-12 h-12 text-gray-200 mx-auto mb-4" /><p className="text-sm text-gray-400 font-bold">لا توجد طلبات حالياً</p></div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div><h3 className="font-bold text-gray-900">{order.customer}</h3><p className="text-[10px] text-gray-400 font-bold">#{order.id.slice(0, 8)}</p></div>
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${order.status === "delivered" ? "bg-green-50 text-green-600" : order.status === "cancelled" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}>{translateVendorOrderStatus(order.status)}</span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500"><MapPin className="w-3 h-3 text-gray-400" /><span>{order.address}</span></div>
                  <div className="flex items-center gap-2 text-xs text-gray-500"><Clock className="w-3 h-3 text-brand-orange" /><span>{order.time}</span></div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">{order.driver ? <div className="bg-brand-orange w-full h-full flex items-center justify-center text-white text-[10px] font-bold">{order.driver.charAt(0)}</div> : <Truck className="w-4 h-4 text-gray-400" />}</div><span className="text-xs font-bold text-gray-700">{order.driver || "بانتظار طيار..."}</span></div>
                  <span className="font-bold text-gray-900">{order.amount}</span>
                </div>

                {!order.vendorCollectedAt && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    {order.driverConfirmedAt ? (
                      <button onClick={() => onCollectDebt(order.id)} className="w-full bg-green-500 text-white py-4 rounded-2xl text-[10px] font-black hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100">
                        <CheckCircle className="w-4 h-4" />
                        تأكيد استلام مبلغ المديونية ({order.amount})
                      </button>
                    ) : (
                      order.status === "delivered" && (
                        <div className="w-full bg-gray-50 text-gray-400 py-3 rounded-2xl text-[10px] font-bold flex items-center justify-center gap-2 border border-dashed border-gray-200">
                          <Clock className="w-4 h-4 text-gray-300" />
                          بانتظار قيام الطيار بطلب تسوية الدفع
                        </div>
                      )
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </section>
    </div>
  );
}
