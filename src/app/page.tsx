"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile } from "@/lib/auth";
import { StartLogo } from "@/components/StartLogo";
import { Download, AlertCircle, RefreshCw } from "lucide-react";

const CURRENT_VERSION = "0.1.0"; // إصدار التطبيق الحالي

interface AppConfig {
  latest_version: string;
  min_version: string;
  download_url: string;
  force_update: boolean;
  update_message: string;
}

export default function SplashPage() {
  const router = useRouter();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAppVersionAndRedirect = async () => {
      try {
        // 1. التحقق من إصدار التطبيق من سوبابيز
        const { data: config, error: configError } = await supabase
          .from('app_config')
          .select('*')
          .single();

        if (!configError && config) {
          setAppConfig(config);
          
          // مقارنة الإصدارات (بسيطة: إذا كان الإصدار الحالي أصغر من الإصدار الأدنى المطلوب)
          const isUpdateRequired = config.force_update && compareVersions(CURRENT_VERSION, config.min_version) < 0;
          const isUpdateAvailable = compareVersions(CURRENT_VERSION, config.latest_version) < 0;

          if (isUpdateRequired || (isUpdateAvailable && config.force_update)) {
            setShowUpdateModal(true);
            setIsChecking(false);
            return; // توقف هنا ولا تRedirect
          }
        }

        // 2. إذا لم يكن هناك تحديث إجباري، استكمل عملية تسجيل الدخول
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await getUserProfile(session.user.id);
          if (profile) {
            const normalizedRole = profile.role?.toLowerCase();
            if (normalizedRole === "admin") router.replace("/admin");
            else if (normalizedRole === "driver") router.replace("/driver");
            else if (normalizedRole === "vendor") router.replace("/vendor");
            else router.replace("/login");
          } else {
            router.replace("/login");
          }
        } else {
          router.replace("/login");
        }
      } catch (err) {
        console.error("Splash check error:", err);
        router.replace("/login");
      } finally {
        setIsChecking(false);
      }
    };

    const timer = setTimeout(() => {
      checkAppVersionAndRedirect();
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  // دالة لمقارنة أرقام الإصدارات (X.Y.Z)
  const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  };

  return (
    <main className="min-h-screen bg-[#000814] flex flex-col items-center justify-center relative font-sans overflow-hidden">
      {/* Animated Digital Grid Background */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
        />
        <motion.div 
          animate={{ 
            backgroundPosition: ["0% 0%", "100% 100%"]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_50%,#0047FF33,transparent)]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="drop-shadow-[0_20px_30px_rgba(0,71,255,0.3)]"
        >
          <StartLogo className="w-48 h-48 md:w-56 md:h-56" />
        </motion.div>

        <div className="text-center mt-8">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter">
            Start Location
          </h1>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 1, duration: 1 }}
            className="h-0.5 bg-blue-500 mx-auto rounded-full mt-4 shadow-[0_0_15px_rgba(59,130,246,0.7)]"
          />
        </div>
      </motion.div>

      {/* Update Modal */}
      <AnimatePresence>
        {showUpdateModal && appConfig && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#001233] border border-blue-500/30 rounded-[32px] p-8 w-full max-w-md text-center shadow-[0_0_50px_rgba(0,71,255,0.2)]"
            >
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin-slow" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">تحديث جديد متاح</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                {appConfig.update_message}
              </p>
              
              <div className="space-y-4">
                <a 
                  href={appConfig.download_url}
                  className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all transform active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  <Download className="w-5 h-5" />
                  تحميل التحديث الآن
                </a>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                  Version {appConfig.latest_version}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Status Footer */}
      <div className="absolute bottom-12 flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">
          {isChecking ? "Checking System..." : "System Online"}
        </span>
      </div>
    </main>
  );
}
