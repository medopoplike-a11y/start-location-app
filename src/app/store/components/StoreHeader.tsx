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
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl h-20 px-4 shadow-lg shadow-slate-200/20 dark:shadow-none flex items-center justify-between sticky top-0 z-40 border-b border-white/20 dark:border-slate-800/50 transition-all duration-500">
      <div className="flex items-center gap-3">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            triggerHaptic();
            onOpenDrawer();
          }}
          className="p-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-100 dark:border-slate-700 shadow-sm"
        >
          <Menu className="w-5 h-5 text-slate-900 dark:text-slate-100" />
        </motion.button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black text-slate-900 dark:text-white leading-none tracking-tight">{vendorName}</h1>
            {isSurgeActive && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-md animate-pulse"
              >
                <Zap className="w-2 h-2 fill-current" />
                SURGE
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <Store className="w-2.5 h-2.5" />
              لوحة التحكم V19.5.2
            </span>
            <RatingBadge rating={rating} count={ratingCount} size="xs" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="scale-90 origin-right">
          <SyncIndicator lastSync={lastSync} isSyncing={isSyncing} onReset={onResetSync} networkHealth={networkHealth} />
        </div>

        <div className="h-6 w-px bg-slate-100 dark:bg-slate-800 mx-0.5" />

        <ThemeToggle />
        
        {onOpenAI && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onOpenAI();
            }}
            className="p-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl transition-all border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-sm relative"
          >
            <Bot className="w-4.5 h-4.5" />
            <div className="absolute -top-0.5 -right-0.5">
              <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
            </div>
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={() => {
            triggerHaptic();
            onSync();
          }}
          disabled={isSyncing}
          title="إعادة التزامن"
          className="p-2 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-xl transition-all border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 disabled:opacity-40 shadow-sm"
        >
          <RefreshCw className={`w-4.5 h-4.5 ${isSyncing ? "animate-spin" : ""}`} />
        </motion.button>

        <div className="relative group hidden lg:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-slate-100/50 dark:bg-slate-800/50 pr-9 pl-3 py-2 rounded-xl text-[12px] font-bold border-none outline-none focus:ring-2 ring-indigo-500/20 w-32 focus:w-48 transition-all duration-300 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>
    </header>
  );
}
