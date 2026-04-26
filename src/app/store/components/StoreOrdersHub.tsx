"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListFilter, History, Search, Plus, Activity, Sparkles } from "lucide-react";
import StoreView from "./StoreView";
import HistoryView from "./HistoryView";
import AIInsightsPanel from "./AIInsightsPanel";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import type { Order, OnlineDriver, VendorLocation } from "../types";

interface StoreOrdersHubProps {
  orders: Order[];
  searchQuery: string;
  activeTab: string;
  activityLog: { id: string; text: string; time: string }[];
  balance: number;
  onlineDrivers: OnlineDriver[];
  companyCommission: number;
  showLiveMap: boolean;
  vendorLocation: VendorLocation | null;
  vendorId: string | null;
  vendorName: string;
  onSetActiveTab: (tab: string) => void;
  onCollectDebt: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  onEditOrder: (order: Order | null) => void;
  onQuickInvoiceUpload?: (order: Order) => void;
  onPreviewImage?: (url: string) => void;
  onRequestAIInsights?: () => void;
  uploadingInvoice?: boolean;
  quickUploadOrderId?: string | null;
  isSyncing?: boolean;
  lastSync?: Date;
}

const StoreOrdersHub = memo(function StoreOrdersHub({
  orders,
  searchQuery,
  activeTab,
  activityLog,
  balance,
  onlineDrivers,
  companyCommission,
  showLiveMap,
  vendorLocation,
  vendorId,
  vendorName,
  onSetActiveTab,
  onCollectDebt,
  onCancelOrder,
  onEditOrder,
  onQuickInvoiceUpload,
  onPreviewImage,
  onRequestAIInsights,
  uploadingInvoice,
  quickUploadOrderId,
  isSyncing,
  lastSync
}: StoreOrdersHubProps) {
  const [viewMode, setViewMode] = useState<"active" | "history">("active");

  const activeOrders = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");
  const historyOrders = orders.filter(o => o.status === "delivered" || o.status === "cancelled");

  return (
    <div className="space-y-6">
      {/* V19.3.0: AI Performance Insights */}
      {viewMode === "active" && (
        <AIInsightsPanel orders={orders} vendorName={vendorName} />
      )}

      {/* View Switcher */}
      <div className="flex items-center justify-between gap-6">
        <div className="flex p-2 bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-100 dark:border-slate-800/50 rounded-[32px] w-fit shadow-2xl shadow-slate-200/20 dark:shadow-none">
          <button
            onClick={() => setViewMode("active")}
            className={`flex items-center gap-3 px-8 py-4 rounded-[24px] text-[11px] font-black transition-all uppercase tracking-widest ${
              viewMode === "active"
                ? "bg-slate-900 dark:bg-slate-800 text-white shadow-xl shadow-slate-900/20 dark:shadow-none"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <ListFilter className="w-4 h-4" />
            الطلبات الحالية
            {activeOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] ${viewMode === "active" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`flex items-center gap-3 px-8 py-4 rounded-[24px] text-[11px] font-black transition-all uppercase tracking-widest ${
              viewMode === "history"
                ? "bg-slate-900 dark:bg-slate-800 text-white shadow-xl shadow-slate-900/20 dark:shadow-none"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <History className="w-4 h-4" />
            سجل الطلبات
          </button>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-3 px-5 py-3 bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-100/50 dark:border-slate-800/50 rounded-[24px] shadow-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em]">Live Monitor</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {viewMode === "active" ? (
            <StoreView
              orders={orders}
              searchQuery={searchQuery}
              activeTab={activeTab}
              activityLog={activityLog}
              balance={balance}
              onlineDrivers={onlineDrivers}
              companyCommission={companyCommission}
              showLiveMap={showLiveMap}
              vendorLocation={vendorLocation}
              vendorId={vendorId}
              vendorName={vendorName}
              onSetActiveTab={onSetActiveTab}
              onCollectDebt={onCollectDebt}
              onCancelOrder={onCancelOrder}
              onEditOrder={onEditOrder}
              onQuickInvoiceUpload={onQuickInvoiceUpload}
              uploadingInvoice={uploadingInvoice}
              quickUploadOrderId={quickUploadOrderId}
              onPreviewImage={onPreviewImage}
              onRequestAIInsights={onRequestAIInsights}
              isSyncing={isSyncing}
              lastSync={lastSync}
            />
          ) : (
            <HistoryView 
              orders={orders} 
              onPreviewImage={onPreviewImage}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

export default StoreOrdersHub;
