"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { StartLogo } from "@/components/StartLogo";
import { useAuth } from "@/components/AuthProvider";

export default function SplashPage() {
  if (process.env.IS_BUILDING) {
    return <div />;
  }

  const router = useRouter();
  const [status, setStatus] = useState("Checking System...");
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Force body background to be matte silver
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#f3f4f6';
      document.body.style.color = '#1f2937';
    }
  }, []);

  useEffect(() => {
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
  }, [loading, user, profile, router]);

  const handlePanicLogout = async () => {
    const { signOut } = await import("@/lib/auth");
    await signOut();
  };

  // Global Error Handler for "This page couldn't load"
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error("Splash: Global error caught", e);
      if (e.message?.includes("Hydration")) {
        window.location.reload();
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center p-8 overflow-hidden relative" dir="rtl">
      {/* Background Live Silver Effect */}
      <div className="silver-live-bg" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
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
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Start <span className="text-blue-600">Location</span></h1>
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
