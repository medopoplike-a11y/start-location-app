"use client";

import * as React from "react";
import { NativeBridge } from "./NativeBridge";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { Capacitor } from "@capacitor/core";
import { motion, AnimatePresence } from "framer-motion";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  useDynamicTheme(); // V19.3.0: Enable auto-theme logic

  React.useEffect(() => {
    const init = async () => {
      try {
        // Only initialize SQLite on native platforms, and do it with extreme safety
        if (Capacitor.isNativePlatform()) {
          try {
            const { dbService } = await import("@/lib/db-service");
            await dbService.initialize();
            console.log("✅ AppWrapper: SQLite initialized and ready");
          } catch (sqliteError) {
            console.warn("⚠️ AppWrapper: SQLite optional initialization skipped", sqliteError);
          }
        }
      } catch (e) {
        console.error("❌ AppWrapper: General init error (safe to continue)", e);
      }
      
      setMounted(true);
    };
    
    init();

    // V19.6.1: Global Activity Monitor (Ultra-Safe Version)
    const setupAppStateListener = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      try {
        const { App } = await import('@capacitor/app');
        const { forceReconnectRealtime } = await import("@/lib/supabaseClient");
        const { dbService } = await import("@/lib/db-service");

        const handleAppStateChange = async (state: any) => {
          if (state.isActive) {
            console.log("[AppWrapperV20.0.0] App returned to foreground");
            try {
              await forceReconnectRealtime(true);
              try {
                await dbService.syncFromRemote();
              } catch (syncError) {
                console.warn("⚠️ Sync from remote skipped", syncError);
              }
              try {
                window.dispatchEvent(new CustomEvent('app-resume-sync', { 
                  detail: { source: 'app_resume_start', isHardSync: true } 
                }));
              } catch (eventError) {
                console.warn("⚠️ Event dispatch skipped", eventError);
              }
            } catch (e) {
              console.error("Failed to repair sync on resume (safe to continue)", e);
            }
          }
        };

        const listener = await App.addListener('appStateChange', handleAppStateChange);
        return listener;
      } catch (e) {
        console.warn("⚠️ App state listener setup failed", e);
        return null;
      }
    };

    let listener: any = null;
    setupAppStateListener().then(l => { listener = l; });

    return () => {
      if (listener?.remove) {
        try { listener.remove(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  if (!mounted) return (
    <div className="min-h-screen bg-white dark:bg-slate-950" />
  );

  return (
    <>
      <NativeBridge />
      <AnimatePresence mode="wait">
        <motion.div
          key="app-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
