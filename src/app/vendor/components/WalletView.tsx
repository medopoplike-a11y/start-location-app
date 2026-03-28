"use client";

import { Wallet } from "lucide-react";
import type { SettlementHistoryItem } from "../types";

interface WalletViewProps {
  companyCommission: number;
  balance: number;
  settlementHistory: SettlementHistoryItem[];
  onOpenSettlementModal: () => void;
}

export default function WalletView({ companyCommission, balance, settlementHistory, onOpenSettlementModal }: WalletViewProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">المحفظة المالية</h2>
      <div className="bg-gray-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">عمولة الشركة المستحقة</p>
          <h3 className="text-4xl font-black">{companyCommission.toLocaleString()} <span className="text-lg font-bold">ج.م</span></h3>
          <button onClick={onOpenSettlementModal} className="mt-6 w-full bg-white/10 hover:bg-white/20 py-3 rounded-2xl text-xs font-bold transition-colors border border-white/10">طلب تسوية مديونية</button>
        </div>
      </div>
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10"><p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">مستحقات لدى الطيارين</p><h3 className="text-4xl font-black text-gray-900">{balance.toLocaleString()} <span className="text-lg font-bold text-gray-400">ج.م</span></h3></div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 pr-2">طلبات التسوية الأخيرة</h3>
        {settlementHistory.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-[32px] text-center border border-dashed border-gray-200">
            <p className="text-xs text-gray-400 font-bold">لا توجد طلبات تسوية سابقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {settlementHistory.map((s) => (
              <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.status === "تم السداد" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">تسوية مديونية</p>
                    <p className="text-[10px] text-gray-400 font-bold">{s.date}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-900">{s.amount} ج.م</p>
                  <p className={`text-[10px] font-bold ${s.status === "تم السداد" ? "text-green-600" : "text-orange-600"}`}>{s.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
