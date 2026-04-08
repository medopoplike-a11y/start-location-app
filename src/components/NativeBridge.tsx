"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardStyle } from "@capacitor/keyboard";
import { useRouter, usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";

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
    };

    setupNative();

    return () => {
      App.removeAllListeners();
    };
  }, [pathname, router]);

  return null;
};
