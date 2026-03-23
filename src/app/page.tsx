"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { StartLogo } from "@/components/StartLogo";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 4500);
    return () => clearTimeout(timer);
  }, [router]);

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
        {/* Floating Glass Logo */}
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="drop-shadow-[0_20px_30px_rgba(0,71,255,0.3)]"
        >
          <StartLogo className="w-48 h-48 md:w-56 md:h-56" />
        </motion.div>

        {/* Futuristic Typography */}
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

      {/* System Status Footer */}
      <div className="absolute bottom-12 flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">System Online</span>
      </div>
    </main>
  );
}
