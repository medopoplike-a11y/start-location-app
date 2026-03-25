"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile } from "@/lib/auth";
import { StartLogo } from "@/components/StartLogo";
import { isNative, downloadLiveUpdate } from "@/lib/native-utils";

export default function SplashPage() {
  if (process.env.IS_BUILDING) {
    return <div />;
  }

  const router = useRouter();
  const [status, setStatus] = useState("Checking System...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Force body background to be matte silver
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#f3f4f6';
      document.body.style.color = '#1f2937';
    }

    let isMounted = true;

    const checkAppAndRedirect = async () => {
      console.log("Splash: Starting check...");
      setStatus("Loading System...");
      
      // Safety timeout after 10 seconds regardless of what happens
      const safetyTimeout = setTimeout(() => {
        if (isMounted) {
          console.log("Splash: Safety timeout reached, forcing redirect to login");
          router.replace("/login");
        }
      }, 10000);

      try {
        // 0. Check Supabase Config
        if (!supabase.auth) {
          throw new Error("Supabase client not initialized correctly. Check URL/Key.");
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey || supabaseKey.includes('placeholder')) {
          console.warn("Splash: Supabase config looks incomplete", { url: !!supabaseUrl, key: !!supabaseKey });
          // We continue anyway, but this is a likely point of failure
        }
        
        if (supabaseKey && !supabaseKey.startsWith('eyJ')) {
          console.warn("Splash: Supabase Anon Key format looks unusual. Expected JWT.");
        }

        // 1. Native update check (non-blocking)
        if (isNative()) {
          console.log("Splash: Native environment detected");
          setStatus("Checking for updates...");
          try {
            const { data: config, error: configError } = await supabase.from('app_config').select('bundle_url, latest_version').single();
            if (configError) {
              console.warn('Splash: App config fetch failed:', configError);
            } else if (config?.bundle_url) {
              console.log("Splash: Update found, downloading...");
              await downloadLiveUpdate(config.bundle_url, config.latest_version);
            }
          } catch (e) {
            console.warn('Splash: Native update check failed:', e);
          }
        }

        // 2. Auth check
        setStatus("Securing Connection...");
        console.log("Splash: Getting session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Splash: Session error:", sessionError);
          throw new Error(`Auth Error: ${sessionError.message}`);
        }

        if (session?.user) {
          console.log("Splash: User session found:", session.user.id);
          setStatus("Loading Profile...");
          const profile = await getUserProfile(session.user.id);
          if (profile && isMounted) {
            const normalizedRole = profile.role?.toLowerCase();
            console.log("Splash: Profile found, role:", normalizedRole);
            if (normalizedRole === "admin") router.replace("/admin");
            else if (normalizedRole === "driver") router.replace("/driver");
            else if (normalizedRole === "vendor") router.replace("/vendor");
            else router.replace("/login");
            clearTimeout(safetyTimeout);
            return;
          } else {
            console.warn("Splash: Profile not found for user");
          }
        } else {
          console.log("Splash: No session found");
        }

        if (isMounted) {
          router.replace("/login");
          clearTimeout(safetyTimeout);
        }
      } catch (err: any) {
        console.error("Splash CRITICAL error:", err);
        if (isMounted) {
          setError(err.message || String(err));
          // Don't redirect immediately on error so user can see it
          setTimeout(() => {
            if (isMounted && !error) router.replace("/login");
          }, 5000);
          clearTimeout(safetyTimeout);
        }
      }
    };

    checkAppAndRedirect().catch(e => {
      console.error("Splash: Uncaught error in checkAppAndRedirect:", e);
      if (isMounted) setError(`Fatal: ${e.message}`);
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

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
      </motion.div>
    </div>
  );
}
