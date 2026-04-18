"use client";

import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { SyncIndicator } from "@/components/SyncIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { Menu, RefreshCw, Search, Bot } from "lucide-react";
import RatingBadge from "@/components/RatingBadge";

interface StoreHeaderProps {
  vendorName: string;
  lastSync: Date;
  isSyncing: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenDrawer: () => void;
  onSync: () => void;
  onResetSync?: () => void;
  isSurgeActive?: boolean;
  rating?: number;
  ratingCount?: number;
  onOpenAI?: () => void; // V1.5.9: AI Help trigger
}

export default function StoreHeader({ 
  vendorName, 
  lastSync, 
  isSyncing, 
  searchQuery, 
  onSearchChange, 
  onOpenDrawer, 
  onSync, 
  onResetSync, 
  isSurgeActive = false,
  rating = 0,
  ratingCount = 0,
  onOpenAI
}: StoreHeaderProps) {
  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style }).catch(() => {});
      }
    } catch (e) {}
  };

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl h-20 px-4 shadow-sm flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => {
            triggerHaptic();
            onOpenDrawer();
          }}
          className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-all border border-gray-100 dark:border-slate-700"
        >
          <Menu className="w-5 h-5 text-gray-900 dark:text-slate-100" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight">{vendorName}</h1>
            {isSurgeActive && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 animate-bounce"
              >
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                SURGE
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-gray-400 dark:text-slate-500">لوحة تحكم المحل</p>
            <RatingBadge rating={rating} count={ratingCount} size="sm" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SyncIndicator lastSync={lastSync} isSyncing={isSyncing} onReset={onResetSync} />

        <ThemeToggle />

        {/* V1.5.9: AI Helper for Store */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            triggerHaptic();
            onOpenAI?.();
          }}
          className="p-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl transition-all border border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400"
        >
          <Bot className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={() => {
            triggerHaptic();
            onSync();
          }}
          disabled={isSyncing}
          title="إعادة التزامن"
          className="p-2 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-xl transition-all border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
        </motion.button>

        <div className="relative group hidden sm:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-gray-100 dark:bg-slate-800 pr-9 pl-3 py-2 rounded-xl text-xs border-none outline-none focus:ring-2 ring-orange-500/20 w-32 transition-all dark:text-slate-100"
          />
        </div>
      </div>
    </header>
  );
}
