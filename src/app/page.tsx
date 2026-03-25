"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile } from "@/lib/auth";
import { StartLogo } from "@/components/StartLogo";
import { isNative, downloadLiveUpdate } from "@/lib/native-utils";

export default function SplashPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Checking System...");

  useEffect(() => {
    let isMounted = true;

    const checkAppAndRedirect = async () => {
      // Safety timeout after 8 seconds regardless of what happens
      const safetyTimeout = setTimeout(() => {
        if (isMounted) {
          console.log("Splash: Safety timeout reached, forcing redirect to login");
          router.replace("/login");
        }
      }, 8000);

      try {
        // 1. Native update check (non-blocking)
        if (isNative()) {
          setStatus("Checking for updates...");
          try {
            const { data: config } = await supabase.from('app_config').select('bundle_url, latest_version').single();
            if (config?.bundle_url) {
              await downloadLiveUpdate(config.bundle_url, config.latest_version);
            }
          } catch (e) {
            console.warn('Splash: Native update check failed:', e);
          }
        }

        // 2. Auth check
        setStatus("Securing Connection...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session?.user) {
          setStatus("Loading Profile...");
          const profile = await getUserProfile(session.user.id);
          if (profile && isMounted) {
            const normalizedRole = profile.role?.toLowerCase();
            if (normalizedRole === "admin") router.replace("/admin");
            else if (normalizedRole === "driver") router.replace("/driver");
            else if (normalizedRole === "vendor") router.replace("/vendor");
            else router.replace("/login");
            clearTimeout(safetyTimeout);
            return;
          }
        }

        if (isMounted) {
          router.replace("/login");
          clearTimeout(safetyTimeout);
        }
      } catch (err) {
        console.error("Splash error:", err);
        if (isMounted) {
          router.replace("/login");
          clearTimeout(safetyTimeout);
        }
      }
    };

    checkAppAndRedirect();

    return () => {
      isMounted = false;
    };
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
        <motion.div
          animate={{ 
            boxShadow: ["0 0 20px rgba(0,71,255,0.2)", "0 0 60px rgba(0,71,255,0.4)", "0 0 20px rgba(0,71,255,0.2)"]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="rounded-full p-1 mb-8"
        >
          <StartLogo className="w-32 h-32" />
        </motion.div>

        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
          START <span className="text-white/40 font-light">LOCATION</span>
        </h1>
        
        <div className="flex items-center gap-3 opacity-40">
          <div className="h-px w-8 bg-white" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Initializing OS</p>
          <div className="h-px w-8 bg-white" />
        </div>

        {/* Loading Indicator */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  delay: i * 0.2 
                }}
                className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"
              />
            ))}
          </div>
          <p className="text-[9px] font-bold text-blue-400/60 uppercase tracking-widest min-h-[1.5em]">
            {status}
          </p>
        </div>
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute bottom-10 left-10 opacity-10">
        <div className="text-[8px] font-black text-white tracking-[1em] uppercase vertical-text">v0.2.0 • START-OS</div>
      </div>
    </main>
  );
}
