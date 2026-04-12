"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StartLogo } from "@/components/StartLogo";
import { useAuth } from "@/components/AuthProvider";
import { ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import Particles from "react-tsparticles";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "tsparticles-engine";

export default function WelcomePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [phase, setPhase] = useState<"intro" | "greeting" | "syncing" | "final">("intro");

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine as any);
  }, []);

  const getRedirectPath = (role: string) => {
    const r = role.toLowerCase();
    if (r === "admin") return "/admin";
    if (r === "vendor") return "/store";
    return "/driver";
  };

  useEffect(() => {
    // Sequence of artistic phases with professional timing
    const timers = [
      setTimeout(() => setPhase("greeting"), 1500),
      setTimeout(() => setPhase("syncing"), 4500),
      setTimeout(() => {
        setPhase("final");
        if (user) {
          const role = user.user_metadata?.role || profile?.role || "driver";
          router.replace(getRedirectPath(role));
        } else {
          router.replace("/login");
        }
      }, 7500)
    ];

    return () => timers.forEach(clearTimeout);
  }, [user, profile, router]);

  return (
    <div className="h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden font-sans select-none" dir="rtl">
      
      {/* 1. Masterpiece Background: Advanced Particles & Premium Gradients */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          background: { color: { value: "transparent" } },
          fpsLimit: 120,
          particles: {
            color: { value: ["#eab308", "#ffffff", "#3b82f6"] },
            links: { 
              color: "#eab308", 
              distance: 150, 
              enable: true, 
              opacity: 0.05, 
              width: 0.5 
            },
            move: { 
              enable: true, 
              speed: 0.4, 
              direction: "none", 
              random: true, 
              straight: false, 
              outModes: { default: "out" } 
            },
            number: { density: { enable: true, area: 800 }, value: 60 },
            opacity: { 
              value: { min: 0.1, max: 0.5 },
              animation: { enable: true, speed: 1, minimumValue: 0.1, sync: false }
            },
            shape: { type: ["circle", "star"] },
            size: { value: { min: 0.5, max: 2 } },
          },
          interactivity: {
            events: {
              onHover: { enable: true, mode: "bubble" },
            },
            modes: {
              bubble: { distance: 200, duration: 2, opacity: 0.8, size: 4 },
            }
          },
          detectRetina: true,
        }}
        className="absolute inset-0 z-0"
      />

      {/* Premium Ambient Glows */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-600/5 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-amber-600/5 rounded-full blur-[160px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)]" />
      </div>

      {/* 2. Main Content Container */}
      <div className="relative z-10 w-full max-w-lg px-8 flex flex-col items-center">
        <AnimatePresence mode="wait">
          
          {/* Phase 1: Masterpiece Logo Intro */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.8, filter: "blur(20px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.2, filter: "blur(40px)", y: -20 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <div className="relative group">
                {/* Outer Rotating Halo */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-40px] border border-white/5 rounded-full"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-25px] border border-dashed border-amber-500/10 rounded-full"
                />
                
                {/* Main Logo with Intense Glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full scale-150 animate-pulse" />
                  <div className="absolute inset-0 bg-amber-500/10 blur-[40px] rounded-full scale-110" />
                  <StartLogo className="w-44 h-46 relative drop-shadow-[0_0_60px_rgba(59,130,246,0.4)] transition-transform duration-700 group-hover:scale-105" />
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="mt-12 flex flex-col items-center gap-2"
              >
                <span className="text-[11px] font-black text-amber-500/60 uppercase tracking-[0.6em] ml-[-0.6em]">Premium Experience</span>
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
              </motion.div>
            </motion.div>
          )}

          {/* Phase 2: Personalized Luxury Greeting */}
          {phase === "greeting" && (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -60, scale: 1.05, filter: "blur(20px)" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel p-12 w-full border-white/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] flex flex-col items-center text-center space-y-10 overflow-hidden group"
            >
              {/* Subtle background highlight */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              
              <motion.div 
                animate={{ y: [0, -12, 0], rotate: [3, -3, 3] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-950 rounded-[32px] flex items-center justify-center shadow-2xl relative border border-white/10"
              >
                <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-full" />
                <StartLogo className="w-14 h-14 text-white z-10" />
                {/* Corner Accents */}
                <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-amber-500/40" />
                <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-amber-500/40" />
              </motion.div>

              <div className="space-y-6 relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-3"
                >
                  <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-500/50" />
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.4em]">Verified Partner</span>
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-500/50" />
                </motion.div>

                <h2 className="text-5xl font-black text-white tracking-tight leading-tight">
                  أهلاً بك،<br/>
                  <span className="bg-gradient-to-r from-white via-blue-200 to-amber-200 bg-clip-text text-transparent">
                    {profile?.full_name?.split(' ')[0] || "شريك النجاح"}
                  </span>
                </h2>
                
                <p className="text-slate-400 font-medium text-base leading-relaxed max-w-[300px] mx-auto opacity-80">
                  نحن نقدّر حضورك في <span className="text-white font-black tracking-widest border-b border-amber-500/30">START</span> القمة
                </p>
              </div>

              <div className="flex items-center gap-4 px-8 py-4 bg-white/[0.03] border border-white/5 rounded-2xl backdrop-blur-md relative group/status">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/status:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-emerald-500 rounded-full -z-10"
                  />
                </div>
                <div className="flex flex-col items-start relative">
                  <span className="text-[10px] font-black text-slate-500 uppercase leading-none tracking-widest">Security Layer</span>
                  <span className="text-[12px] font-black text-white mt-1 uppercase tracking-tighter">Active & Secure</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Phase 3: System Syncing - Masterpiece Edition */}
          {phase === "syncing" && (
            <motion.div
              key="syncing"
              initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
              className="flex flex-col items-center space-y-12"
            >
              <div className="relative w-32 h-32">
                {/* Multiple orbital rings */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-[2px] border-t-amber-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 border border-dashed border-slate-800 rounded-full"
                />
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-8 bg-blue-500/10 rounded-full blur-xl"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-10 h-10 text-amber-500 fill-amber-500/10 animate-pulse" />
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col items-center">
                  <p className="text-white font-black text-sm uppercase tracking-[0.6em] ml-[-0.6em] mb-1">
                    جاري المزامنة
                  </p>
                  <p className="text-amber-500/60 font-bold text-[9px] uppercase tracking-[0.3em] ml-[-0.3em]">
                    Optimizing Environment
                  </p>
                </div>
                
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        scaleY: [1, 2, 1],
                        opacity: [0.3, 1, 0.3],
                        backgroundColor: i % 2 === 0 ? "#eab308" : "#3b82f6"
                      }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                      className="w-[3px] h-4 rounded-full"
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
        className="absolute bottom-12 flex flex-col items-center gap-4 z-10"
      >
        <div className="flex items-center gap-3 opacity-60">
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-white/20" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.5em] ml-[-0.5em]">Exclusive Version</span>
          <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-white/20" />
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Powered By</span>
            <span className="text-[11px] font-black text-white/80 tracking-widest">QUANTUM CORE</span>
          </div>
          <div className="w-[1px] h-6 bg-white/10" />
          <div className="flex flex-col items-start">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Version</span>
            <span className="text-[11px] font-black text-amber-500/80 tracking-widest">0.6.0.PRO</span>
          </div>
        </div>
      </motion.div>

      {/* Luxury Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] z-20 opacity-20" />
    </div>
  );
}
