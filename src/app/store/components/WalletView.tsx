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
    commissionType?: 'percentage' | 'fixed';
    commissionValue?: number;
    billingType?: 'commission' | 'fixed_salary';
    monthlySalary?: number;
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

  const billingType = commissionDetails?.billingType || 'commission';
  const isFixed = commissionDetails?.commissionType === 'fixed';
  const rate = commissionDetails?.commissionRate ?? 0.15;
  const perOrder = commissionDetails?.commissionPerOrder ?? 1;
  const totalFees = commissionDetails?.totalDeliveryFees ?? 0;
  const orderCount = commissionDetails?.orderCount ?? 0;
  
  const commissionValue = isFixed ? ((commissionDetails?.commissionValue ?? 0) * orderCount) : (totalFees * rate);
  const fixedInsurance = orderCount * perOrder;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">المحفظة المالية</h2>

      {/* Commission Card */}
      <div className="bg-gray-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden border border-gray-800">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
              {billingType === 'fixed_salary' ? "قيمة الراتب المتفق عليه" : "إجمالي مديونية الشركة"}
            </p>
          </div>
          <h3 className="text-4xl font-black flex items-baseline gap-2">
            {billingType === 'fixed_salary' ? (commissionDetails?.monthlySalary || 0).toLocaleString() : companyCommission.toLocaleString()} 
            <span className="text-lg font-bold opacity-40">ج.م</span>
          </h3>

          {/* Commission Breakdown */}
          {commissionDetails && billingType === 'commission' && (
            <div className="mt-6 space-y-3 bg-white/5 rounded-[24px] p-5 border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                <p className="text-[10px] font-black text-white/60">تفاصيل الحساب المالي ({isFixed ? `${commissionDetails.commissionValue}ج ثابت` : `${(rate*100).toFixed(0)}%`} + {perOrder}ج)</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-white/50">عمولة الشركة {isFixed ? "(ثابتة)" : `(${(rate*100).toFixed(0)}%)`}</span>
                  <span className="text-white">{commissionValue.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-white/50">تأمين رحلة ({perOrder}ج ثابت)</span>
                  <span className="text-white">{(orderCount * perOrder).toFixed(2)} ج.م</span>
                </div>
                <div className="h-px bg-white/5 my-1" />
                <div className="flex justify-between items-center text-[11px] font-black text-orange-400">
                  <span>إجمالي المستحق للشركة</span>
                  <span>{(commissionValue + (orderCount * perOrder)).toFixed(2)} ج.م</span>
                </div>
              </div>
            </div>
          )}

          {commissionDetails && billingType === 'fixed_salary' && (
            <div className="mt-6 bg-purple-500/10 rounded-[24px] p-5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
                <p className="text-[10px] font-black text-purple-200">نظام الحساب: راتب ثابت</p>
              </div>
              <p className="text-[11px] font-bold text-white/60 leading-relaxed">
                حسابك الحالي مفعل بنظام الراتب الشهري الثابت. يتم سداد المديونية للأدمن بناءً على القيمة المتفق عليها شهرياً بغض النظر عن عدد الطلبات.
              </p>
            </div>
          )}

          <button
            onClick={onOpenSettlementModal}
            className="mt-6 w-full bg-orange-500 hover:bg-orange-600 py-4 rounded-2xl text-[11px] font-black transition-all shadow-lg shadow-orange-500/20 active:scale-95 border border-orange-400/20"
          >
            تأكيد سداد المديونية للأدمن
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group hover:border-orange-200 transition-all">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">مستحقاتك لدى الطيارين</p>
          </div>
          <h3 className="text-4xl font-black text-gray-900 flex items-baseline gap-2">
            {balance.toLocaleString()} 
            <span className="text-lg font-bold text-gray-300">ج.م</span>
          </h3>
          <p className="text-[10px] text-gray-400 font-bold mt-3 leading-relaxed">
            هذه هي إجمالي قيمة الأوردرات التي استلمها الطيارين من المحل ولم يقوموا بتسليمها لك بعد.
          </p>
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
