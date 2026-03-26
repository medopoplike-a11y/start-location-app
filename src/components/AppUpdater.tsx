"use client";

import { useEffect, useState } from "react";
import { isNative } from "@/lib/native-utils";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, CheckCircle } from "lucide-react";

const AppUpdater = () => {
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "downloading" | "ready">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isNative()) return;

    const checkUpdates = async () => {
      try {
        const { CapacitorUpdater } = await import("@capgo/capacitor-updater");

        // استماع لتقدم التحميل
        CapacitorUpdater.addListener("download", (data: any) => {
          setUpdateStatus("downloading");
          setProgress(data.percent);
        });

        // التحقق من وجود نسخة جديدة عند التشغيل
        setUpdateStatus("checking");
      } catch (e) {
        console.error("Updater Error:", e);
      }
    };

    checkUpdates();
  }, []);

  if (updateStatus === "idle" || updateStatus === "checking") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-6 right-6 z-[100] bg-gray-900 text-white p-6 rounded-[32px] shadow-2xl border border-white/10"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
            {updateStatus === "downloading" ? <Download className="animate-bounce" /> : <CheckCircle />}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">تحديث النظام جارٍ...</h3>
            <p className="text-[10px] text-gray-400">نحن نقوم بتحسين تجربتك الآن تلقائياً</p>
            
            {updateStatus === "downloading" && (
              <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          {updateStatus === "ready" && (
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 px-4 py-2 rounded-xl text-[10px] font-bold"
            >
              إعادة التشغيل
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AppUpdater;
