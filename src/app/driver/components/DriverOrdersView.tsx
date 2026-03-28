"use client";

import dynamic from "next/dynamic";
import { Store, TrendingDown, Truck } from "lucide-react";
import { PremiumCard } from "@/components/PremiumCard";
import type { Order } from "../types";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => <div className="h-40 w-full bg-gray-50 animate-pulse rounded-[32px] flex items-center justify-center text-gray-400 font-bold border border-gray-100">جاري تحميل الخريطة...</div>,
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

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <PremiumCard title="أرباح اليوم" value={todayDeliveryFees} icon={<TrendingDown className="text-green-500 w-5 h-5" />} subtitle="ج.م" delay={0.1} />
        <PremiumCard title="مديونية المحلات" value={vendorDebt} icon={<Store className="text-orange-500 w-5 h-5" />} subtitle="ج.م" delay={0.2} />
      </div>

      <section className="space-y-4">
        {isActive && driverLocation && (
          <LiveMap drivers={[{ id: driverId || "me", name: "موقعي", ...driverLocation }]} center={[driverLocation.lat, driverLocation.lng]} zoom={15} className="h-40 w-full rounded-[32px] overflow-hidden shadow-sm border border-gray-100 mb-4" />
        )}
        {activeOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-[40px] shadow-sm text-center border border-gray-100">
            <Truck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm text-gray-400 font-bold">لا توجد طلبات متاحة</p>
          </div>
        ) : (
          activeOrders.map((order) => (
            <div key={order.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400"><Store className="w-6 h-6" /></div>
                  <div><h3 className="font-black text-gray-900">{order.vendor}</h3><p className="text-[10px] text-gray-400">#{order.id.slice(0, 8)}</p></div>
                </div>
                <div className="text-left"><p className="text-sm font-black text-red-600">{order.fee}</p></div>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
