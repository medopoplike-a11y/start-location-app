"use client";

import { useState, memo } from "react";
import { Power, Menu, RefreshCw, Zap, ZapOff, Bot } from "lucide-react";
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
  onOpenAIHelp?: () => void; // V1.5.9: AI Help trigger
  networkHealth?: {
    rtt: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  };
}

function DriverHeader({
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
  onOpenAIHelp,
  networkHealth,
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
    <header className="fixed top-5 left-5 right-5 z-[1001] flex items-center justify-between gap-3 pointer-events-none">
      {/* Left side: Menu and Profile (Floating Card) */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenDrawer}
          className="p-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl hover:bg-white dark:hover:bg-slate-800 rounded-[22px] transition-all border border-white/20 dark:border-slate-800/50 shadow-2xl shadow-slate-200/50 dark:shadow-none text-slate-900 dark:text-slate-100"
        >
          <Menu className="w-6 h-6" />
        </motion.button>
        
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-2 px-4 rounded-[22px] border border-white/20 dark:border-slate-800/50 shadow-2xl shadow-slate-200/50 dark:shadow-none flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[12px] font-black text-slate-900 dark:text-white leading-none tracking-tighter uppercase italic">Start</h1>
              <span className="bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-blue-600/10 dark:border-blue-500/20">V1.5.10</span>
              {isSurgeActive && (
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.6)]" 
                />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[12px] font-black text-slate-500 dark:text-slate-400 truncate max-w-[90px] leading-none tracking-tight">{driverName}</p>
              <RatingBadge rating={rating} count={ratingCount} size="xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Controls (Floating Card) */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Auto Accept Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleAutoAccept}
          className={`p-3.5 rounded-[22px] backdrop-blur-2xl border shadow-2xl transition-all ${
            autoAccept 
            ? "bg-amber-500 text-white border-amber-400 shadow-amber-200/50" 
            : "bg-white/90 dark:bg-slate-900/90 text-slate-400 dark:text-slate-500 border-white/20 dark:border-slate-800/50 shadow-slate-200/50 dark:shadow-none"
          }`}
        >
          {autoAccept ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
        </motion.button>

        {/* Combined Sync Controls */}
        <div className="flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[22px] border border-white/20 dark:border-slate-800/50 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <div className="px-3 py-1.5 border-l border-white/10 dark:border-slate-800">
            <SyncIndicator lastSync={lastSyncTime} isSyncing={isRefreshing} networkHealth={networkHealth} />
          </div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSync}
            disabled={isRefreshing}
            className="p-3.5 text-sky-600 dark:text-sky-400 disabled:opacity-40 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </motion.button>
        </div>

        {/* Online/Offline Toggle */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleActive}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-[24px] border transition-all shadow-2xl backdrop-blur-2xl ${
            isActive
              ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-200/50"
              : "bg-white/90 dark:bg-slate-900/90 text-slate-400 dark:text-slate-500 border-white/20 dark:border-slate-800/50 shadow-slate-200/50 dark:shadow-none"
          }`}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" : "bg-slate-300 dark:bg-slate-700"}`} />
          <span className="font-black text-[12px] uppercase tracking-[0.15em]">{isActive ? "Online" : "Offline"}</span>
          <Power className={`w-4 h-4 ${isActive ? "opacity-100" : "opacity-40"}`} />
        </motion.button>
      </div>
    </header>
  );
}

export default memo(DriverHeader);
