"use client";

import { Power, Menu, RefreshCw } from "lucide-react";
import { SyncIndicator } from "@/components/SyncIndicator";
import { motion } from "framer-motion";

interface DriverHeaderProps {
  driverName: string;
  lastSyncTime: Date;
  isRefreshing: boolean;
  isActive: boolean;
  onOpenDrawer: () => void;
  onToggleActive: () => void;
  onSync: () => void;
}

export default function DriverHeader({
  driverName,
  lastSyncTime,
  isRefreshing,
  isActive,
  onOpenDrawer,
  onToggleActive,
  onSync,
}: DriverHeaderProps) {
  return (
    <header className="bg-white/70 backdrop-blur-2xl p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between sticky top-0 z-40 border-b border-slate-100/50">
      <div className="flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onOpenDrawer}
          className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 shadow-sm text-slate-900"
        >
          <Menu className="w-5 h-5" />
        </motion.button>
        <div className="flex flex-col">
          <h1 className="text-xs font-black text-slate-900 leading-tight tracking-tight uppercase">Start Location</h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-bold text-slate-500 truncate max-w-[100px]">{driverName}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden xs:block">
          <SyncIndicator lastSync={lastSyncTime} isSyncing={isRefreshing} />
        </div>

        <motion.button
          whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={onSync}
          disabled={isRefreshing}
          title="إعادة التزامن"
          className="p-2.5 bg-sky-50 hover:bg-sky-100 rounded-2xl transition-all border border-sky-100 text-sky-600 disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </motion.button>

        <div className="h-8 w-[1px] bg-slate-100 mx-1" />

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleActive}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all shadow-sm ${
            isActive
              ? "bg-green-500 text-white border-green-600 shadow-green-100"
              : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
          }`}
        >
          <Power className={`w-3.5 h-3.5 ${isActive ? "animate-pulse" : ""}`} />
          <span className="font-black text-[10px] uppercase tracking-wider">{isActive ? "Online" : "Offline"}</span>
        </motion.button>
      </div>
    </header>
  );
}
