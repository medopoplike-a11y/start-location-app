"use client";

import * as React from "react";
import { isNative, checkForAutoUpdate } from "@/lib/native-utils";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Download, CheckCircle, AlertTriangle } from "lucide-react";

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

  React.useEffect(() => {
    setMounted(true);
    
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
      
      // Confirm ready on every mount/load
      confirmAppReady();

      const runUpdateCheck = async (isManual = false) => {
        try {
          const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
          
          const updateInfo = await checkForAutoUpdate(isManual);

          if (updateInfo?.available) {
            // Add listener for download progress only when update is found
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
              
              // Give system time to finalize the bundle set
              setTimeout(async () => {
                try {
                  const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
                  
                  // Reset rollback check for the new bundle
                  // This ensures the update is treated as successful and persistent
                  console.log('Native OTA: Finalizing update and marking as successful...');
                  
                  // Crucial: We need to inform Capgo that this bundle is working perfectly
                  try {
                    if ((CapacitorUpdater as any).notifyAppReady) {
                      await (CapacitorUpdater as any).notifyAppReady();
                    }
                  } catch (err) {
                    console.warn('Native OTA: notifyAppReady failed', err);
                  }
                  
                  // 2. Reload to apply
                  await CapacitorUpdater.reload();
                } catch (e) {
                  window.location.reload();
                }
              }, 2000);
            } else {
              setUpdateStatus("downloading");
            }
            
            return () => downloadListener.remove();
          } else {
            setUpdateStatus("idle");
          }
        } catch (e: any) {
          console.error("OTA Update Check Failed:", e);
          setUpdateStatus("error");
          setErrorMessage(e.message || "حدث خطأ غير متوقع");
        }
      };

      runUpdateCheck();
      
      // Listen for manual retries
      const retryListener = () => {
        runUpdateCheck(true);
      };
      window.addEventListener('retryUpdate', retryListener);

      // Check every 30 minutes
      const interval = setInterval(() => runUpdateCheck(false), 1000 * 60 * 30);
      return () => {
        clearInterval(interval);
        window.removeEventListener('retryUpdate', retryListener);
      };
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {(updateStatus !== "idle") && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-6 left-6 right-6 z-[9999] bg-white/90 backdrop-blur-2xl p-4 rounded-[28px] shadow-2xl border flex items-center gap-4 ${
              updateStatus === "error" ? "border-red-100" : "border-blue-100"
            }`}
            dir="rtl"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              updateStatus === "ready" ? "bg-green-50 text-green-600" : 
              updateStatus === "error" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
            }`}>
              {updateStatus === "downloading" && <Download className="w-5 h-5 animate-bounce" />}
              {updateStatus === "ready" && <CheckCircle className="w-5 h-5" />}
              {updateStatus === "error" && <AlertTriangle className="w-5 h-5" />}
            </div>
            
            <div className="flex-1">
              <p className="text-xs font-black text-gray-900">
                {updateStatus === "downloading" ? `جاري تحديث النظام (${progress}%)` : 
                 updateStatus === "ready" ? "تم تحميل تحديث جديد" :
                 updateStatus === "error" ? "فشل التحديث" : "جاري فحص التحديثات..."}
              </p>
              <p className="text-[10px] font-bold text-gray-400">
                {updateStatus === "error" ? errorMessage : `إصدار ${version || "جديد"}`}
              </p>
            </div>

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
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[11px] font-black shadow-lg shadow-blue-100 active:scale-95 transition-all"
              >
                تحديث الآن
              </button>
            )}

            {updateStatus === "error" && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setUpdateStatus("idle");
                    // Delay slightly before retrying
                    setTimeout(() => {
                      const event = new CustomEvent('retryUpdate');
                      window.dispatchEvent(event);
                    }, 100);
                  }}
                  className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg shadow-red-100 active:scale-95 transition-all"
                >
                  إعادة المحاولة
                </button>
                <button
                  onClick={() => setUpdateStatus("idle")}
                  className="text-gray-400 hover:text-gray-600 text-[10px] font-bold"
                >
                  إغلاق
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
