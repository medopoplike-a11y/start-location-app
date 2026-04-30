"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardStyle } from "@capacitor/keyboard";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { checkAppUpdate, showNativeToast } from "@/lib/native-utils";
import { dbService } from "@/lib/db-service";
import { mapCache } from "@/lib/map-cache";

export const NativeBridge = () => {
  const pathname = usePathname();

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window as any)._pathnameRef = pathname;
      }
    } catch (e) {
      console.warn('NativeBridge: Pathname ref failed', e);
    }
  }, [pathname]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      (async () => {
        try {
          const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
          await CapacitorUpdater.notifyAppReady();
          console.log("NativeBridge: Capgo notified of successful boot.");
        } catch (e) {
          console.warn('NativeBridge: Capgo notification failed', e);
        }
      })();
    }
  }, []);

  useEffect(() => {
    let backListener: any;
    
    if (Capacitor.isNativePlatform()) {
      try {
        dbService.initialize().catch(err => {
          console.error("NativeBridge: SQLite Init Failed", err);
        });
      } catch (e) {
        console.warn('NativeBridge: dbService init failed', e);
      }
      
      try {
        mapCache.initialize().catch(err => {
          console.error("NativeBridge: Map Cache Init Failed", err);
        });
      } catch (e) {
        console.warn('NativeBridge: mapCache init failed', e);
      }
    }

    if (!Capacitor.isNativePlatform()) return;

    const setupNative = async () => {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value: lastBootVersion } = await Preferences.get({ key: 'app_last_boot_version' });
        const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";

        if (lastBootVersion !== CURRENT_VERSION) {
          if (lastBootVersion) {
            console.log(`NativeBridge: New version detected (${lastBootVersion} -> ${CURRENT_VERSION}). Performing safety cleanup...`);
            
            try {
              const sessionKey = 'start-location-v1-session';
              await Preferences.remove({ key: sessionKey });
              const { keys } = await Preferences.keys();
              for (const key of keys) {
                if (key.includes('auth-token') || key.includes('supabase') || key.includes('session')) {
                  try {
                    await Preferences.remove({ key });
                  } catch (removeErr) {
                    console.warn('NativeBridge: Failed to remove key:', key, removeErr);
                  }
                }
              }
              console.log("NativeBridge: Safety cleanup complete.");
            } catch (cleanupErr) {
              console.warn('NativeBridge: Safety cleanup failed', cleanupErr);
            }
          }
          
          try {
            await Preferences.set({ key: 'app_last_boot_version', value: CURRENT_VERSION });
          } catch (setErr) {
            console.warn('NativeBridge: Failed to set last boot version', setErr);
          }
        }
      } catch (e) {
        console.warn('NativeBridge: Version guard failed', e);
      }

      try {
        await SplashScreen.hide();
      } catch (e) {
        console.warn('NativeBridge: SplashScreen hide failed', e);
      }

      try {
        backListener = await App.addListener('backButton', () => {
          try {
            const handlers = (window as any)._backButtonHandlers || [];
            if (handlers.length > 0) {
              const lastHandler = handlers[handlers.length - 1];
              lastHandler();
              return;
            }

            const currentPath = (window as any)._pathnameRef || '/';
            const mainRoutes = ['/login', '/driver', '/admin', '/store'];
            if (mainRoutes.includes(currentPath)) {
              try {
                App.minimizeApp();
              } catch (minErr) {
                console.warn('NativeBridge: Minimize app failed', minErr);
              }
            } else {
              window.history.back();
            }
          } catch (handlerErr) {
            console.warn('NativeBridge: Back button handler error', handlerErr);
          }
        });
      } catch (e) {
        console.warn('NativeBridge: Back button listener failed', e);
      }

      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#f8fafc' }); 
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
        if (Capacitor.getPlatform() === 'ios') {
          await Keyboard.setStyle({ style: KeyboardStyle.Light });
        }
      } catch (e) {
        console.warn('NativeBridge: UI config failed', e);
      }

      setTimeout(async () => {
        try {
          const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";
          const update = await checkAppUpdate(CURRENT_VERSION, false, false);
          if (update.available && (update as any).downloaded) {
            console.log(`[NativeBridge] OTA update queued for next launch: ${update.version}`);
            await showNativeToast(update.updateMessage || 'تم تحميل تحديث جديد. سيُطبَّق عند فتح التطبيق القادم.');
          }
        } catch (e) {
          console.warn('[NativeBridge] OTA check failed silently:', e);
        }
      }, 5000);
    };

    try {
      setupNative();
    } catch (setupErr) {
      console.error('NativeBridge: Setup failed', setupErr);
    }

    return () => {
      try {
        if (backListener) backListener.remove();
      } catch (e) {
        console.warn('NativeBridge: Failed to remove back listener', e);
      }
    };
  }, []);

  return null;
};
