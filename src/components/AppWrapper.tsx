"use client";

import * as React from "react";
import { NativeBridge } from "./NativeBridge";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { App } from '@capacitor/app';
import { forceReconnectRealtime } from "@/lib/supabaseClient";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  useDynamicTheme(); // V19.3.0: Enable auto-theme logic

  React.useEffect(() => {
    setMounted(true);

    // V19.6.1: Global Activity Monitor
    // Trigger a hard sync and socket repair when app returns from background
    const handleAppStateChange = async (state: any) => {
      if (state.isActive) {
        console.log("[AppWrapperV19.6.1] App returned to foreground. Repairing sync...");
        try {
          await forceReconnectRealtime(true);
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

  if (!mounted) return null;

  return (
    <>
      <NativeBridge />
      {children}
    </>
  );
}
