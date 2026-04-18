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
  onOpenAIHelp?: () => void; // V1.5.9: AI Help trigger
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
  onOpenAIHelp,
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
        
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-1.5 px-2.5 rounded-2xl border border-white/20 dark:border-slate-800 shadow-xl flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <h1 className="text-[9px] font-black text-slate-900 dark:text-slate-100 leading-none tracking-tight uppercase">Start</h1>
              <span className="text-[6px] font-black text-blue-500/60 dark:text-blue-400/60">V1.0</span>
              {isSurgeActive && (
                <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[60px] leading-none">{driverName}</p>
              <RatingBadge rating={rating} count={ratingCount} size="xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Controls (Floating Card) */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* V1.5.9: AI Bot Trigger */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onOpenAIHelp}
          className="p-2.5 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/20 border border-purple-500"
        >
          <Bot className="w-4 h-4" />
        </motion.button>

        {/* Auto Accept Toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleAutoAccept}
          className={`p-2.5 rounded-xl backdrop-blur-xl border shadow-lg transition-all ${
            autoAccept 
            ? "bg-amber-500 text-white border-amber-400" 
            : "bg-white/90 dark:bg-slate-900/90 text-slate-400 border-white/20 dark:border-slate-800"
          }`}
        >
          {autoAccept ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
        </motion.button>

        {/* Combined Sync Controls */}
        <div className="flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-xl border border-white/20 dark:border-slate-800 shadow-lg overflow-hidden">
          <div className="px-1.5 py-1 border-l border-white/10 dark:border-slate-800">
            <SyncIndicator lastSync={lastSyncTime} isSyncing={isRefreshing} />
          </div>
          <motion.button
            whileTap={{ scale: 0.9, rotate: 180 }}
            onClick={onSync}
            disabled={isRefreshing}
            className="p-2.5 text-sky-600 dark:text-sky-400 disabled:opacity-40 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </motion.button>
        </div>

        {/* Online/Offline Toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleActive}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all shadow-lg backdrop-blur-xl ${
            isActive
              ? "bg-green-500 text-white border-green-400"
              : "bg-white/90 dark:bg-slate-900/90 text-slate-400 dark:text-slate-500 border-white/20 dark:border-slate-800"
          }`}
        >
          <Power className={`w-3.5 h-3.5 ${isActive ? "animate-pulse" : ""}`} />
          <span className="font-black text-[10px] uppercase tracking-wider">{isActive ? "On" : "Off"}</span>
        </motion.button>
      </div>
    </header>
  );
}
