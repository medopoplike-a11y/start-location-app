"use client";

import { Power, Menu, RefreshCw, Zap, ZapOff } from "lucide-react";
import { SyncIndicator } from "@/components/SyncIndicator";
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
  autoAccept: boolean;
  onToggleAutoAccept: () => void;
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
  autoAccept,
  onToggleAutoAccept,
  activeView = "orders", // V0.9.91: Hide controls in wallet view to prevent overlap
}: DriverHeaderProps & { activeView?: string }) {
  // Only show floating controls in orders/map view to prevent overlapping with wallet/settings headers
  if (activeView === "wallet" || activeView === "settings") {
    return (
      <header className="fixed top-4 left-4 right-4 z-[1001] flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenDrawer}
            className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all border border-white/20 dark:border-slate-800 shadow-xl text-slate-900 dark:text-slate-100"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-4 left-4 right-4 z-[1001] flex items-center justify-between gap-2 pointer-events-none">
      {/* Left side: Menu and Profile (Floating Card) */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onOpenDrawer}
          className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all border border-white/20 dark:border-slate-800 shadow-xl text-slate-900 dark:text-slate-100"
        >
          <Menu className="w-5 h-5" />
        </motion.button>
        
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-2 px-3 rounded-2xl border border-white/20 dark:border-slate-800 shadow-xl flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[10px] font-black text-slate-900 dark:text-slate-100 leading-none tracking-tight uppercase">Start</h1>
              <span className="text-[7px] font-black text-blue-500/60 dark:text-blue-400/60">V1.0.0</span>
              {isSurgeActive && (
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[70px] leading-none">{driverName}</p>
              <RatingBadge rating={rating} count={ratingCount} size="xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Controls (Floating Card) */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Auto Accept Toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleAutoAccept}
          className={`p-3 rounded-2xl backdrop-blur-xl border shadow-xl transition-all ${
            autoAccept 
            ? "bg-amber-500 text-white border-amber-400" 
            : "bg-white/90 dark:bg-slate-900/90 text-slate-400 border-white/20 dark:border-slate-800"
          }`}
          title={autoAccept ? "القبول التلقائي نشط" : "القبول التلقائي معطل"}
        >
          {autoAccept ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
        </motion.button>

        {/* Sync Button */}
        <motion.button
          whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={onSync}
          disabled={isRefreshing}
          className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all border border-white/20 dark:border-slate-800 shadow-xl text-sky-600 dark:text-sky-400 disabled:opacity-40"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </motion.button>

        {/* Online/Offline Toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleActive}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all shadow-xl backdrop-blur-xl ${
            isActive
              ? "bg-green-500 text-white border-green-400"
              : "bg-white/90 dark:bg-slate-900/90 text-slate-400 dark:text-slate-500 border-white/20 dark:border-slate-800"
          }`}
        >
          <Power className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />
          <span className="font-black text-[11px] uppercase tracking-wider">{isActive ? "On" : "Off"}</span>
        </motion.button>
      </div>
    </header>
  );
}
