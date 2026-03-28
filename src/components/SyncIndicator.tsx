"use client";

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface SyncIndicatorProps {
  lastSync: Date;
  isSyncing?: boolean;
}

export const SyncIndicator = ({ lastSync, isSyncing = false }: SyncIndicatorProps) => {
  const [timeAgo, setTimeAgo] = useState("الآن");

  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((new Date().getTime() - lastSync.getTime()) / 1000);
      if (seconds < 5) setTimeAgo("الآن");
      else if (seconds < 60) setTimeAgo(`منذ ${seconds} ثانية`);
      else setTimeAgo(`منذ ${Math.floor(seconds / 60)} دقيقة`);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSync]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 backdrop-blur-sm rounded-full border border-gray-100 shadow-sm">
      <motion.div
        animate={isSyncing ? { rotate: 360 } : {}}
        transition={isSyncing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'text-blue-500' : 'text-gray-400'}`} />
      </motion.div>
      <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
        {isSyncing ? "جاري التزامن..." : `تزامن ${timeAgo}`}
      </span>
    </div>
  );
};
