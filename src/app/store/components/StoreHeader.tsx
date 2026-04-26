"use client";

import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { SyncIndicator } from "@/components/SyncIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { Menu, RefreshCw, Search, Bot, Zap, Store, Sparkles } from "lucide-react";
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
  networkHealth?: {
    rtt: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  };
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
  onOpenAI,
  networkHealth
}: StoreHeaderProps) {
  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style }).catch(() => {});
      }
    } catch (e) {}
  };

  return (
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl h-24 px-6 shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center justify-between sticky top-0 z-40 border-b border-white/20 dark:border-slate-800/50 transition-all duration-500">
      <div className="flex items-center gap-4">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            triggerHaptic();
            onOpenDrawer();
          }}
          className="p-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 rounded-[20px] transition-all border border-slate-100 dark:border-slate-700 shadow-sm"
        >
          <Menu className="w-6 h-6 text-slate-900 dark:text-slate-100" />
        </motion.button>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">{vendorName}</h1>
            {isSurgeActive && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-indigo-200 dark:shadow-none animate-pulse"
              >
                <Zap className="w-2.5 h-2.5 fill-current" />
                SURGE
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <Store className="w-3 h-3" />
              لوحة التحكم
            </span>
            <RatingBadge rating={rating} count={ratingCount} size="sm" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SyncIndicator lastSync={lastSync} isSyncing={isSyncing} onReset={onResetSync} networkHealth={networkHealth} />

        <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-1" />

        <ThemeToggle />
        
        {onOpenAI && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onOpenAI();
            }}
            className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-2xl transition-all border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none relative"
          >
            <Bot className="w-5 h-5" />
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            </div>
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={() => {
            triggerHaptic();
            onSync();
          }}
          disabled={isSyncing}
          title="إعادة التزامن"
          className="p-2.5 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-2xl transition-all border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 disabled:opacity-40 shadow-sm shadow-sky-100 dark:shadow-none"
        >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`} />
        </motion.button>

        <div className="relative group hidden md:block">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="بحث سريع..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-slate-100/50 dark:bg-slate-800/50 pr-11 pl-4 py-3 rounded-2xl text-[13px] font-bold border-none outline-none focus:ring-2 ring-indigo-500/20 w-48 focus:w-64 transition-all duration-300 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>
    </header>
  );
}
