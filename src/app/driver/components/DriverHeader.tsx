"use client";

import { Power, Menu, RefreshCw } from "lucide-react";
import { SyncIndicator } from "@/components/SyncIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import RatingBadge from "@/components/RatingBadge";

interface DriverHeaderProps {
  driverName: string;
  lastSyncTime: Date;
  isRefreshing: boolean;
  isActive: boolean;
  onOpenDrawer: () => void;
  onToggleActive: () => void;
  onSync: () => void;
  isSurgeActive?: boolean;
  rating?: number;
  ratingCount?: number;
}

export default function DriverHeader({
  driverName,
  lastSyncTime,
  isRefreshing,
  isActive,
  onOpenDrawer,
  onToggleActive,
  onSync,
  isSurgeActive = false,
  rating = 0,
  ratingCount = 0,
}: DriverHeaderProps) {
  return (
    <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between sticky top-0 z-40 border-b border-slate-100/50 dark:border-slate-800">
      <div className="flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onOpenDrawer}
          className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all border border-slate-100 dark:border-slate-700 shadow-sm text-slate-900 dark:text-slate-100"
        >
          <Menu className="w-5 h-5" />
        </motion.button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-black text-slate-900 dark:text-slate-100 leading-tight tracking-tight uppercase">Start Location</h1>
            {isSurgeActive && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 animate-bounce"
              >
                SURGE
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{driverName}</p>
            <RatingBadge rating={rating} count={ratingCount} size="sm" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden xs:block">
          <SyncIndicator lastSync={lastSyncTime} isSyncing={isRefreshing} />
        </div>

        <ThemeToggle />

        <motion.button
          whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={onSync}
          disabled={isRefreshing}
          title="إعادة التزامن"
          className="p-2.5 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-2xl transition-all border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </motion.button>

        <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800 mx-1" />

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleActive}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all shadow-sm ${
            isActive
              ? "bg-green-500 text-white border-green-600 shadow-green-100 dark:shadow-green-900/20"
              : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <Power className={`w-3.5 h-3.5 ${isActive ? "animate-pulse" : ""}`} />
          <span className="font-black text-[10px] uppercase tracking-wider">{isActive ? "Online" : "Offline"}</span>
        </motion.button>
      </div>
    </header>
  );
}
