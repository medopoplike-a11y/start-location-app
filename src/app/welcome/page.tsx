"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StartLogo } from "@/components/StartLogo";
import { useAuth } from "@/components/AuthProvider";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [phase, setPhase] = useState<"greeting" | "loading" | "redirecting">("greeting");

  const getRedirectPath = (role: string) => {
    const r = role.toLowerCase();
    if (r === "admin") return "/admin";
    if (r === "vendor") return "/store";
    return "/driver";
  };

  useEffect(() => {
    // Phase 1: Show Greeting for 2.5 seconds
    const timer1 = setTimeout(() => setPhase("loading"), 2500);
    
    // Phase 2: Show Loading for 1.5 seconds then redirect
    const timer2 = setTimeout(() => {
      setPhase("redirecting");
      if (user) {
        const role = user.user_metadata?.role || profile?.role || "driver";
        router.replace(getRedirectPath(role));
      } else {
        router.replace("/login");
      }
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [user, profile, router]);

  return (
    <div className="h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden font-sans" dir="rtl">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-8">
        <AnimatePresence mode="wait">
          {phase === "greeting" && (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center space-y-8"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150" />
                <StartLogo className="w-32 h-32 relative drop-shadow-[0_0_40px_rgba(59,130,246,0.4)]" />
              </div>
              
              <div className="space-y-3">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-black text-white tracking-tight"
                >
                  مرحباً بك، {profile?.full_name?.split(' ')[0] || "شريكنا"}
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-slate-400 font-bold text-sm tracking-wide"
                >
                  نحن نجهز مساحة عملك الذكية الآن
                </motion.p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Secure Access Granted</span>
              </div>
            </motion.div>
          )}

          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="relative w-20 h-20">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-emerald-500 border-l-transparent rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                </div>
              </div>
              <p className="text-slate-500 font-black text-[11px] uppercase tracking-[0.3em] animate-pulse">
                Syncing your workspace...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center"
      >
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] mb-2">Powered By</p>
        <div className="flex items-center gap-2 italic">
          <span className="text-slate-400 font-black text-xs">Start</span>
          <span className="text-blue-500 font-black text-xs">Location</span>
        </div>
      </motion.div>
    </div>
  );
}
