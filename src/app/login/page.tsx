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
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle2, Loader2, Download, RefreshCw, ShieldCheck, Globe } from "lucide-react";
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

  const VERSION = "v0.6.0-ULTIMATE";

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
  const [otaStatus, setOtaStatus] = useState<string>("جاري فحص حالة النظام...");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const fetchAppConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('latest_version, download_url')
          .eq('id', 1)
          .single();
        if (data && !error) {
          setLatestVersion(data.latest_version);
          setDownloadUrl(data.download_url);
        }
      } catch (e) {
        console.error("Failed to fetch app config:", e);
      }
    };
    fetchAppConfig();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      setIsMobileDevice(isMobile);
    }
  }, []);

  const handleUpdateCheck = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    
    // Trigger the actual update logic in AppWrapper via custom event
    const event = new CustomEvent('retryUpdate');
    window.dispatchEvent(event);
    
    // Refresh the latest version from DB
    try {
      const { data } = await supabase
        .from('app_config')
        .select('latest_version')
        .eq('id', 1)
        .single();
      if (data) setLatestVersion(data.latest_version);
    } catch (e) {}
    
    setTimeout(() => setCheckingUpdate(false), 2000);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsKeyboardOpen(window.innerHeight < 550);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('logged_out') === 'true') {
          setIsLoggedOut(true);
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user && mounted && !isLoggedOut) {
      const role = user.user_metadata?.role || profile?.role || "driver";
      router.replace(getRedirectPath(role));
    }
  }, [user, profile, router, mounted, isLoggedOut]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const savedEmail = localStorage.getItem('remembered_email');
        if (savedEmail) setEmail(savedEmail);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        setOtaStatus("نظام التحديث الذكي نشط");
      } else {
        setOtaStatus("وضع الويب المباشر");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const checkConnection = async () => {
    setOtaStatus("جاري فحص الاتصال...");
    try {
      const start = Date.now();
      const response = await fetch(`${config.supabase.url}/auth/v1/health`, {
        headers: { apikey: config.supabase.anonKey }
      });
      const end = Date.now();
      if (response.ok) {
        setDiagInfo(`✅ تم الاتصال بنجاح (${end - start}ms)`);
        setOtaStatus("النظام متصل بالسحابة");
      } else {
        setDiagInfo(`❌ فشل الاتصال: ${response.status}`);
        setOtaStatus("فشل في الاتصال");
      }
    } catch (err) {
      setDiagInfo(`❌ خطأ في الشبكة`);
      setOtaStatus("خطأ في الشبكة");
    }
    setTimeout(() => setDiagInfo(null), 4000);
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError("");
    setStatus("جاري تسجيل الدخول...");
    
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
    } catch (e) {}

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('start-location-v1-session');
      }
      
      const { data, error: loginError } = await signIn(email.trim(), password);

      if (loginError) {
        setError(loginError.message);
        setStatus("");
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError("لم يتم العثور على بيانات المستخدم");
        setStatus("");
        setLoading(false);
        return;
      }

      setStatus("تم الدخول بنجاح! جاري التوجيه...");
      
      if (typeof window !== 'undefined' && rememberMe) {
        localStorage.setItem('remembered_email', email.trim());
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('remembered_email');
      }

      const redirectDelay = (window as any).Capacitor?.isNativePlatform?.() ? 800 : 100;

      setTimeout(async () => {
        try {
          router.replace("/welcome");
        } catch (redirErr) {
          window.location.assign("/welcome"); 
        }
      }, redirectDelay);
    } catch (err: any) {
      setError(`خطأ غير متوقع: ${err.message || "حاول مرة أخرى"}`);
      setStatus("");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#020617] relative overflow-hidden font-sans flex flex-col items-center justify-center p-6" dir="rtl">
      <Toast toasts={toasts} onRemove={removeToast} />
      
      {/* Premium Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[#020617]" />
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-emerald-600/10 rounded-full blur-[160px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
      </div>

      <main className="relative z-10 w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel p-8 md:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border-white/5"
        >
          <AnimatePresence>
            {!isKeyboardOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center mb-10"
              >
                <div className="relative mb-6 group">
                  <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse group-hover:bg-blue-500/40 transition-all duration-700" />
                  <StartLogo className="w-24 h-24 relative drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-transform duration-700 group-hover:scale-110" />
                </div>
                <h1 className="text-4xl font-black tracking-tighter mb-1 flex items-center gap-3 italic" dir="ltr">
                  <span className="text-white text-shadow-glow">Start</span>
                  <span className="text-blue-400 not-italic">Location</span>
                </h1>
                <div className="flex items-center gap-2 opacity-60">
                  <div className="h-px w-4 bg-slate-500" />
                  <p className="text-[9px] font-black text-slate-400 tracking-[0.4em] uppercase">Smart Delivery System</p>
                  <div className="h-px w-4 bg-slate-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {diagInfo && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[10px] font-black text-blue-400 text-center backdrop-blur-md shadow-lg">
              {diagInfo}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-3 h-3 text-blue-500" />
                  البريد الإلكتروني
                </label>
              </div>
              <div className="relative group">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-6 py-5 text-white outline-none transition-all focus:bg-white/10 focus:border-blue-500/40 rounded-2xl font-bold text-sm shadow-inner dark:bg-slate-900/50 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  كلمة المرور
                </label>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-6 py-5 text-white outline-none transition-all focus:bg-white/10 focus:border-emerald-500/40 rounded-2xl font-bold text-sm shadow-inner dark:bg-slate-900/50 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors z-20 p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="relative flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-all duration-300 border border-white/10 flex items-center ${rememberMe ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-white/5'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${rememberMe ? 'translate-x-[-20px]' : 'translate-x-[-4px]'}`} />
                </div>
                <span className="mr-3 text-[11px] font-black text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider">
                  تذكر بيانات الدخول
                </span>
              </label>
            </div>

            {(error || status) && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`rounded-2xl px-5 py-4 text-[11px] font-black flex items-center gap-3 backdrop-blur-2xl border ${error ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"}`}>
                {error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />}
                <span>{error || status}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full relative overflow-hidden rounded-2xl py-5 text-sm font-black text-white transition-all shadow-2xl active:scale-[0.98] ${
                !isSupabaseConfigured ? "bg-red-600/80" : "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-blue-500/25"
              } disabled:opacity-50`}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                <span>{loading ? "جاري التحقق الآمن..." : "دخول للنظام الآمن"}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
            </button>
          </form>

          {!isKeyboardOpen && (
            <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">System Identifier</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white tracking-tighter">{VERSION}</span>
                    <span className="premium-badge text-[8px]">PRO</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">Active</span>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={handleUpdateCheck}
                disabled={checkingUpdate}
                className="w-full group/ota relative overflow-hidden disabled:opacity-50"
              >
                <div className="p-4 bg-white/5 rounded-[24px] border border-white/10 backdrop-blur-xl transition-all group-hover/ota:bg-white/10 group-hover/ota:border-blue-500/30 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                      checkingUpdate ? "bg-blue-600 animate-spin text-white" : "bg-blue-600/10 text-blue-400 group-hover/ota:bg-blue-600 group-hover/ota:text-white"
                    }`}>
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">تحديث النظام</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-slate-300 font-black group-hover/ota:text-white transition-colors">
                          {checkingUpdate ? "جاري الفحص..." : "جلب آخر إصدار متوفر"}
                        </p>
                        {latestVersion && latestVersion !== VERSION && (
                          <span className="bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-md animate-pulse">
                            New {latestVersion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500 animate-pulse"}`} />
                    <Download className={`w-3 h-3 text-slate-600 group-hover/ota:translate-y-0.5 transition-transform duration-300 ${checkingUpdate ? "animate-bounce" : ""}`} />
                  </div>
                </div>
              </button>
            </div>
          )}
        </motion.div>
      </main>

      {/* Simple APK Download Button at Bottom */}
      {isMobileDevice && downloadUrl && typeof window !== 'undefined' && !(window as any).Capacitor?.isNativePlatform() && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-0 right-0 z-50 px-6 flex justify-center pointer-events-none"
        >
          <a 
            href={downloadUrl} 
            download="StartLocation.apk"
            className="pointer-events-auto flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-2xl px-6 py-4 rounded-[20px] shadow-2xl transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white leading-none mb-1">حمّل التطبيق الرسمي</span>
              <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Direct APK Download</span>
            </div>
          </a>
        </motion.div>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
