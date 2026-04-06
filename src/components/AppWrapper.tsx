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
  const [progress, setProgress] = React.useState(0);
  const [version, setVersion] = React.useState("");
  const [bundleId, setBundleId] = React.useState("");

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
      const runUpdateCheck = async () => {
        try {
          const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
          
          // Add listener for download progress
          const downloadListener = await CapacitorUpdater.addListener("download", (data: { percent?: number }) => {
            const percent = data.percent ?? 0;
            setUpdateStatus("downloading");
            setProgress(percent);
            if (percent >= 100) {
              setUpdateStatus("ready");
              // Force immediate reload on 100% download if needed
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          });

          const updateInfo = await checkForAutoUpdate();

          if (updateInfo?.available) {
            setVersion(updateInfo.version || "");
            if (updateInfo.bundleId) {
              setBundleId(updateInfo.bundleId);
            }
            if (updateInfo.downloaded) {
              setUpdateStatus("ready");
              setProgress(100);
            } else {
              setUpdateStatus("downloading");
            }
          } else {
            setUpdateStatus("idle");
          }

          return () => downloadListener.remove();
        } catch (e) {
          console.error("OTA Update Check Failed:", e);
          setUpdateStatus("error");
        }
      };

      runUpdateCheck();
      // Check every 30 minutes
      const interval = setInterval(runUpdateCheck, 1000 * 60 * 30);
      return () => clearInterval(interval);
    }
  }, []);

  if (!mounted) {
    return (
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '30px', height: '30px', border: '3px solid #ccc', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {updateStatus !== "idle" && updateStatus !== "error" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 z-[9999] bg-white/90 backdrop-blur-2xl p-4 rounded-[28px] shadow-2xl border border-blue-100 flex items-center gap-4"
            dir="rtl"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              updateStatus === "ready" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
            }`}>
              {updateStatus === "downloading" && <Download className="w-5 h-5 animate-bounce" />}
              {updateStatus === "ready" && <CheckCircle className="w-5 h-5" />}
            </div>
            
            <div className="flex-1">
              <p className="text-xs font-black text-gray-900">
                {updateStatus === "downloading" ? `جاري تحديث النظام (${progress}%)` : "تم تحميل تحديث جديد"}
              </p>
              <p className="text-[10px] font-bold text-gray-400">إصدار {version || "جديد"}</p>
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
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
