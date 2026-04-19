"use client";

import * as React from "react";
import { isNative, checkForAutoUpdate } from "@/lib/native-utils";
import { NativeBridge } from "./NativeBridge";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);

    const init = async () => {
      try {
        if (isNative()) {
          const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
          if ((CapacitorUpdater as any).notifyAppReady) {
            await (CapacitorUpdater as any).notifyAppReady();
          }

          // فحص OTA بصمت — بدون أي إشعارات للمستخدم
          const performUpdateCheck = async () => {
            const updateInfo = await checkForAutoUpdate(false).catch(() => null);
            if (updateInfo?.available && updateInfo.downloaded) {
              try {
                const { CapacitorUpdater: updater } = await import("@capgo/capacitor-updater");
                await updater.reload();
              } catch {
                window.location.reload();
              }
            }
          };

          // 1. فحص عند بدء التشغيل
          await performUpdateCheck();

          // 2. فحص عند عودة التطبيق من الخلفية (هام جداً للطيارين)
          const { App } = await import("@capacitor/app");
          App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
              performUpdateCheck();
            }
          });
        }
      } catch (e) {
        console.error("Init sequence failed:", e);
      }
    };

    const initTimer = setTimeout(init, 800);

    return () => {
      clearTimeout(timer);
      clearTimeout(initTimer);
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
