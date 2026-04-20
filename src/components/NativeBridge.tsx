"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardStyle } from "@capacitor/keyboard";
import { useRouter, usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { checkForAutoUpdate, showNativeToast } from "@/lib/native-utils";

export const NativeBridge = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupNative = async () => {
      // 1. Handle Back Button
      await App.addListener('backButton', () => {
        const handlers = (window as any)._backButtonHandlers || [];
        if (handlers.length > 0) {
          const lastHandler = handlers[handlers.length - 1];
          lastHandler();
          return;
        }

        const mainRoutes = ['/login', '/driver', '/admin', '/store'];
        if (mainRoutes.includes(pathname)) {
          App.minimizeApp();
        } else {
          window.history.back();
        }
      });

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

      // 3. Hide Splash Screen when app is ready
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.warn('NativeBridge: SplashScreen hide failed', e);
      }

      // 4. Check for Updates (OTA)
      // V16.4.1: Trigger update check immediately after boot
      try {
        console.log("NativeBridge: Checking for OTA updates...");
        const update = await checkForAutoUpdate(true);
        if (update.available && update.downloaded) {
          await showNativeToast(update.updateMessage || "جاري إعادة تشغيل التطبيق لتثبيت التحديث...");
          setTimeout(async () => {
            const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
            await CapacitorUpdater.reload();
          }, 1000);
        }
      } catch (e) {
        console.warn('NativeBridge: OTA Check failed', e);
      }
    };

    setupNative();

    return () => {
      App.removeAllListeners();
    };
  }, [pathname, router]);

  return null;
};
