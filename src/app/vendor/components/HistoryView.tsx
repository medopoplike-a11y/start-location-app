"use client";

import { History } from "lucide-react";
import type { Order } from "../types";
import { translateVendorOrderStatus } from "../utils";

interface HistoryViewProps {
  orders: Order[];
}

export default function HistoryView({ orders }: HistoryViewProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">سجل العمليات</h2>
      <div className="space-y-4">
        {orders.filter((o) => o.status === "delivered" || o.status === "cancelled").map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.status === "delivered" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}><History className="w-5 h-5" /></div><div><p className="text-sm font-bold text-gray-800">{order.customer}</p><p className="text-[10px] text-gray-400">{order.time} • {order.amount}</p></div></div>
            <span className={`text-[10px] font-bold ${order.status === "delivered" ? "text-green-600" : "text-red-600"}`}>{translateVendorOrderStatus(order.status)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
