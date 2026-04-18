"use client";

import * as React from "react";
import { isNative, checkForAutoUpdate } from "@/lib/native-utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Download, CheckCircle, AlertTriangle, X, Wifi, WifiOff, ShieldAlert, Rocket
} from "lucide-react";
import { NativeBridge } from "./NativeBridge";
import { supabase } from "@/lib/supabaseClient";
import { config } from "@/lib/config";

const CORRECT_SUPABASE_HOST = "sdpjvorettivpdviytqo.supabase.co";
const HARDCODED_APK_URL = "https://sdpjvorettivpdviytqo.supabase.co/storage/v1/object/public/app-updates/start-location.apk";
const CURRENT_VERSION = "V1.9.0";

type BannerMode =
  | "hidden"
  | "wrong-system"    // متصل بـ Supabase خاطئ
  | "ota-checking"    // يفحص تحديثات
  | "ota-downloading" // يحمّل تحديث
  | "ota-ready"       // تحديث جاهز للتطبيق
  | "ota-error"       // فشل OTA
  | "apk-available";  // نسخة جديدة متاحة يدوياً

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [bannerMode, setBannerMode] = React.useState<BannerMode>("hidden");
  const [progress, setProgress] = React.useState(0);
  const [newVersion, setNewVersion] = React.useState("");
  const [bundleId, setBundleId] = React.useState("");
  const [dismissed, setDismissed] = React.useState(false);
  const lastUpdateRef = React.useRef<string>("");

  const openAPKDownload = React.useCallback(async () => {
    try {
      if (isNative()) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: HARDCODED_APK_URL, presentationStyle: "fullscreen" });
      } else {
        window.open(HARDCODED_APK_URL, "_blank");
      }
    } catch {
      window.open(HARDCODED_APK_URL, "_blank");
    }
  }, []);

  // فحص اتصال Supabase - فقط للتطبيق المحلي (Native)
  const checkSupabaseHealth = React.useCallback(async () => {
    // في المتصفح الإعدادات دائماً صحيحة من متغيرات البيئة
    if (!isNative()) return true;

    try {
      const configuredUrl = config.supabase.url || "";
      const isCorrect = configuredUrl.includes(CORRECT_SUPABASE_HOST);

      if (!isCorrect) {
        setBannerMode("wrong-system");
        return false;
      }

      // اختبر الاتصال الفعلي داخل التطبيق المحلي فقط
      const { error } = await supabase.from("app_config").select("id").limit(1).single();
      if (error && error.code !== "PGRST116") {
        setBannerMode("wrong-system");
        return false;
      }

      return true;
    } catch {
      setBannerMode("wrong-system");
      return false;
    }
  }, []);

  // آلية OTA كاملة
  const runUpdateCheck = React.useCallback(async (isManual = false) => {
    if (!isNative()) return;
    if (bannerMode === "ota-downloading") return;

    try {
      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");

      if (!isManual) setBannerMode("ota-checking");

      const updateInfo = await checkForAutoUpdate(isManual);

      if (!updateInfo?.available) {
        if (!isManual) setBannerMode("hidden");
        return;
      }

      setNewVersion(updateInfo.version || "");
      if (updateInfo.bundleId) setBundleId(updateInfo.bundleId);

      // إضافة مستمع التحميل
      const dlListener = await CapacitorUpdater.addListener("download", (data: { percent?: number }) => {
        setProgress(data.percent ?? 0);
        setBannerMode("ota-downloading");
      });

      if (updateInfo.downloaded) {
        setBannerMode("ota-ready");
        setProgress(100);

        // تطبيق تلقائي بعد 2.5 ثانية
        setTimeout(async () => {
          try {
            const { CapacitorUpdater: updater } = await import("@capgo/capacitor-updater");
            if ((updater as any).notifyAppReady) await (updater as any).notifyAppReady();
            await updater.reload();
          } catch {
            window.location.reload();
          }
        }, 2500);
      } else {
        setBannerMode("ota-downloading");
      }

      return () => dlListener.remove();
    } catch (e: any) {
      console.error("OTA Update failed:", e);
      setBannerMode("ota-error");
    }
  }, [bannerMode]);

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);

    if (typeof window !== "undefined") {
      (window as any).showSystemAlert = (msg: string) => console.log("System Alert:", msg);
    }

    const init = async () => {
      try {
        if (isNative()) {
          const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
          if ((CapacitorUpdater as any).notifyAppReady) {
            await (CapacitorUpdater as any).notifyAppReady();
          }
        }

        // فحص Supabase أولاً
        const healthy = await checkSupabaseHealth();

        // إذا Supabase صحيح → فحص OTA
        if (healthy && isNative()) {
          await runUpdateCheck(false);
        }
      } catch (e) {
        console.error("Init sequence failed:", e);
      }
    };

    const initTimer = setTimeout(init, 800);

    const retryListener = () => runUpdateCheck(true);
    window.addEventListener("retryUpdate", retryListener);

    // فحص كل 20 دقيقة
    const interval = setInterval(() => {
      if (bannerMode === "hidden") runUpdateCheck(false);
    }, 1000 * 60 * 20);

    return () => {
      clearTimeout(timer);
      clearTimeout(initTimer);
      clearInterval(interval);
      window.removeEventListener("retryUpdate", retryListener);
    };
  }, []);

  if (!mounted) return null;

  const showBanner = bannerMode !== "hidden" && !dismissed;
  const canDismiss = bannerMode !== "wrong-system" && bannerMode !== "ota-ready";

  const bannerConfig = {
    "wrong-system": {
      bg: "bg-red-600",
      border: "border-red-500",
      icon: <ShieldAlert className="w-6 h-6 text-white" />,
      title: "تطبيقك متصل بنظام مختلف!",
      subtitle: "بياناتك الحقيقية في النسخة الجديدة — حمّل الآن",
      urgent: true,
    },
    "ota-checking": {
      bg: "bg-blue-600",
      border: "border-blue-500",
      icon: <RefreshCw className="w-6 h-6 text-white animate-spin" />,
      title: "جاري فحص التحديثات...",
      subtitle: "نتحقق من وجود نسخة جديدة",
      urgent: false,
    },
    "ota-downloading": {
      bg: "bg-blue-700",
      border: "border-blue-600",
      icon: <Download className="w-6 h-6 text-white animate-bounce" />,
      title: `جاري تحميل التحديث (${progress}%)`,
      subtitle: `النسخة الجديدة ${newVersion}`,
      urgent: false,
    },
    "ota-ready": {
      bg: "bg-emerald-600",
      border: "border-emerald-500",
      icon: <CheckCircle className="w-6 h-6 text-white" />,
      title: "التحديث جاهز — جاري التطبيق...",
      subtitle: `تم تثبيت ${newVersion} بنجاح`,
      urgent: false,
    },
    "ota-error": {
      bg: "bg-orange-600",
      border: "border-orange-500",
      icon: <AlertTriangle className="w-6 h-6 text-white" />,
      title: "فشل التحديث التلقائي",
      subtitle: "اضغط لتحميل النسخة الجديدة مباشرة",
      urgent: true,
    },
    "apk-available": {
      bg: "bg-amber-600",
      border: "border-amber-500",
      icon: <Rocket className="w-6 h-6 text-white" />,
      title: `نسخة جديدة متاحة ${newVersion}`,
      subtitle: "اضغط لتحميل التطبيق المحدّث",
      urgent: false,
    },
    "hidden": {
      bg: "", border: "", icon: null, title: "", subtitle: "", urgent: false
    }
  };

  const bc = bannerConfig[bannerMode];

  return (
    <>
      <NativeBridge />

      {/* شريط التحديث الشامل - يظهر أعلى كل الصفحات */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`fixed top-0 left-0 right-0 z-[99999] ${bc.bg} border-b ${bc.border} shadow-2xl`}
            dir="rtl"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            {/* شريط التقدم للتحميل */}
            {bannerMode === "ota-downloading" && (
              <div className="absolute bottom-0 left-0 h-1 bg-white/40 transition-all duration-300" style={{ width: `${progress}%` }} />
            )}

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="shrink-0">{bc.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-white leading-tight truncate">{bc.title}</p>
                <p className="text-[10px] text-white/70 truncate">{bc.subtitle}</p>
              </div>

              {/* زر الإجراء */}
              {(bc.urgent || bannerMode === "ota-error") && (
                <button
                  onClick={openAPKDownload}
                  className="shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur rounded-xl px-3 py-2 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span className="text-[11px] font-black text-white whitespace-nowrap">حمّل APK</span>
                </button>
              )}

              {bannerMode === "ota-ready" && (
                <button
                  onClick={async () => {
                    try {
                      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
                      if (bundleId) await CapacitorUpdater.set({ id: bundleId });
                      await CapacitorUpdater.reload();
                    } catch {
                      window.location.reload();
                    }
                  }}
                  className="shrink-0 bg-white/20 border border-white/30 rounded-xl px-3 py-2"
                >
                  <span className="text-[11px] font-black text-white">تطبيق الآن</span>
                </button>
              )}

              {canDismiss && (
                <button onClick={() => setDismissed(true)} className="shrink-0 text-white/60 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* دفع المحتوى للأسفل عند ظهور الشريط */}
      <div style={{ paddingTop: showBanner ? 56 : 0, transition: 'padding-top 0.3s ease' }}>
        {children}
      </div>

      {/* زر عائم دائم داخل التطبيق المحمول لتحميل APK */}
      {isNative() && bannerMode === "wrong-system" && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.5, type: "spring" }}
          onClick={openAPKDownload}
          className="fixed bottom-24 left-4 z-[99998] flex flex-col items-center gap-1"
          dir="rtl"
        >
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/50 border-2 border-white/20">
            <Download className="w-7 h-7 text-white" />
          </div>
          <span className="text-[9px] font-black text-red-400 bg-black/80 px-2 py-0.5 rounded-full">حمّل النسخة الجديدة</span>
        </motion.button>
      )}
    </>
  );
}
