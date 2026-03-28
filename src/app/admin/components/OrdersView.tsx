"use client";

import type { ActivityItem, LiveOrderItem } from "../types";

interface OrdersViewProps {
  liveOrders: LiveOrderItem[];
  activities: ActivityItem[];
}

export default function OrdersView({ liveOrders, activities }: OrdersViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-gray-900">الطلبات الحية</h3>
        {liveOrders.length === 0 ? <p className="text-sm text-gray-500">لا توجد طلبات نشطة الآن.</p> : liveOrders.map((o) => (
          <div key={o.id_full} className="p-3 rounded-xl border border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-gray-800">{o.vendor} - {o.customer}</p>
              <p className="text-xs text-gray-500">{o.status}</p>
            </div>
            <span className="text-xs font-bold text-gray-700">{o.delivery_fee} ج.م</span>
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-gray-900">آخر الأنشطة</h3>
        {activities.length === 0 ? <p className="text-sm text-gray-500">لا توجد أنشطة.</p> : activities.map((a) => (
          <div key={a.id} className="p-3 rounded-xl border border-gray-100 flex justify-between items-center">
            <span className="text-sm text-gray-700">{a.text}</span>
            <span className="text-xs text-gray-500">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
