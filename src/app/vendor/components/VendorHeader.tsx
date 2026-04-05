"use client";

import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { SyncIndicator } from "@/components/SyncIndicator";
import { motion } from "framer-motion";

interface VendorHeaderProps {
  vendorName: string;
  lastSync: Date;
  isSyncing: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenDrawer: () => void;
  onSync: () => void;
}

export default function VendorHeader({ vendorName, lastSync, isSyncing, searchQuery, onSearchChange, onOpenDrawer, onSync }: VendorHeaderProps) {
  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style }).catch(() => {});
      }
    } catch (e) {}
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl p-4 shadow-sm flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => {
            triggerHaptic();
            onOpenDrawer();
          }}
          className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100"
        >
          <Menu className="w-5 h-5 text-gray-900" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-tight">{vendorName}</h1>
          <p className="text-[10px] text-gray-400">لوحة تحكم المحل</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SyncIndicator lastSync={lastSync} isSyncing={isSyncing} />

        <motion.button
          whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={() => {
            triggerHaptic();
            onSync();
          }}
          disabled={isSyncing}
          title="إعادة التزامن"
          className="p-2 bg-sky-50 hover:bg-sky-100 rounded-xl transition-all border border-sky-100 text-sky-600 disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
        </motion.button>

        <div className="relative group hidden sm:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-orange transition-colors" />
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-gray-100 pr-9 pl-3 py-2 rounded-xl text-xs border-none outline-none focus:ring-2 ring-brand-orange/20 w-32 transition-all"
          />
        </div>
      </div>
    </header>
  );
}
