"use client";

import { motion } from "framer-motion";
import { Wallet, CheckCircle, XCircle, Clock } from "lucide-react";
import type { SettlementItem } from "../types";

interface SettlementsViewProps {
  settlements: SettlementItem[];
  onSettlementAction: (settlementId: string, newStatus: "approved" | "rejected") => void;
}

interface RichSettlement extends SettlementItem {
  amount?: number;
  status?: string;
  created_at?: string;
  profiles?: { full_name?: string; role?: string } | null;
  user_id?: string;
}

export default function SettlementsView({ settlements, onSettlementAction }: SettlementsViewProps) {
  const rich = settlements as RichSettlement[];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">تأكيد سداد المديونيات</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">{rich.length} طلب سداد معلق</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-2xl">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-black text-amber-600">{rich.length} بانتظار التأكيد</span>
        </div>
      </div>

      {rich.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-[32px] p-16 text-center">
          <Wallet className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-bold">لا توجد طلبات سداد معلقة</p>
          <p className="text-slate-300 text-xs mt-1">ستظهر هنا طلبات تأكيد سداد المديونية من المحلات والطيارين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rich.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm flex items-center justify-between gap-4 hover:border-slate-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-sm">{s.profiles?.full_name || "مستخدم"}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                      {s.profiles?.role === 'driver' ? 'طيار' : 'محل'}
                    </span>
                    <span className="text-[10px] font-black text-slate-400">#{s.id.slice(0, 8)}</span>
                    {s.amount != null && (
                      <span className="text-[11px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">{s.amount.toLocaleString()} ج.م</span>
                    )}
                    {s.created_at && (
                      <span className="text-[10px] text-slate-300 font-bold">{new Date(s.created_at).toLocaleDateString('ar-EG')}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => onSettlementAction(s.id, "approved")} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all">
                  <CheckCircle className="w-3.5 h-3.5" />
                  اعتماد
                </button>
                <button onClick={() => onSettlementAction(s.id, "rejected")} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all">
                  <XCircle className="w-3.5 h-3.5" />
                  رفض
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
