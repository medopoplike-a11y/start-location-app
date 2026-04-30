"use client";

import * as React from "react";
import { NativeBridge } from "./NativeBridge";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { App } from '@capacitor/app';
import { forceReconnectRealtime } from "@/lib/supabaseClient";
import { dbService } from "@/lib/db-service";
import { motion, AnimatePresence } from "framer-motion";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  useDynamicTheme(); // V19.3.0: Enable auto-theme logic

  React.useEffect(() => {
    const init = async () => {
      try {
        // Initialize SQLite database as the primary source of truth
        await dbService.initialize();
        console.log("✅ AppWrapper: SQLite initialized and ready");
      } catch (e) {
        console.error("❌ AppWrapper: SQLite initialization failed", e);
      }
      
      setMounted(true);
    };
    
    init();

    // V19.6.1: Global Activity Monitor
    // Trigger a hard sync and socket repair when app returns from background
    const handleAppStateChange = async (state: any) => {
      if (state.isActive) {
        console.log("[AppWrapperV19.6.1] App returned to foreground. Repairing sync...");
        try {
          await forceReconnectRealtime(true);
          // Trigger sync from remote to update SQLite
          await dbService.syncFromRemote();
          // Broadcast a custom event that useSync and pages can listen to
          window.dispatchEvent(new CustomEvent('app-resume-sync', { 
            detail: { source: 'app_resume_start', isHardSync: true } 
          }));
        } catch (e) {
          console.error("Failed to repair sync on resume:", e);
        }
      }
    };

    const listener = App.addListener('appStateChange', handleAppStateChange);

    return () => {
      listener.then(l => l.remove());
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
