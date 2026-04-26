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
  quickUploadOrderId
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex p-1 bg-white/50 backdrop-blur-md border border-gray-100 rounded-2xl w-fit shadow-sm">
          <button
            onClick={() => setViewMode("active")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              viewMode === "active"
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ListFilter className="w-4 h-4" />
            الطلبات الحالية
            {activeOrders.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-lg text-[9px] ${viewMode === "active" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              viewMode === "history"
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="w-4 h-4" />
            سجل الطلبات
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Live Monitor</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        <motion.div
          key={viewMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
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
