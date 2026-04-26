"use client";

import { useState, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Search, 
  Filter, 
  Activity, 
  History, 
  Plus, 
  Calendar,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Truck
} from "lucide-react";
import OrdersView from "./OrdersView";
import OrderHistoryView from "./OrderHistoryView";
import type { LiveOrderItem, ActivityItem, AdminOrder } from "../types";

interface OrderManagementHubProps {
  liveOrders: LiveOrderItem[];
  allOrders: AdminOrder[];
  activities: ActivityItem[];
  onlineDrivers?: any[];
  onCancelOrder: (orderId: string) => Promise<void>;
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onCreateOrder?: () => void;
  onRefreshData?: () => void;
}

const OrderManagementHub = memo(function OrderManagementHub({
  liveOrders,
  allOrders,
  activities,
  onlineDrivers = [],
  onCancelOrder,
  onUpdateStatus,
  onDeleteOrder,
  onCreateOrder,
  onRefreshData
}: OrderManagementHubProps) {
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");
  const [searchQuery, setSearchQuery] = useState("");

  const pendingCount = useMemo(() => allOrders.filter(o => o.status === 'pending').length, [allOrders]);
  const inTransitCount = useMemo(() => allOrders.filter(o => o.status === 'in_transit' || o.status === 'assigned').length, [allOrders]);

  return (
    <div className="space-y-6">
      {/* Top Header & Stats */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-blue-600/20">
              <FileText size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">إدارة الطلبات الشاملة</h2>
              <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-[0.2em]">Unified Order Management Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700">
            <div className="text-center px-4">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-1">بانتظار التعيين</p>
               <p className="text-2xl font-black text-amber-500">{pendingCount}</p>
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
            <div className="text-center px-4">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-1">قيد التوصيل</p>
               <p className="text-2xl font-black text-sky-500">{inTransitCount}</p>
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
            <div className="text-center px-4">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي اليوم</p>
               <p className="text-2xl font-black text-slate-900 dark:text-white">{allOrders.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 w-fit shadow-sm overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("live")}
            className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === "live"
                ? "bg-slate-900 dark:bg-slate-800 text-white shadow-xl"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Activity className="w-4 h-4" />
            الطلبات النشطة
            {liveOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-lg text-[9px] ${activeTab === "live" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                {liveOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === "history"
                ? "bg-slate-900 dark:bg-slate-800 text-white shadow-xl"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <History className="w-4 h-4" />
            سجل العمليات
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الطلب أو العميل..."
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pr-10 pl-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 w-64 transition-all shadow-sm"
            />
          </div>
          <button onClick={onCreateOrder} className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-[600px]"
        >
          {activeTab === "live" ? (
            <OrdersView 
              liveOrders={liveOrders.filter(o => o.customer.toLowerCase().includes(searchQuery.toLowerCase()) || o.id_full.includes(searchQuery))} 
              activities={activities}
              onlineDrivers={onlineDrivers}
              onCancelOrder={onCancelOrder}
              onUpdateStatus={onUpdateStatus}
            />
          ) : (
            <OrderHistoryView
              orders={allOrders.filter(o => (o.customer_details?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || o.id.includes(searchQuery))}
              onDeleteOrder={onDeleteOrder}
              onEditOrder={() => alert("يرجى تعديل الطلبات النشطة من قائمة العمليات")}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

export default OrderManagementHub;
