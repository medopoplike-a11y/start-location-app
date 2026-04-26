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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">سجل التسويات</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-[20px] p-4 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mx-auto mb-1" />
          <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400/70 uppercase">إجمالي المسدد</p>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{totalPaid.toLocaleString()} ج.م</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-[20px] p-4 text-center">
          <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400 mx-auto mb-1" />
          <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400/70 uppercase">قيد الانتظار</p>
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">
            {(settlements || []).filter(s => s.status === "جاري المراجعة").length} طلب
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
        {(["today", "15days", "month"] as FilterPeriod[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${
              filter === f 
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm" 
                : "text-gray-400 dark:text-slate-500"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-gray-50 dark:bg-slate-900/50 p-12 rounded-[32px] text-center border border-dashed border-gray-200 dark:border-slate-800">
          <History className="w-10 h-10 text-gray-200 dark:text-slate-800 mx-auto mb-3" />
          <p className="text-xs text-gray-400 dark:text-slate-500 font-bold">لا توجد طلبات تسوية في هذه الفترة</p>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-gray-100 dark:border-slate-800 flex items-center justify-between shadow-sm hover:border-orange-500/20 dark:hover:border-orange-500/40 transition-all group">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                    s.status === "تم السداد" 
                      ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20 group-hover:bg-green-100 dark:group-hover:bg-green-500/20" 
                      : s.status === "مرفوض"
                      ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20"
                      : "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/20 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20"
                  }`}
                >
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">سداد مديونية الشركة</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">{s.date}</p>
                    <span className="text-[8px] text-gray-200 dark:text-slate-800">•</span>
                    <p className="text-[10px] text-gray-300 dark:text-slate-600 font-medium">#{s.id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
              <div className="text-left">
                <p className="text-base font-black text-gray-900 dark:text-white tabular-nums">{s.amount.toLocaleString()} ج.م</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    s.status === "تم السداد" ? "bg-green-500" : s.status === "مرفوض" ? "bg-red-500" : "bg-orange-500 animate-pulse"
                  }`} />
                  <p className={`text-[10px] font-black ${
                    s.status === "تم السداد" ? "text-green-600 dark:text-green-400" : s.status === "مرفوض" ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"
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
