"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardStyle } from "@capacitor/keyboard";
import { useRouter, usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { checkForAutoUpdate, showNativeToast } from "@/lib/native-utils";
import { dbService } from "@/lib/db-service";

export const NativeBridge = () => {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = (typeof window !== 'undefined') ? (window as any)._pathnameRef : null;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)._pathnameRef = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    let backListener: any;
    // Initialize SQLite on boot
    if (Capacitor.isNativePlatform()) {
      dbService.initialize().catch(err => {
        console.error("NativeBridge: SQLite Init Failed", err);
      });
    }

    if (!Capacitor.isNativePlatform()) return;

    const setupNative = async () => {
      // V17.2.8: HARD RESET GUARD - Clear stale sessions on version upgrade
      // This prevents "Ghost Logins" and "Empty Systems" caused by Android Auto Backup
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value: lastBootVersion } = await Preferences.get({ key: 'app_last_boot_version' });
        const CURRENT_VERSION = "17.2.8";

        if (lastBootVersion !== CURRENT_VERSION) {
          console.log(`NativeBridge: [V17.2.8] New version detected (${lastBootVersion} -> ${CURRENT_VERSION}). Performing safety cleanup...`);
          
          // Only clear auth-related data to avoid losing important user settings
          const sessionKey = 'start-location-v1-session';
          await Preferences.remove({ key: sessionKey });
          const { keys } = await Preferences.keys();
          for (const key of keys) {
            if (key.includes('auth-token') || key.includes('supabase') || key.includes('session')) {
              await Preferences.remove({ key });
            }
          }
          
          await Preferences.set({ key: 'app_last_boot_version', value: CURRENT_VERSION });
          console.log("NativeBridge: Safety cleanup complete.");
        }
      } catch (e) {
        console.warn('NativeBridge: Version guard failed', e);
      }

      // V16.9.6: CRITICAL - Hide splash screen as early as possible to avoid white screen
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.warn('NativeBridge: SplashScreen hide failed', e);
      }

      // 1. Handle Back Button
      try {
        backListener = await App.addListener('backButton', () => {
          const handlers = (window as any)._backButtonHandlers || [];
          if (handlers.length > 0) {
            const lastHandler = handlers[handlers.length - 1];
            lastHandler();
            return;
          }

          const currentPath = (window as any)._pathnameRef || '/';
          const mainRoutes = ['/login', '/driver', '/admin', '/store'];
          if (mainRoutes.includes(currentPath)) {
            App.minimizeApp();
          } else {
            window.history.back();
          }
        });
      } catch (e) {
        console.warn('NativeBridge: Back button listener failed', e);
      }

      // 2. Configure Native UI
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#f8fafc' }); 
        
        // Keyboard configuration
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
        if (Capacitor.getPlatform() === 'ios') {
          await Keyboard.setStyle({ style: KeyboardStyle.Light });
        }
      } catch (e) {
        console.warn('NativeBridge: UI config failed', e);
      }

      // 4. Check for Updates (OTA) in background (Non-blocking)
      const performOtaCheck = async () => {
        try {
          // V17.0.1: Robust Reload Guard - Fixed NaN bug
          const { value: lastReload } = await (await import('@capacitor/preferences')).Preferences.get({ key: 'ota_last_reload_ts' });
          const now = Date.now();
          const lastReloadTs = lastReload ? parseInt(lastReload) : 0;
          
          if (lastReloadTs > 0 && now - lastReloadTs < 60000) {
            console.log("NativeBridge: Skipping OTA check (just reloaded within 60s)");
            return;
          }

          console.log(`NativeBridge: [V17.2.8] Checking for OTA updates...`);
          const update = await checkForAutoUpdate(false);
          
          if (update.available && update.downloaded) {
            console.log(`NativeBridge: Update available! Version: ${update.version}`);
            await showNativeToast(update.updateMessage || "جاري تثبيت تحديث جديد لتحسين الأداء...");
            
            // Save reload timestamp BEFORE reloading
            await (await import('@capacitor/preferences')).Preferences.set({ 
              key: 'ota_last_reload_ts', 
              value: now.toString() 
            });

            setTimeout(async () => {
              const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
              await CapacitorUpdater.reload();
            }, 1500);
          }
        } catch (e) {
          console.warn('NativeBridge: OTA Check failed', e);
        }
      };

      // Fire and forget OTA check to unblock the main thread
      performOtaCheck();
    };

    setupNative();

    return () => {
      if (backListener) backListener.remove();
    };
  }, []); // V16.9.2: Remove pathname dependency to prevent redundant checks and reload loops during navigation

  return null;
};
