"use client";

import { useState } from "react";
import { Wallet, AlertCircle, TrendingDown } from "lucide-react";
import type { SettlementHistoryItem } from "../types";

interface WalletViewProps {
  companyCommission: number;
  balance: number;
  settlementHistory: SettlementHistoryItem[];
  commissionDetails?: {
    totalDeliveryFees: number;
    orderCount: number;
    commissionRate: number;
    commissionPerOrder: number;
  };
  onOpenSettlementModal: () => void;
}

type FilterPeriod = "today" | "15days" | "month";

export default function WalletView({ companyCommission, balance, settlementHistory, commissionDetails, onOpenSettlementModal }: WalletViewProps) {
  const [filter, setFilter] = useState<FilterPeriod>("15days");

  const filterLabels: Record<FilterPeriod, string> = {
    today: "اليوم",
    "15days": "١٥ يوم",
    month: "الشهر",
  };

  const now = new Date();
  const filteredSettlements = settlementHistory.filter((s) => {
    if (!s.date) return true;
    const d = new Date(s.date);
    if (filter === "today") return d.toDateString() === now.toDateString();
    if (filter === "15days") { const ago = new Date(now); ago.setDate(ago.getDate() - 15); return d >= ago; }
    const ago = new Date(now); ago.setDate(ago.getDate() - 30); return d >= ago;
  });

  const rate = commissionDetails?.commissionRate ?? 0.15;
  const perOrder = commissionDetails?.commissionPerOrder ?? 1;
  const totalFees = commissionDetails?.totalDeliveryFees ?? 0;
  const orderCount = commissionDetails?.orderCount ?? 0;
  const rateCommission = totalFees * rate;
  const fixedCommission = orderCount * perOrder;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">المحفظة المالية</h2>

      {/* Commission Card */}
      <div className="bg-gray-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">عمولة الشركة المستحقة</p>
          <h3 className="text-4xl font-black">
            {companyCommission.toLocaleString()} <span className="text-lg font-bold">ج.م</span>
          </h3>

          {/* Commission Breakdown */}
          {commissionDetails && (
            <div className="mt-4 space-y-1.5 bg-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-300" />
                <p className="text-[11px] font-black text-white/80">تفاصيل العمولة (كل ١٥ يوم)</p>
              </div>
              <div className="flex justify-between text-[10px] text-white/70 font-bold">
                <span>%{(rate * 100).toFixed(0)} من سعر التوصيل</span>
                <span>{rateCommission.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-[10px] text-white/70 font-bold">
                <span>{orderCount} طلب × {perOrder} ج.م</span>
                <span>{fixedCommission.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-[10px] text-white font-black border-t border-white/20 pt-1.5">
                <span>إجمالي رسوم التوصيل</span>
                <span>{totalFees.toFixed(2)} ج.م</span>
              </div>
            </div>
          )}

          <button
            onClick={onOpenSettlementModal}
            className="mt-5 w-full bg-white/10 hover:bg-white/20 py-3 rounded-2xl text-xs font-bold transition-colors border border-white/10"
          >
            طلب تسوية مديونية
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">مستحقات لدى الطيارين</p>
          </div>
          <h3 className="text-4xl font-black text-gray-900">
            {balance.toLocaleString()} <span className="text-lg font-bold text-gray-400">ج.م</span>
          </h3>
          <p className="text-[10px] text-gray-400 mt-2">المبالغ التي يحملها الطيارين من طلباتك ولم تُحصَّل بعد</p>
        </div>
      </div>

      {/* Settlements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 pr-2">طلبات التسوية</h3>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
          {(["today", "15days", "month"] as FilterPeriod[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {filteredSettlements.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-[32px] text-center border border-dashed border-gray-200">
            <p className="text-xs text-gray-400 font-bold">لا توجد طلبات تسوية في هذه الفترة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSettlements.map((s) => (
              <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      s.status === "تم السداد" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">تسوية مديونية</p>
                    <p className="text-[10px] text-gray-400 font-bold">{s.date}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-900">{s.amount} ج.م</p>
                  <p className={`text-[10px] font-bold ${s.status === "تم السداد" ? "text-green-600" : "text-orange-600"}`}>
                    {s.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
