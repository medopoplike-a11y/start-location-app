"use client";

import { motion } from "framer-motion";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface SyncIndicatorProps {
  lastSync: Date;
  isSyncing?: boolean;
  onReset?: () => void;
  networkHealth?: {
    rtt: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  };
}

export const SyncIndicator = ({ lastSync, isSyncing = false, onReset, networkHealth }: SyncIndicatorProps) => {
  const [timeAgo, setTimeAgo] = useState("الآن");
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // V17.4.0: Stability — poll every 3s instead of 1s to reduce battery/CPU drain.
    // Add hysteresis: only flip to "disconnected" after 8 consecutive seconds of being
    // disconnected, so brief network blips don't flash the red indicator.
    let consecutiveDisconnectMs = 0;
    const POLL_MS = 3000;
    const DISCONNECT_THRESHOLD_MS = 8000;

    const interval = setInterval(() => {
      const seconds = Math.floor((new Date().getTime() - lastSync.getTime()) / 1000);
      if (seconds < 5) setTimeAgo("الآن");
      else if (seconds < 60) setTimeAgo(`منذ ${seconds} ثانية`);
      else setTimeAgo(`منذ ${Math.floor(seconds / 60)} دقيقة`);

      const live = supabase.realtime.isConnected();
      if (live) {
        consecutiveDisconnectMs = 0;
        setIsConnected(true);
      } else {
        consecutiveDisconnectMs += POLL_MS;
        if (consecutiveDisconnectMs >= DISCONNECT_THRESHOLD_MS) {
          setIsConnected(false);
        }
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [lastSync]);

  return (
    <div 
      onClick={onReset}
      className={`flex items-center gap-2 px-3 py-1.5 backdrop-blur-sm rounded-full border shadow-sm transition-all ${
        !isConnected ? 'bg-red-50 border-red-100' : 'bg-gray-50/50 border-gray-100'
      } ${onReset ? 'cursor-pointer active:scale-95' : ''}`}
      title={onReset ? "اضغط لإعادة تعيين التزامن" : ""}
    >
      <motion.div
        animate={isSyncing ? { rotate: 360 } : {}}
        transition={isSyncing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
      >
        {isConnected ? (
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'text-blue-500' : 'text-gray-400'}`} />
        ) : (
          <WifiOff className="w-3 h-3 text-red-500 animate-pulse" />
        )}
      </motion.div>
      <span className={`text-[10px] font-bold whitespace-nowrap ${!isConnected ? 'text-red-600' : 'text-gray-500'}`}>
        {!isConnected ? "انقطع الاتصال" : isSyncing ? "جاري التزامن..." : `تزامن ${timeAgo}`}
      </span>

      {isConnected && networkHealth && networkHealth.quality !== 'unknown' && (
        <div className="flex gap-0.5 items-end h-2 ml-1" title={`RTT: ${networkHealth.rtt}ms`}>
          {[1, 2, 3, 4].map((bar) => {
            const isActive = 
              (networkHealth.quality === 'excellent') ||
              (networkHealth.quality === 'good' && bar <= 3) ||
              (networkHealth.quality === 'fair' && bar <= 2) ||
              (networkHealth.quality === 'poor' && bar <= 1);
            
            return (
              <div 
                key={bar}
                className={`w-0.5 rounded-full transition-all ${
                  isActive 
                    ? networkHealth.quality === 'poor' ? 'bg-amber-400' : 'bg-emerald-500' 
                    : 'bg-gray-200'
                }`}
                style={{ height: `${bar * 25}%` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
