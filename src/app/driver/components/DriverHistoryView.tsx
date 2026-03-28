"use client";

import { History } from "lucide-react";
import type { Order } from "../types";

interface DriverHistoryViewProps {
  orders: Order[];
}

export default function DriverHistoryView({ orders }: DriverHistoryViewProps) {
  const historyOrders = orders.filter((o) => o.status === "delivered" || o.status === "cancelled");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-gray-900">السجل</h2>
      {historyOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-[40px] shadow-sm text-center border border-gray-100">
          <p className="text-sm text-gray-400 font-bold">لا توجد عمليات سابقة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyOrders.map((order) => (
            <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.status === "delivered" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{order.vendor}</p>
                  <p className="text-[10px] text-gray-400">#{order.id.slice(0, 8)} • {order.fee}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold ${order.status === "delivered" ? "text-green-600" : "text-red-600"}`}>
                {order.status === "delivered" ? "تم التوصيل" : "ملغي"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
