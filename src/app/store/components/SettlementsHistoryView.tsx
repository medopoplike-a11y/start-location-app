"use client";

import { useState } from "react";
import { Wallet, CheckCircle, Clock, History, TrendingDown, Banknote } from "lucide-react";
import type { SettlementHistoryItem } from "../types";

interface SettlementsHistoryViewProps {
  settlements: SettlementHistoryItem[];
}

type FilterPeriod = "today" | "15days" | "month";

export default function SettlementsHistoryView({ settlements }: SettlementsHistoryViewProps) {
  const [filter, setFilter] = useState<FilterPeriod>("15days");

  const filterLabels: Record<FilterPeriod, string> = {
    today: "اليوم",
    "15days": "١٥ يوم",
    month: "الشهر",
  };

  const now = new Date();
  const filtered = (settlements || []).filter((s) => {
    if (!s.date) return true;
    const parts = s.date.split('/'); // DD/MM/YYYY or similar from toLocaleDateString
    // This is a bit fragile due to locale, but let's assume standard ISO or consistent local
    const d = new Date(s.date); 
    if (filter === "today") return d.toDateString() === now.toDateString();
    if (filter === "15days") { const ago = new Date(now); ago.setDate(ago.getDate() - 15); return d >= ago; }
    const ago = new Date(now); ago.setDate(ago.getDate() - 30); return d >= ago;
  });

  const totalPaid = (settlements || [])
    .filter(s => s.status === "تم السداد")
    .reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">سجل التسويات</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-[20px] p-4 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-[9px] font-bold text-emerald-600 uppercase">إجمالي المسدد</p>
          <p className="text-xl font-black text-emerald-700">{totalPaid.toLocaleString()} ج.م</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-[20px] p-4 text-center">
          <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-[9px] font-bold text-amber-600 uppercase">قيد الانتظار</p>
          <p className="text-xl font-black text-amber-700">
            {(settlements || []).filter(s => s.status === "جاري المراجعة").length} طلب
          </p>
        </div>
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

      {filtered.length === 0 ? (
        <div className="bg-gray-50 p-12 rounded-[32px] text-center border border-dashed border-gray-200">
          <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-xs text-gray-400 font-bold">لا توجد طلبات تسوية في هذه الفترة</p>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white p-5 rounded-[24px] border border-gray-100 flex items-center justify-between shadow-sm hover:border-brand-orange/20 transition-all group">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                    s.status === "تم السداد" 
                      ? "bg-green-50 text-green-600 border-green-100 group-hover:bg-green-100" 
                      : s.status === "مرفوض"
                      ? "bg-red-50 text-red-600 border-red-100"
                      : "bg-orange-50 text-orange-600 border-orange-100 group-hover:bg-orange-100"
                  }`}
                >
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">سداد مديونية الشركة</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-gray-400 font-bold">{s.date}</p>
                    <span className="text-[8px] text-gray-200">•</span>
                    <p className="text-[10px] text-gray-300 font-medium">#{s.id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
              <div className="text-left">
                <p className="text-base font-black text-gray-900 tabular-nums">{s.amount.toLocaleString()} ج.م</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    s.status === "تم السداد" ? "bg-green-500" : s.status === "مرفوض" ? "bg-red-500" : "bg-orange-500 animate-pulse"
                  }`} />
                  <p className={`text-[10px] font-black ${
                    s.status === "تم السداد" ? "text-green-600" : s.status === "مرفوض" ? "text-red-600" : "text-orange-600"
                  }`}>
                    {s.status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
