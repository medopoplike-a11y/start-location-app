"use client";

import { useEffect, useState } from "react";
import { isNative, checkForAutoUpdate } from "@/lib/native-utils";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

const AppUpdater = () => {
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "downloading" | "ready" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isNative()) return;

    let downloadListener: { remove?: () => void } | undefined;

    const cleanupListener = () => {
      if (downloadListener?.remove) {
        downloadListener.remove();
      }
    };

    const runUpdateCheck = async () => {
      try {
        setUpdateStatus("checking");
        setProgress(0);
        setVersion("");
        setMessage("");

        const { CapacitorUpdater } = await import("@capgo/capacitor-updater");

        downloadListener = await CapacitorUpdater.addListener("download", (data: { percent?: number }) => {
          const percent = data.percent ?? 0;
          setUpdateStatus("downloading");
          setProgress(percent);

          if (percent >= 100) {
            setUpdateStatus("ready");
          }
        });

        const updateInfo = await checkForAutoUpdate();

        if (updateInfo?.available) {
          setVersion(updateInfo.version || "");
          setMessage(updateInfo.updateMessage || "التحديث جاهز للتثبيت الآن.");
          if (updateInfo.downloaded) {
            setUpdateStatus("ready");
            setProgress(100);
          } else {
            setUpdateStatus("downloading");
          }
        } else {
          setUpdateStatus("idle");
        }
      } catch (e) {
        console.error("Updater UI Error:", e);
        setUpdateStatus("error");
      }
    };

    runUpdateCheck();
    const interval = setInterval(runUpdateCheck, 1000 * 60 * 30);

    return () => {
      clearInterval(interval);
      cleanupListener();
    };
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
        <div className="flex flex-col gap-4">
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
                {updateStatus === "downloading" && `جاري تحميل التحديث ${version || "الجديد"}...`}
                {updateStatus === "ready" && "التحديث جاهز للتثبيت"}
                {updateStatus === "error" && "فشل فحص التحديثات"}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {updateStatus === "downloading" ? `تقدم التحميل: ${progress}%` : "تحسين أداء Start-OS"}
              </p>
            </div>
          </div>

          {message && (
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
              {message}
            </div>
          )}

          {updateStatus === "downloading" && (
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          {updateStatus === "ready" && (
            <button
              onClick={() => window.location.reload()}
              className="self-end bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[12px] font-black shadow-lg shadow-blue-100 active:scale-95 transition-all"
            >
              إعادة تشغيل التطبيق لتثبيت التحديث
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AppUpdater;
