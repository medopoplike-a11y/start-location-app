"use client";

import { Store, TrendingDown, Wallet } from "lucide-react";
import { PremiumCard } from "@/components/PremiumCard";
import type { Order } from "../types";

interface DriverWalletViewProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  orders: Order[];
}

export default function DriverWalletView({ todayDeliveryFees, vendorDebt, orders }: DriverWalletViewProps) {
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const activeDebtCount = orders.filter((o) => o.status === "delivered" && !o.vendorCollectedAt).length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-gray-900">المحفظة</h2>
      <div className="grid grid-cols-2 gap-4">
        <PremiumCard title="أرباح اليوم" value={todayDeliveryFees} icon={<TrendingDown className="text-green-500 w-5 h-5" />} subtitle="ج.م" delay={0.1} />
        <PremiumCard title="مديونية المحلات" value={vendorDebt} icon={<Store className="text-orange-500 w-5 h-5" />} subtitle="ج.م" delay={0.2} />
      </div>
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 text-gray-900 font-bold"><Wallet className="w-4 h-4 text-blue-600" />ملخص التحصيل</div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">طلبات مكتملة</span><span className="font-bold text-gray-900">{deliveredCount}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">طلبات بانتظار التحصيل</span><span className="font-bold text-orange-600">{activeDebtCount}</span></div>
      </div>
    </div>
  );
}
