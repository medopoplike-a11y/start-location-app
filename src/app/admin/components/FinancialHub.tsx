"use client";

import { useState, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, 
  Wallet, 
  FileText, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  RefreshCcw,
  CheckCircle,
  XCircle,
  Calendar
} from "lucide-react";
import SettlementsView from "./SettlementsView";
import ReportsView from "./ReportsView";
import type { SettlementItem, AdminOrder } from "../types";

interface FinancialHubProps {
  settlements: SettlementItem[];
  allOrders: AdminOrder[];
  onSettlementAction: (settlementId: string, newStatus: "approved" | "rejected") => void;
  onRefresh?: () => void;
}

const FinancialHub = memo(function FinancialHub({
  settlements,
  allOrders,
  onSettlementAction,
  onRefresh
}: FinancialHubProps) {
  const [activeTab, setActiveTab] = useState<"settlements" | "reports">("settlements");

  const settlementCount = useMemo(() => settlements.length, [settlements]);
  const orderCount = useMemo(() => allOrders.length, [allOrders]);

  return (
    <div className="space-y-6">
      {/* Top Header & Summary */}
      <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-emerald-500 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
              <TrendingUp size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black">المركز المالي الشامل</h2>
              <p className="text-[11px] text-white/40 font-bold mt-1 uppercase tracking-[0.2em]">Unified Financial Hub & Settlements</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <button onClick={onRefresh} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
                <RefreshCcw size={20} className="text-emerald-400" />
             </button>
             <div className="flex gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                   <p className="text-[10px] font-black text-white/40 uppercase mb-1">تسويات معلقة</p>
                   <p className="text-xl font-black text-amber-400">{settlementCount}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                   <p className="text-[10px] font-black text-white/40 uppercase mb-1">إجمالي طلبات النظام</p>
                   <p className="text-xl font-black text-emerald-400">{orderCount}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 w-fit shadow-sm overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("settlements")}
          className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === "settlements"
              ? "bg-slate-900 dark:bg-slate-800 text-white shadow-xl"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <Wallet className="w-4 h-4" />
          تأكيد التسويات المالية
          {settlementCount > 0 && (
             <span className={`px-2 py-0.5 rounded-lg text-[9px] ${activeTab === "settlements" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                {settlementCount}
             </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === "reports"
              ? "bg-slate-900 dark:bg-slate-800 text-white shadow-xl"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          التقارير والإحصائيات
        </button>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-[500px]"
        >
          {activeTab === "settlements" ? (
            <SettlementsView 
              settlements={settlements} 
              onSettlementAction={onSettlementAction} 
            />
          ) : (
            <ReportsView allOrders={allOrders} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

export default FinancialHub;
