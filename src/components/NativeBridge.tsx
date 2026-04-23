"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardStyle } from "@capacitor/keyboard";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { checkForAutoUpdate, showNativeToast } from "@/lib/native-utils";
import { dbService } from "@/lib/db-service";

export const NativeBridge = () => {
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
      // V17.4.9: HARD RESET GUARD - Clear stale sessions on version upgrade
      // This prevents "Ghost Logins" and "Empty Systems" caused by Android Auto Backup
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value: lastBootVersion } = await Preferences.get({ key: 'app_last_boot_version' });
        const CURRENT_VERSION = "17.6.2";

        if (lastBootVersion !== CURRENT_VERSION) {
          console.log(`NativeBridge: [V17.6.2] New version detected (${lastBootVersion} -> ${CURRENT_VERSION}). Performing safety cleanup...`);
          
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

      // 4. Check for OTA updates in the background (non-blocking, safe)
      // Uses next() instead of set() — no immediate restart, no reload loop.
      // The downloaded bundle is applied on the next cold start of the app.
      setTimeout(async () => {
        try {
          const update = await checkForAutoUpdate(false);
          if (update.available && update.downloaded) {
            console.log(`[NativeBridge] OTA update queued for next launch: ${update.version}`);
            await showNativeToast(update.updateMessage || 'تم تحميل تحديث جديد. سيُطبَّق عند فتح التطبيق القادم.');
          }
        } catch (e) {
          console.warn('[NativeBridge] OTA check failed silently:', e);
        }
      }, 5000); // Delay 5s to let the app fully load before checking
    };

    setupNative();

    return () => {
      if (backListener) backListener.remove();
    };
  }, []); // V16.9.2: Remove pathname dependency to prevent redundant checks and reload loops during navigation

  return null;
};
