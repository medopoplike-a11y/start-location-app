"use client";

import type { SettlementItem } from "../types";

interface SettlementsViewProps {
  settlements: SettlementItem[];
  onSettlementAction: (settlementId: string, newStatus: "approved" | "rejected") => void;
}

export default function SettlementsView({ settlements, onSettlementAction }: SettlementsViewProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm space-y-3">
      <h3 className="font-bold text-gray-900">طلبات التسوية</h3>
      {settlements.length === 0 ? <p className="text-sm text-gray-500">لا توجد تسويات معلقة.</p> : settlements.map((s) => (
        <div key={s.id} className="p-3 rounded-xl border border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-700">تسوية #{s.id.slice(0, 8)}</span>
          <div className="flex gap-2">
            <button onClick={() => onSettlementAction(s.id, "approved")} className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold">اعتماد</button>
            <button onClick={() => onSettlementAction(s.id, "rejected")} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold">رفض</button>
          </div>
        </div>
      ))}
    </div>
  );
}
