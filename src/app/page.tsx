"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { StartLogo } from "@/components/StartLogo";
import { useAuth } from "@/components/AuthProvider";

const neonColors = ["#0ea5e9", "#818cf8", "#8b5cf6", "#06b6d4", "#34d399"];

export default function SplashPage() {
  const isBuilding = Boolean(process.env.IS_BUILDING);
  const router = useRouter();
  const [status, setStatus] = useState("Checking System...");
  const [neonColor, setNeonColor] = useState(neonColors[0]);
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (isBuilding) return;
    // Force body background to be matte silver with subtle pulsating gradient
    if (typeof document !== 'undefined') {
      document.body.style.background = 'radial-gradient(circle at 10% 20%, #e0efff 0%, #cbd5e1 45%, #f3f4f6 100%)';
      document.body.style.color = '#0f172a';
    }
    const colorInterval = setInterval(() => {
      setNeonColor(neonColors[Math.floor(Math.random() * neonColors.length)]);
    }, 1500);
    return () => clearInterval(colorInterval);
  }, [isBuilding]);

  useEffect(() => {
    if (isBuilding) return;
    if (loading) {
      setStatus("Initializing Start-OS...");
    } else if (user && !profile) {
      setStatus("Syncing Profile...");
    } else if (!user) {
      setStatus("Entering System...");
      const timer = setTimeout(() => {
        router.replace("/login");
      }, 1500);
      return () => clearTimeout(timer);
    } else if (user && profile) {
      setStatus("Welcome back!");
      const role = profile.role?.toLowerCase();
      const timer = setTimeout(() => {
        router.replace(`/${role}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isBuilding, loading, user, profile, router]);

  const handlePanicLogout = async () => {
    const { signOut } = await import("@/lib/auth");
    await signOut();
  };

  // Global Error Handler for "This page couldn't load"
  useEffect(() => {
    if (isBuilding) return;
    const handleError = (e: ErrorEvent) => {
      console.error("Splash: Global error caught", e);
      if (e.message?.includes("Hydration")) {
        window.location.reload();
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [isBuilding]);

  if (isBuilding) {
    return <div />;
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center p-8 overflow-hidden relative" dir="rtl">
      {/* Background Live Silver Effect */}
      <div className="silver-live-bg" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="wicked-glow-mask" />
        <div className="grid grid-cols-4 gap-5 p-8 opacity-30">
          {[...Array(8)].map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.45, 0.1] }}
              transition={{ duration: 6 + index, repeat: Infinity, ease: "easeInOut" }}
              className="h-24 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl blur-xl"
            />
          ))}
        </div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 flex flex-col items-center gap-12"
      >
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-blue-400 blur-3xl rounded-full"
          />
          <StartLogo className="w-32 h-32 relative z-10 drop-shadow-2xl" />
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.75)]">Start <span className="text-[rgba(168,85,247,0.94)]">Location</span></h1>
          <div className="relative">
            <motion.div
              animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.07, 1] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-4 rounded-3xl bg-[radial-gradient(circle,rgba(56,189,248,0.35),transparent 60%)] blur-2xl"
            />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] z-10 relative" style={{ color: neonColor, textShadow: `0 0 18px ${neonColor}, 0 0 34px #475569` }}>
              {status}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                />
              ))}
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{status}</p>
          </div>
        </div>

        {/* Panic Mode - Only shows if stuck */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5 }}
          className="mt-8"
        >
          <button 
            onClick={handlePanicLogout}
            className="px-6 py-2 bg-white/50 backdrop-blur-sm border border-white/40 rounded-full text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors"
          >
            إذا علق النظام، اضغط هنا لتسجيل الخروج
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
