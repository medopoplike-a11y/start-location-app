"use client";

import { useEffect, useState } from "react";
import { isNative, checkForAutoUpdate } from "@/lib/native-utils";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

const AppUpdater = () => {
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "downloading" | "ready" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (!isNative()) return;

    const runUpdateCheck = async () => {
      try {
        setUpdateStatus("checking");
        const { CapacitorUpdater } = await import("@capgo/capacitor-updater");

        // Listen for download progress
        const downloadListener = await CapacitorUpdater.addListener("download", (data: { percent?: number }) => {
          setUpdateStatus("downloading");
          setProgress(data.percent ?? 0);
        });

        const updateInfo = await checkForAutoUpdate();

        if (updateInfo?.available) {
          setVersion(updateInfo.version);
          // The download is already triggered in checkForAutoUpdate if available
        } else {
          setUpdateStatus("idle");
        }

        return () => {
          downloadListener.remove();
        };
      } catch (e) {
        console.error("Updater UI Error:", e);
        setUpdateStatus("error");
      }
    };

    // Check on mount and every 30 minutes
    runUpdateCheck();
    const interval = setInterval(runUpdateCheck, 1000 * 60 * 30);

    return () => clearInterval(interval);
  }, []);

  if (updateStatus === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-6 right-6 z-[9999] bg-white/90 backdrop-blur-2xl p-6 rounded-[32px] shadow-2xl border border-blue-100"
        dir="rtl"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            updateStatus === "error" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"
          }`}>
            {updateStatus === "checking" && <RefreshCw className="w-6 h-6 animate-spin" />}
            {updateStatus === "downloading" && <Download className="w-6 h-6 animate-bounce" />}
            {updateStatus === "ready" && <CheckCircle className="w-6 h-6" />}
            {updateStatus === "error" && <AlertTriangle className="w-6 h-6" />}
          </div>

          <div className="flex-1">
            <h3 className="font-black text-sm text-gray-900">
              {updateStatus === "checking" && "جاري فحص تحديثات النظام..."}
              {updateStatus === "downloading" && `جاري تحميل التحديث ${version}...`}
              {updateStatus === "ready" && "التحديث جاهز للتثبيت"}
              {updateStatus === "error" && "فشل فحص التحديثات"}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {updateStatus === "downloading" ? `تقدم التحميل: ${progress}%` : "تحسين أداء Start-OS"}
            </p>

            {updateStatus === "downloading" && (
              <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>

          {updateStatus === "ready" && (
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black shadow-lg shadow-blue-100 active:scale-95 transition-all"
            >
              تثبيت الآن
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AppUpdater;
