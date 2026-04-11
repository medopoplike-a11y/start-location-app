"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StartLogo } from "@/components/StartLogo";
import { useAuth } from "@/components/AuthProvider";
import { ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import type { Engine } from "tsparticles-engine";

export default function WelcomePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [phase, setPhase] = useState<"intro" | "greeting" | "syncing" | "final">("intro");

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const getRedirectPath = (role: string) => {
    const r = role.toLowerCase();
    if (r === "admin") return "/admin";
    if (r === "vendor") return "/store";
    return "/driver";
  };

  useEffect(() => {
    // Sequence of artistic phases
    const timers = [
      setTimeout(() => setPhase("greeting"), 1200),
      setTimeout(() => setPhase("syncing"), 3500),
      setTimeout(() => {
        setPhase("final");
        if (user) {
          const role = user.user_metadata?.role || profile?.role || "driver";
          router.replace(getRedirectPath(role));
        } else {
          router.replace("/login");
        }
      }, 5500)
    ];

    return () => timers.forEach(clearTimeout);
  }, [user, profile, router]);

  return (
    <div className="h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden font-sans select-none" dir="rtl">
      
      {/* 1. Masterpiece Background: Particles & Gradients */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          background: { color: { value: "transparent" } },
          fpsLimit: 120,
          particles: {
            color: { value: ["#3b82f6", "#10b981", "#6366f1"] },
            links: { color: "#3b82f6", distance: 150, enable: true, opacity: 0.1, width: 1 },
            move: { enable: true, speed: 0.6, direction: "none", random: true, straight: false, outModes: { default: "out" } },
            number: { density: { enable: true, area: 800 }, value: 40 },
            opacity: { value: 0.3 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 3 } },
          },
          detectRetina: true,
        }}
        className="absolute inset-0 z-0"
      />

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* 2. Main Content Container */}
      <div className="relative z-10 w-full max-w-lg px-8 flex flex-col items-center">
        <AnimatePresence mode="wait">
          
          {/* Phase 1: Logo Intro */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
              transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/30 blur-[60px] rounded-full scale-125" />
                <StartLogo className="w-40 h-42 relative drop-shadow-[0_0_50px_rgba(59,130,246,0.6)]" />
              </div>
            </motion.div>
          )}

          {/* Phase 2: Personalized Greeting */}
          {phase === "greeting" && (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="glass-panel p-10 w-full border-white/10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.7)] flex flex-col items-center text-center space-y-8"
            >
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-[28px] flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3"
              >
                <StartLogo className="w-12 h-12 text-white" />
              </motion.div>

              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2"
                >
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Access Authorized</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </motion.div>

                <h2 className="text-4xl font-black text-white tracking-tight leading-tight">
                  مرحباً بك مجدداً،<br/>
                  <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    {profile?.full_name?.split(' ')[0] || "شريك النجاح"}
                  </span>
                </h2>
                
                <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-[280px] mx-auto">
                  نسعد برؤيتك مرة أخرى في منصة <span className="text-white font-black">START</span> المتكاملة
                </p>
              </div>

              <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div className="flex flex-col items-start">
                  <span className="text-[9px] font-black text-slate-500 uppercase leading-none">Security Status</span>
                  <span className="text-[11px] font-black text-white mt-1 uppercase tracking-wider">End-to-End Encrypted</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Phase 3: System Syncing */}
          {phase === "syncing" && (
            <motion.div
              key="syncing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center space-y-8"
            >
              <div className="relative w-24 h-24">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-[3px] border-t-blue-500 border-r-transparent border-b-emerald-500 border-l-transparent rounded-full"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 border border-dashed border-slate-700 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-blue-400 fill-blue-400/20 animate-pulse" />
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <p className="text-white font-black text-xs uppercase tracking-[0.4em] animate-pulse">
                  Syncing Workspace
                </p>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1 h-1 bg-blue-500 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 3. Luxury Footer Branding */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4"
      >
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
        <div className="flex flex-col items-center">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.6em] mb-2">Developed By</p>
          <div className="flex items-center gap-3 scale-110">
            <StartLogo className="w-6 h-6 grayscale opacity-50" />
            <div className="flex items-center gap-1.5 italic">
              <span className="text-slate-400 font-black text-sm tracking-tighter">START</span>
              <span className="text-blue-600 font-black text-sm tracking-tighter">LOCATION</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Luxury Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] z-20 opacity-20" />
    </div>
  );
}
