"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { useRouter, usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";

export const NativeBridge = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupNative = async () => {
      // 1. Handle Back Button with support for custom handlers
      await App.addListener('backButton', () => {
        // Check if there are any global back button handlers (e.g. for modals)
        const handlers = (window as any)._backButtonHandlers || [];
        if (handlers.length > 0) {
          // Execute the last registered handler (top-most modal)
          const lastHandler = handlers[handlers.length - 1];
          lastHandler();
          return;
        }

        // Default behavior: minimize if on main routes, else go back
        const mainRoutes = ['/login', '/driver', '/admin', '/store'];
        if (mainRoutes.includes(pathname)) {
          App.minimizeApp();
        } else {
          window.history.back();
        }
      });

      // 2. Configure Status Bar
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#f8fafc' }); // Match app background
      } catch (e) {
        console.warn('NativeBridge: StatusBar failed', e);
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
