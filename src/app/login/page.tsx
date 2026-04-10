"use client";

import { signIn } from "@/lib/auth";
import { config } from "@/lib/config";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { StartLogo } from "@/components/StartLogo";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";

const isSupabaseConfigured = config.isConfigured();

const LoginPage = () => {
  const { toasts, removeToast } = useToast();
  const getRedirectPath = (role: string) => {
    const r = role.toLowerCase();
    if (r === "admin") return "/admin";
    if (r === "vendor") return "/store";
    return "/driver";
  };

  const VERSION = "v0.5.9-PRO";

  const router = useRouter();
  const { user, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [diagInfo, setDiagInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [otaStatus, setOtaStatus] = useState<string>("جاري فحص التحديثات...");
  const [mounted, setMounted] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsKeyboardOpen(window.innerHeight < 500);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMounted(true);
    // Check for logged_out param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('logged_out') === 'true') {
        console.log("LoginPage: Detected explicit logout, blocking auto-redirect");
        setIsLoggedOut(true);
        // Clear param without reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  // Watch for authentication from AuthProvider
  useEffect(() => {
    if (user && mounted && !isLoggedOut) {
      console.log("LoginPage: User detected from AuthProvider, redirecting...");
      const role = user.user_metadata?.role || profile?.role || "driver";
      router.replace(getRedirectPath(role));
    }
  }, [user, profile, router, mounted, isLoggedOut]);

  // Optimized session check - kept for immediate redirect on mount
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        if (isLoggedOut) return;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          console.log("LoginPage: Session exists on mount, resolving role...");
          const role = session.user.user_metadata?.role || "driver";
          router.replace(getRedirectPath(role));
        }
      } catch (err) {
        console.log("LoginPage: Initial session check skipped");
      }
    };
    if (mounted && !isLoggedOut) checkSession();
    return () => { isMounted = false; };
  }, [router, mounted, isLoggedOut]);

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
    if (loading) return; // Prevent double clicks
    
    setLoading(true);
    setError(""); // Clear old errors
    setStatus("جاري تسجيل الدخول...");
    
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
    } catch (e) {}

    try {
      console.log("LoginPage: Attempting signIn for", email);
      // Clean up any old session data before trying to sign in
      if (typeof window !== 'undefined') {
        localStorage.removeItem('start-location-v1-session');
      }
      
      const { data, error: loginError } = await signIn(email.trim(), password);

      if (loginError) {
        console.error("LoginPage: signIn error", loginError);
        setError(loginError.message);
        setStatus("");
        setLoading(false);
        return;
      }

      if (!data?.user) {
        console.error("LoginPage: signIn returned no user");
        setError("فشل تسجيل الدخول: لم يتم العثور على بيانات المستخدم");
        setStatus("");
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

      // Faster redirect for web, keep delay for native persistence
      const redirectDelay = (window as any).Capacitor?.isNativePlatform?.() ? 800 : 100;

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
            if (adminEmails.includes(email.trim().toLowerCase())) {
              role = "admin";
              console.log("LoginPage: Role identified as Admin via email");
            }
          }

          // Default to driver if absolutely nothing found
          const finalRole = role || "driver";
          const target = getRedirectPath(finalRole);
          
          console.log(`LoginPage: Final Role identified as ${finalRole}, Redirecting to ${target}`);
          
          // Use window.location as fallback for router issues
          // IMPORTANT: On web, window.location.assign is more robust than router.replace for hard redirects
          if (typeof window !== 'undefined' && !(window as any).Capacitor?.isNativePlatform?.()) {
            window.location.href = target; // href is even more robust for full page loads
          } else {
            if (router) router.replace(target);
            else window.location.assign(target);
          }
        } catch (redirErr) {
          console.error("LoginPage: Redirection failed", redirErr);
          window.location.assign("/driver"); 
        }
      }, redirectDelay);
    } catch (err: any) {
      console.error("LoginPage: Unexpected error", err);
      setError(`حدث خطأ غير متوقع: ${err.message || "حاول مرة أخرى"}`);
      setStatus("");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#020617] relative overflow-hidden font-sans flex flex-col items-center justify-center p-6" dir="rtl">
      <Toast toasts={toasts} onRemove={removeToast} />
      
      {/* Animated Background - Deep Glass Glow */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[#020617]" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[140px] animate-pulse delay-1000" />
      </div>

      <main className="relative z-10 w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="glass-panel p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group"
        >
          {/* Internal Glow Effect */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
          
          <AnimatePresence>
            {!isKeyboardOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center mb-12 relative z-10"
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full scale-150 animate-pulse" />
                  <StartLogo className="w-24 h-24 relative drop-shadow-2xl" />
                </div>
                <h1 className="text-4xl font-black tracking-tighter mb-1 flex items-center gap-2 italic" dir="ltr">
                  <span className="text-white drop-shadow-sm">Start</span>
                  <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent not-italic">Location</span>
                </h1>
                <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase opacity-80">
                  Smart Delivery System
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {diagInfo && (
            <div className="mb-6 p-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl text-[10px] font-black text-blue-400 text-center backdrop-blur-md animate-pulse">
              {diagInfo}
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[10px] font-black text-red-400 backdrop-blur-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              تنبيه النظام: الاتصال غير مستقر حالياً
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-4 flex items-center gap-2">
                <Mail className="w-3 h-3 text-blue-500" />
                البريد الإلكتروني
              </label>
              <div className="relative group">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-white/5 border border-white/5 pl-5 pr-12 py-4 text-white placeholder:text-slate-600 outline-none transition-all focus:bg-white/10 focus:border-blue-500/30 rounded-[1.5rem] font-bold"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-4 flex items-center gap-2">
                <Lock className="w-3 h-3 text-emerald-500" />
                كلمة المرور
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/5 pl-14 pr-12 py-4 text-white placeholder:text-slate-600 outline-none transition-all focus:bg-white/10 focus:border-emerald-500/30 rounded-[1.5rem] font-bold"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer"
                />
              </div>
              <label htmlFor="rememberMe" className="text-[11px] font-black text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                تذكر بيانات الدخول
              </label>
            </div>

            {(error || status) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-2xl px-4 py-4 text-[11px] font-black flex items-center gap-3 backdrop-blur-xl border ${
                  error 
                    ? "bg-red-500/10 text-red-400 border-red-500/20" 
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />}
                <span>{error || status}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full relative overflow-hidden rounded-[1.5rem] py-5 text-sm font-black text-white transition-all shadow-2xl active:scale-[0.98] ${
                !isSupabaseConfigured 
                  ? "bg-red-600/80" 
                  : "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-blue-500/20"
              } disabled:opacity-50`}
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري التحقق...</span>
                  </>
                ) : (
                  <span>دخول للنظام الآمن</span>
                )}
              </div>
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
            </button>
          </form>

          {!isKeyboardOpen && (
            <div className="mt-10 pt-6 border-t border-white/5 flex flex-col gap-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase">{VERSION}</span>
                <div className="flex items-center gap-2 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
                  <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black text-emerald-500/80 uppercase">System Encrypted</span>
                </div>
              </div>
              
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm group/ota hover:bg-white/10 transition-all cursor-pointer" onClick={() => checkConnection()}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[8px] font-black text-blue-400/60 uppercase tracking-widest group-hover/ota:text-blue-400 transition-colors">Cloud Connectivity</p>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-red-500"}`} />
                </div>
                <p className="text-[10px] text-slate-500 font-black group-hover/ota:text-slate-400 transition-colors">{otaStatus}</p>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
