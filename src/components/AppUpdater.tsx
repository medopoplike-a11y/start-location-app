"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Download, AlertCircle, ShieldCheck } from "lucide-react";

const CURRENT_VERSION = "0.2.0";

export default function AppUpdater() {
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // التحقق فقط إذا كنا في بيئة المتصفح
    if (typeof window === "undefined") return;

    const checkUpdate = async () => {
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('*')
          .single();

        if (!error && data) {
          const latest = data.latest_version;
          const min = data.min_version;
          
          // دالة مقارنة بسيطة
          const isOutdated = (v: string) => {
            const currentParts = CURRENT_VERSION.split('.').map(Number);
            const targetParts = v.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
              if (targetParts[i] > currentParts[i]) return true;
              if (targetParts[i] < currentParts[i]) return false;
            }
            return false;
          };

          if (isOutdated(min) || (isOutdated(latest) && data.force_update)) {
            setUpdateInfo(data);
            setShowModal(true);
          }
        }
      } catch (err) {
        console.error("Update check failed:", err);
      }
    };

    checkUpdate();
  }, []);

  if (!showModal || !updateInfo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-6" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-[40px] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 blur-[80px] rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-red-500/10 blur-[80px] rounded-full" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-500/10 rounded-[28px] flex items-center justify-center mb-6 border border-blue-500/20">
              <RefreshCw className="w-10 h-10 text-blue-500 animate-spin-slow" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">تحديث جديد متاح</h2>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6">Version {updateInfo.latest_version} Required</p>
            
            <div className="bg-white/5 border border-white/5 p-6 rounded-3xl mb-8 w-full">
              <p className="text-sm text-white/70 leading-relaxed font-bold">
                {updateInfo.update_message || "لقد قمنا بتحسينات كبيرة في الأداء وإضافة مزايا جديدة. يرجى التحديث للاستمتاع بأفضل تجربة."}
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <a 
                href={updateInfo.download_url} 
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
              >
                <Download size={18} />
                تحميل التحديث الآن
              </a>
              
              {!updateInfo.force_update && (
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full py-4 text-white/30 text-[10px] font-black uppercase tracking-widest hover:text-white/50 transition-colors"
                >
                  تحديث لاحقاً
                </button>
              )}
            </div>

            <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
              <ShieldCheck size={12} className="text-green-500" />
              <span className="text-[8px] font-black text-white/30 tracking-[0.2em] uppercase">Verified & Secure Update</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
