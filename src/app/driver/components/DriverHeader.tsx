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
      <header className="fixed top-0 left-0 right-0 z-[1001] flex items-center justify-between pointer-events-none p-2 pt-[env(safe-area-inset-top,8px)]">
        <div className="pointer-events-auto">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenDrawer}
            className="p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-xl border border-white/20 dark:border-slate-800 shadow-md text-slate-900 dark:text-slate-100"
          >
            <Menu className="w-4 h-4" />
          </motion.button>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-[1001] flex items-center justify-between gap-1 pointer-events-none p-3 pt-[env(safe-area-inset-top,12px)]">
      {/* Left side: Menu and Profile (Floating Card) */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenDrawer}
          className="p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-xl border border-white/20 dark:border-slate-800/50 shadow-lg text-slate-900 dark:text-slate-100"
        >
          <Menu className="w-4.5 h-4.5" />
        </motion.button>
        
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-1 px-2.5 rounded-xl border border-white/20 dark:border-slate-800/50 shadow-lg flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <h1 className="text-[9px] font-black text-slate-900 dark:text-white leading-none tracking-tight uppercase italic">Start</h1>
              <span className="bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-[6px] font-black px-1 py-0.5 rounded border border-blue-600/10 dark:border-blue-500/20">V19.6.6</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 truncate max-w-[60px] leading-none tracking-tight">{driverName}</p>
              <RatingBadge rating={rating} count={ratingCount} size="xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Controls (Floating Card) */}
      <div className="flex items-center gap-1 pointer-events-auto">
        {/* Auto Accept Toggle */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleAutoAccept}
          className={`p-2 rounded-xl backdrop-blur-2xl border shadow-lg transition-all ${
            autoAccept 
            ? "bg-amber-500 text-white border-amber-400 shadow-amber-200/20" 
            : "bg-white/90 dark:bg-slate-900/90 text-slate-400 dark:text-slate-500 border-white/20 dark:border-slate-800/50 shadow-slate-200/10"
          }`}
        >
          {autoAccept ? <Zap className="w-3.5 h-3.5 fill-current" /> : <ZapOff className="w-3.5 h-3.5" />}
        </motion.button>

        {/* Combined Sync Controls */}
        <div className="flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-xl border border-white/20 dark:border-slate-800/50 shadow-lg overflow-hidden">
          <div className="px-1.5 py-0.5 scale-75">
            <SyncIndicator 
              lastSync={lastSyncTime} 
              isSyncing={isRefreshing} 
              networkHealth={networkHealth} 
              onReset={() => {
                import("@/lib/supabaseClient").then(({ forceReconnectRealtime }) => {
                  forceReconnectRealtime(true);
                  onSync();
                });
              }}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSync}
            disabled={isRefreshing}
            className="p-2 text-sky-600 dark:text-sky-400 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </motion.button>
        </div>

        {/* Online/Offline Toggle */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleActive}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border transition-all shadow-lg backdrop-blur-2xl ${
            isActive
              ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-200/20"
              : "bg-white/90 dark:bg-slate-900/90 text-slate-400 dark:text-slate-500 border-white/20 dark:border-slate-800/50 shadow-slate-200/10"
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white animate-pulse shadow-[0_0_6px_rgba(255,255,255,0.8)]" : "bg-slate-300 dark:bg-slate-700"}`} />
          <span className="font-black text-[8px] uppercase tracking-wider">{isActive ? "ON" : "OFF"}</span>
          <Power className={`w-3 h-3 ${isActive ? "opacity-100" : "opacity-40"}`} />
        </motion.button>
      </div>
    </header>
  );
}

export default memo(DriverHeader);
