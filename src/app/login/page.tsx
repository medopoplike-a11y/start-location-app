"use client";

import { signIn } from "@/lib/auth";
import { config } from "@/lib/config";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { StartLogo } from "@/components/StartLogo";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

const isSupabaseConfigured = config.isConfigured();

const getRedirectPath = (role?: string) => {
  if (!role) return "/driver/";
  const normalized = role.toLowerCase();
  if (normalized === "admin") return "/admin/";
  if (normalized === "vendor") return "/store/";
  return "/driver/";
};

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [diagInfo, setDiagInfo] = useState<string | null>(null);
  const [otaStatus, setOtaStatus] = useState<string>("جاري فحص التحديثات...");

  // Simple session check to avoid loop
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log("LoginPage: Session exists, checking role...");
        
        let role = session.user.user_metadata?.role;
        
        if (!role) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          role = profile?.role;
        }

        const finalRole = role || "driver";
        router.replace(getRedirectPath(finalRole));
      }
    };
    checkSession();
  }, [router]);

  // Load remembered email
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('remembered_email');
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
      setOtaStatus("نظام التحديث التلقائي نشط");
    }
  }, []);

  const checkConnection = async () => {
    try {
      const start = Date.now();
      const response = await fetch(`${config.supabase.url}/auth/v1/health`, {
        headers: { apikey: config.supabase.anonKey }
      });
      const end = Date.now();
      if (response.ok) {
        setDiagInfo(`✅ تم الاتصال بالسيرفر (${end - start}ms)`);
      } else {
        setDiagInfo(`❌ فشل الاتصال: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      setDiagInfo(`❌ خطأ في الشبكة: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
    
    // Auto-hide diagnostic info after 5 seconds
    setTimeout(() => setDiagInfo(null), 5000);
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus("جاري تسجيل الدخول...");
    
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
    } catch (e) {}

    try {
      const { data, error: loginError } = await signIn(email.trim(), password);

      if (loginError) {
        setStatus(`خطأ: ${loginError.message}`);
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setStatus("فشل تسجيل الدخول: لم يتم العثور على بيانات المستخدم");
        setLoading(false);
        return;
      }

      setStatus("تم تسجيل الدخول بنجاح! جاري الانتقال...");
      
      // Save email for next time
      if (typeof window !== 'undefined' && rememberMe) {
        localStorage.setItem('remembered_email', email.trim());
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('remembered_email');
      }

      // Essential delay for storage persistence before redirect
      setTimeout(async () => {
        try {
          console.log("LoginPage: Auth delay finished, fetching role...");
          let role = "";
          
          // 1. Check metadata first (fastest)
          const metadataRole = data.user.user_metadata?.role;
          if (metadataRole) {
            role = String(metadataRole).toLowerCase();
            console.log("LoginPage: Role from metadata:", role);
          }
          
          // 2. Fallback to profile fetch (most reliable)
          if (!role) {
            console.log("LoginPage: No role in metadata, fetching profile from DB...");
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.user.id)
              .maybeSingle();
            
            if (profile?.role) {
              role = profile.role.toLowerCase();
              console.log("LoginPage: Role from DB:", role);
            } else if (profileError) {
              console.error("LoginPage: Profile fetch error", profileError);
            }
          }
          
          // 3. Admin email check as ultimate fallback
          if (!role && email) {
            const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").toLowerCase().split(",");
            if (adminEmails.includes(email.toLowerCase())) {
              role = "admin";
              console.log("LoginPage: Role identified as Admin via email");
            }
          }

          // Default to driver if absolutely nothing found
          const finalRole = role || "driver";
          const target = getRedirectPath(finalRole);
          
          console.log(`LoginPage: Final Role identified as ${finalRole}, Redirecting to ${target}`);
          
          // Use window.location as fallback for router issues
          if (router) router.replace(target);
          else window.location.assign(target);
        } catch (redirErr) {
          console.error("LoginPage: Redirection failed", redirErr);
          window.location.assign("/driver"); 
        }
      }, 1500);
    } catch (err: any) {
      console.error("LoginPage: Unexpected error", err);
      setStatus(`حدث خطأ غير متوقع: ${err.message || "حاول مرة أخرى"}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative" dir="rtl">
      {/* Optimized Background (Minimal performance impact) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.03),transparent_40%)]" />

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10 glass-morphism rounded-[2.5rem] p-8 md:p-10 premium-glow"
      >
        <div className="flex flex-col items-center mb-8" onClick={checkConnection}>
          <StartLogo className="w-20 h-20 mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] cursor-pointer" />
          <h1 className="text-3xl font-black mb-1 bg-gradient-to-r from-blue-400 via-red-500 to-yellow-500 text-transparent bg-clip-text drop-shadow-sm">
            Start Location
          </h1>
        </div>

        {diagInfo && (
          <div className="mb-4 p-3 bg-black/40 border border-blue-500/30 rounded-xl text-[10px] font-mono text-blue-300 text-center animate-pulse">
            {diagInfo}
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200 backdrop-blur-md">
            ⚠️ تنبيه النظام: Supabase غير مهيأ.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">
              البريد الإلكتروني
            </label>
            <div className="relative group">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="user@example.com"
                className="w-full bg-slate-900/40 border border-white/5 px-5 py-4 text-white placeholder:text-slate-600 outline-none transition-all focus:border-blue-500/50 rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">
              كلمة المرور
            </label>
            <div className="relative group">
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/40 border border-white/5 px-5 py-4 text-white placeholder:text-slate-600 outline-none transition-all focus:border-blue-500/50 rounded-2xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900/40 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="rememberMe" className="text-xs font-bold text-slate-400">
              تذكر البريد الإلكتروني
            </label>
          </div>

          {(error || status) && (
            <div className={`rounded-2xl px-4 py-3 text-xs font-medium ${
              error ? "bg-red-500/10 text-red-200 border border-red-500/20" : "bg-blue-500/10 text-blue-200 border border-blue-500/20"
            }`}>
              {error || status}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full relative overflow-hidden rounded-2xl py-4 text-sm font-black text-white transition-all shadow-lg ${
              !isSupabaseConfigured 
                ? "bg-red-600" 
                : "bg-gradient-to-r from-blue-600 via-red-600 to-yellow-500 hover:shadow-blue-500/25 active:scale-[0.98]"
            } disabled:opacity-50`}
          >
            {loading ? "جاري التحقق..." : "تسجيل الدخول"}
          </button>
        </form>

          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">v0.5.4-GOLD</span>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-[7px] font-black text-yellow-500/80 uppercase">نظام التحديث الذكي: نشط ومستقر</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-[9px] text-slate-500">{isSupabaseConfigured ? "متصل" : "غير متصل"}</span>
            </div>
          </div>
          <div className="p-2 bg-white/5 rounded-lg border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">حالة التحديث OTA</p>
              <button 
                disabled={otaStatus.includes("جاري")}
                onClick={async () => {
                  setOtaStatus("جاري الفحص الإجباري...");
                  try {
                    const { checkForAutoUpdate } = await import("@/lib/native-utils");
                    const res = await checkForAutoUpdate(true);
                    if (res.available) {
                      setOtaStatus(`تم العثور على تحديث v${res.version} - جاري التثبيت...`);
                    } else if (res.reason === 'COOLDOWN') {
                      setOtaStatus("يرجى الانتظار 5 دقائق بين كل فحص يدوي.");
                    } else {
                      setOtaStatus(`لا توجد نسخ جديدة (DB: ${res.version || "???"}) - السبب: ${res.reason || "غير معروف"}`);
                    }
                  } catch (e: any) {
                    setOtaStatus(`فشل الفحص: ${e.message}`);
                  }
                }}
                className={`text-[7px] font-black bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md hover:bg-blue-500/40 transition-all active:scale-95 ${otaStatus.includes("جاري") ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                فحص إجباري الآن
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-bold">{otaStatus}</p>
          </div>
        </div>
      </motion.section>
    </main>
  );
};

export default LoginPage;
