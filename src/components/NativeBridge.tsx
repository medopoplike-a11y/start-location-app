"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardStyle } from "@capacitor/keyboard";
import { NavigationBar } from "@capgo/capacitor-navigation-bar";
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

      // 2. Configure Native UI Elements
      try {
        // Status Bar
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#f8fafc' }); 
        
        // Navigation Bar (Android only)
        if (Capacitor.getPlatform() === 'android') {
          await NavigationBar.setAlpha({ alpha: 0.1 });
          await NavigationBar.setColor({ color: '#f8fafc' });
        }

        // Keyboard settings to fix white space
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
        if (Capacitor.getPlatform() === 'ios') {
          await Keyboard.setStyle({ style: KeyboardStyle.Light });
        }
        
        // Ensure keyboard doesn't resize the webview in a way that causes white space
        // For Android, we often want 'adjustPan' instead of 'adjustResize' in AndroidManifest
        // but via JS we can try to set the scroll behavior
        await Keyboard.setScroll({ isDisabled: false });
      } catch (e) {
        console.warn('NativeBridge: UI config failed', e);
      }

      // 3. Hide Splash Screen with a slight delay for smooth transition
      setTimeout(async () => {
        try {
          await SplashScreen.hide({
            fadeOutDuration: 400
          });
        } catch (e) {}
      }, 500);
    };

    setupNative();

    return () => {
      App.removeAllListeners();
    };
  }, [pathname, router]);

  return null;
};
