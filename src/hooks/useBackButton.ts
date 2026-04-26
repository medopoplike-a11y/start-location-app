"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Hook to handle hardware back button on Android/Capacitor.
 * When enabled, the provided callback will be called when the user presses the back button.
 */
export const useBackButton = (callback: () => void, enabled: boolean = true) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !enabled) return;

    // Register handler
    if (!(window as any)._backButtonHandlers) {
      (window as any)._backButtonHandlers = [];
    }
    
    const handler = () => {
      callback();
    };

    (window as any)._backButtonHandlers.push(handler);

    return () => {
      // Unregister handler
      const handlers = (window as any)._backButtonHandlers || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }, [callback, enabled]);
};
