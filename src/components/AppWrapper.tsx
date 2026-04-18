"use client";

import * as React from "react";
import { isNative, checkForAutoUpdate } from "@/lib/native-utils";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Download, CheckCircle, AlertTriangle } from "lucide-react";
import { NativeBridge } from "./NativeBridge";

/**
 * AppWrapper: A simple container to ensure the application is mounted
 * and ready before rendering children. Handles background OTA updates
 * silently for a smooth experience.
 */
export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [updateStatus, setUpdateStatus] = React.useState<"idle" | "checking" | "downloading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [version, setVersion] = React.useState("");
  const [bundleId, setBundleId] = React.useState("");
  const lastUpdateRef = React.useRef<string>("");

  const runUpdateCheck = React.useCallback(async (isManual = false) => {
    if (!isNative()) return;
    
    try {
      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
      
      const updateInfo = await checkForAutoUpdate(isManual);

      if (updateInfo?.available) {
        // V1.6.6: Avoid multiple parallel downloads
        if (updateStatus === "downloading") return;

        // Add listener for download progress
        const downloadListener = await CapacitorUpdater.addListener("download", (data: { percent?: number }) => {
          const percent = data.percent ?? 0;
          setUpdateStatus("downloading");
          setProgress(percent);
        });

        setVersion(updateInfo.version || "");
        if (updateInfo.bundleId) {
          setBundleId(updateInfo.bundleId);
        }
        
        if (updateInfo.downloaded) {
          setUpdateStatus("ready");
          setProgress(100);
          
          // Give system time to finalize
          setTimeout(async () => {
            try {
              const { CapacitorUpdater: updater } = await import("@capgo/capacitor-updater");
              if ((updater as any).checkVersion) {
                await (updater as any).checkVersion();
              }
              if ((updater as any).notifyAppReady) {
                await (updater as any).notifyAppReady();
              }
              await updater.reload();
            } catch (e) {
              window.location.reload();
            }
          }, 2000);
        } else {
          setUpdateStatus("downloading");
        }
        
        return () => downloadListener.remove();
      }
    } catch (e: any) {
      console.error("OTA Update Check Failed:", e);
      // Silently fail unless manual
      if (isManual) {
        setUpdateStatus("error");
        setErrorMessage(e.message || "حدث خطأ");
      }
    }
  }, [updateStatus]);

  React.useEffect(() => {
    // Wrap initial state changes in a small delay to avoid cascading renders
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    
    // Polyfill for showSystemAlert
    if (typeof window !== 'undefined') {
      (window as any).showSystemAlert = (msg: string) => {
        console.log('System Alert:', msg);
      };
    }

    // OTA Update Check Logic (Silent)
    if (isNative()) {
      const confirmAppReady = async () => {
        try {
          const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
          // Inform Capgo that the current bundle is loaded and working correctly
          // This prevents the system from rolling back to the previous version
          if ((CapacitorUpdater as any).notifyAppReady) {
            await (CapacitorUpdater as any).notifyAppReady();
            console.log('Native OTA: Current bundle confirmed as READY to prevent rollback');
          }
        } catch (e) {
          console.warn('Native OTA: Failed to confirm app ready', e);
        }
      };
      
      // Wrap the calls in a small delay
      const runUpdates = async () => {
        try {
          await confirmAppReady();
          await runUpdateCheck();
        } catch (e) {
          console.error("Initial update sequence failed", e);
        }
      };
      
      const updateTimer = setTimeout(runUpdates, 500);

      // Listen for manual retries
      const retryListener = () => {
        runUpdateCheck(true);
      };
      window.addEventListener('retryUpdate', retryListener);

      // Check every 30 minutes
      const interval = setInterval(() => runUpdateCheck(false), 1000 * 60 * 30);
      return () => {
        clearTimeout(timer);
        clearTimeout(updateTimer);
        clearInterval(interval);
        window.removeEventListener('retryUpdate', retryListener);
      };
    } else {
      // If not native, still need to clean up timer
      return () => clearTimeout(timer);
    }
  }, [runUpdateCheck]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <NativeBridge />
      <AnimatePresence>
        {(updateStatus !== "idle") && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-8 left-6 right-6 z-[9999] drawer-glass p-6 rounded-[32px] shadow-2xl flex flex-col gap-4 border-none`}
            dir="rtl"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                updateStatus === "ready" ? "bg-emerald-500 text-white shadow-emerald-200" : 
                updateStatus === "error" ? "bg-red-500 text-white shadow-red-200" : "bg-blue-600 text-white shadow-blue-200"
              }`}>
                {updateStatus === "downloading" && <Download className="w-6 h-6 animate-bounce" />}
                {updateStatus === "ready" && <CheckCircle className="w-6 h-6" />}
                {updateStatus === "error" && <AlertTriangle className="w-6 h-6" />}
              </div>
              
              <div className="flex-1 space-y-1">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {updateStatus === "downloading" ? `جاري تحديث النظام (${progress}%)` : 
                   updateStatus === "ready" ? "تم تحميل تحديث جديد بنجاح" :
                   updateStatus === "error" ? "فشل تحديث النظام" : "جاري فحص التحديثات..."}
                </p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded-md text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Version {version || "Current"}
                  </span>
                  {updateStatus === "error" && (
                    <span className="text-[10px] font-bold text-red-500 truncate max-w-[150px]">
                      {errorMessage}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              {updateStatus === "ready" && (
                <button
                  onClick={async () => {
                    try {
                      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
                      if (bundleId) {
                        await CapacitorUpdater.set({ id: bundleId });
                      }
                      await CapacitorUpdater.reload();
                    } catch (e) {
                      window.location.reload();
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl text-xs font-black shadow-xl shadow-blue-200 active:scale-95 transition-all uppercase tracking-wider"
                >
                  تطبيق التحديث الآن
                </button>
              )}

              {updateStatus === "error" && (
                <button
                  onClick={() => {
                    setUpdateStatus("idle");
                    setTimeout(() => {
                      const event = new CustomEvent('retryUpdate');
                      window.dispatchEvent(event);
                    }, 100);
                  }}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl text-xs font-black shadow-xl shadow-red-200 active:scale-95 transition-all"
                >
                  إعادة المحاولة
                </button>
              )}

              <button
                onClick={() => setUpdateStatus("idle")}
                className="px-6 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-2xl text-xs font-black hover:bg-slate-200 transition-colors"
              >
                {updateStatus === "ready" ? "لاحقاً" : "إغلاق"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
