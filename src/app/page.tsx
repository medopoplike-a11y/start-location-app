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
    // Force body background to be dark even if CSS fails
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#000814';
      document.body.style.color = 'white';
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
          setStatus("Checking for Cloud Updates...");
          try {
            const { data: config, error: configError } = await supabase.from('app_config').select('bundle_url, latest_version').single();
            if (configError) {
              console.warn('Splash: App config fetch failed:', configError);
              setStatus("Starting Offline Mode...");
            } else if (config?.bundle_url) {
              setStatus(`Updating OS to v${config.latest_version}...`);
              await downloadLiveUpdate(config.bundle_url, config.latest_version);
              // If downloadLiveUpdate succeeds, it will reload the app
              return;
            }
          } catch (e) {
            console.warn('Splash: Native update check failed:', e);
            setStatus("Starting System...");
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
    <main 
      className="min-h-screen bg-[#000814] flex flex-col items-center justify-center relative font-sans overflow-hidden"
      style={{ backgroundColor: '#000814', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Animated Digital Grid Background */}
      <div className="absolute inset-0 z-0" style={{ position: 'absolute', inset: 0 }}>
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
          style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.07) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div 
          className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_50%,#0047FF33,transparent)]"
          style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle 500px at 50% 50%, rgba(0,71,255,0.2), transparent)' }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="rounded-full p-1 mb-8">
          <StartLogo className="w-32 h-32" />
        </div>

        <h1 className="text-5xl font-black text-white tracking-tighter mb-2" style={{ color: 'white', fontWeight: 900, fontSize: '3rem' }}>
          START <span className="text-white/40 font-light" style={{ opacity: 0.4, fontWeight: 300 }}>LOCATION</span>
        </h1>
        
        <div className="flex items-center gap-3 opacity-40" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.4 }}>
          <div className="h-px w-8 bg-white" style={{ height: '1px', width: '2rem', backgroundColor: 'white' }} />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white" style={{ color: 'white', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5em' }}>Initializing OS</p>
          <div className="h-px w-8 bg-white" style={{ height: '1px', width: '2rem', backgroundColor: 'white' }} />
        </div>

        {/* Loading Indicator or Error */}
        <div className="mt-12 flex flex-col items-center gap-4" style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          {!error ? (
            <>
              <div className="flex gap-1.5" style={{ display: 'flex', gap: '0.375rem' }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse"
                    style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#3b82f6' }}
                  />
                ))}
              </div>
              <p className="text-[9px] font-bold text-blue-400/60 uppercase tracking-widest min-h-[1.5em]" style={{ color: 'rgba(96,165,250,0.6)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {status}
              </p>
            </>
          ) : (
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg max-w-xs text-center">
              <p className="text-red-400 text-xs font-bold mb-2">CRITICAL ERROR</p>
              <p className="text-white text-[10px] break-all">{error}</p>
              <button 
                onClick={() => router.replace("/login")}
                className="mt-4 px-4 py-2 bg-red-500 text-white text-[10px] font-bold rounded"
              >
                GO TO LOGIN
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
