"use client";

import { signIn } from "@/lib/auth";
import { config } from "@/lib/config";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { StartLogo } from "@/components/StartLogo";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useState, FormEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle2, Loader2, ShieldCheck, Download, Smartphone, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import { AppLoader } from "@/components/AppLoader";

const isSupabaseConfigured = config.isConfigured();
const FALLBACK_APK_URL = config.supabase.url 
  ? `${config.supabase.url}/storage/v1/object/public/app-updates/start-location.apk`
  : "https://placeholder.supabase.co/storage/v1/object/public/app-updates/start-location.apk";

// V7.0.0: OUT-OF-COMPONENT PERSISTENT STATE
// This prevents React re-renders from triggering new connection checks.
let isGlobalConnectionChecking = false;
let globalConnectionStatus: 'idle' | 'checking' | 'ok' | 'fail' = 'idle';

const LoginPage = () => {
  const { toasts, removeToast } = useToast();
  const getRedirectPath = (role: string) => {
    const r = role.toLowerCase();
    if (r === "admin") return "/admin";
    if (r === "vendor") return "/store";
    return "/driver";
  };

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const handleVersionTap = () => {
    setTapCount(prev => {
      if (prev + 1 >= 5) {
        setShowDiagnostics(true);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleManualUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setStatus("جاري البحث عن تحديثات...");
    
    try {
      const { checkForAutoUpdate, showNativeToast } = await import("@/lib/native-utils");
      const update = await checkForAutoUpdate(true);
      
      if (update.available && update.downloaded) {
        setStatus("تم العثور على تحديث! جاري التثبيت...");
        await showNativeToast(update.updateMessage || "جاري تثبيت التحديث وإعادة التشغيل...");
        setTimeout(async () => {
          const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
          await CapacitorUpdater.reload();
        }, 1500);
      } else {
        setStatus("");
        const { showNativeToast } = await import("@/lib/native-utils");
        await showNativeToast("تطبيقك يعمل بأحدث إصدار متاح");
      }
    } catch (e: any) {
      setError(`فشل التحديث: ${e.message || "حاول مرة أخرى"}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const VERSION = "V16.4.5";
  const apkUrlV = `${FALLBACK_APK_URL.replace('start-location.apk', `start-location-v16.4.5.apk`)}`;

  const router = useRouter();
  const { user, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastError, setLastError] = useState<string>("");
  const [status, setStatus] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [apkUrl, setApkUrl] = useState(apkUrlV);
  const [connStatus, setConnStatus] = useState<'idle' | 'checking' | 'ok' | 'fail'>(globalConnectionStatus);
  const currentConnStatus = useRef<'idle' | 'checking' | 'ok' | 'fail'>(globalConnectionStatus);

  useEffect(() => {
    currentConnStatus.current = connStatus;
    globalConnectionStatus = connStatus;
    if (connStatus === 'ok' && typeof window !== 'undefined') {
      (window as any).__START_LOCATION_CONNECTED = true;
    }
  }, [connStatus]);

  const checkConnection = async (force = false) => {
    // V7.0.0: Strict guards to prevent loop
    if (!force) {
      if (globalConnectionStatus === 'ok' || isGlobalConnectionChecking) return;
    }

    isGlobalConnectionChecking = true;
    setConnStatus('checking');
    setLastError("");
    
    try {
      console.log(`V13.0.0: Performing DIRECT NATIVE check...`);
      // V13.0.0: Use the direct native bridge for health check to avoid all library issues
      const { CapacitorHttp } = await import('@capacitor/core');
      const url = `${config.supabase.url}/rest/v1/app_config?select=count&limit=1`;
      
      const response = await CapacitorHttp.request({
        url,
        method: 'GET',
        headers: {
          'apikey': config.supabase.anonKey,
          'Authorization': `Bearer ${config.supabase.anonKey}`
        }
      });
      
      if (response.status !== 200) {
        console.error("Native Bridge Failed:", response.status);
        setConnStatus('fail');
        setLastError(`HTTP ${response.status}: Failed to reach server`);
      } else {
        console.log("Native Bridge Success! ✅");
        setConnStatus('ok');
      }
    } catch (e: any) {
      console.error("Connection Exception:", e.message);
      setConnStatus('fail');
      setLastError(e.message || "Network Error");
    } finally {
      isGlobalConnectionChecking = false;
    }
  };

  useEffect(() => {
    if (mounted && globalConnectionStatus === 'idle') {
      checkConnection();
    }
  }, [mounted]);

  const isInsideNativeApp = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

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
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user && mounted && !isLoggedOut && !isRedirecting) {
      const role = profile?.role || user.user_metadata?.role;
      if (!role) return;
      setIsRedirecting(true);
      const path = getRedirectPath(role);
      if (window.location.pathname !== path) {
        router.replace(path);
      }
    }
  }, [user, profile, router, mounted, isLoggedOut, isRedirecting]);

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
    supabase
      .from('app_config')
      .select('download_url')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data?.download_url) setApkUrl(data.download_url);
      })
      .catch(() => {});
  }, []);

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
      setIsRedirecting(true);

      if (typeof window !== 'undefined' && rememberMe) {
        localStorage.setItem('remembered_email', email.trim());
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('remembered_email');
      }

      const redirectDelay = (window as any).Capacitor?.isNativePlatform?.() ? 800 : 300; // V16.4.0: Increased delay to ensure storage is flushed

      setTimeout(async () => {
        if (!isRedirecting) return; // V16.4.0: Safety check
        
        const role = data.user.user_metadata?.role || "driver";
        const path = getRedirectPath(role);
        
        console.log(`[LoginV16.4.0] Redirecting to ${path} after ${redirectDelay}ms`);
        
        try {
          // V16.4.0: Clear the reload guard before a legitimate redirect
          sessionStorage.removeItem('auth_redirect_guard');
          router.replace(path);
        } catch (e) {
          console.error("[LoginV16.4.0] Router redirect failed, using window.location", e);
          window.location.assign(path);
        }
      }, redirectDelay);
    } catch (err: any) {
      setError(`خطأ غير متوقع: ${err.message || "حاول مرة أخرى"}`);
      setStatus("");
      setLoading(false);
    }
  };

  if (isRedirecting) {
    return <AppLoader />;
  }

  return (
    <div className="h-screen bg-[#020617] relative overflow-hidden font-sans flex flex-col items-center justify-center p-6" dir="rtl">
      {/* Diagnostics Overlay */}
      {showDiagnostics && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 p-6 overflow-auto animate-in fade-in zoom-in duration-200" dir="rtl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-blue-400">تشخيص النظام (Diagnostics)</h2>
            <button 
              onClick={() => setShowDiagnostics(false)}
              className="p-2 bg-slate-800 rounded-full text-white"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4 text-sm font-mono text-left" dir="ltr">
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-slate-400 mb-1">Supabase URL:</p>
              <p className="break-all text-white">{config.supabase.url || "NULL"}</p>
            </div>
            
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-slate-400 mb-1">Platform:</p>
              <p className="text-white">
                {(window as any).Capacitor?.getPlatform?.() || 'web'} ({(window as any).Capacitor?.isNativePlatform?.() ? 'Native' : 'Web'})
              </p>
            </div>

            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-slate-400 mb-1">Network Bridge:</p>
              <p className={ (window as any).Capacitor?.isNativePlatform?.() ? "text-green-400" : "text-yellow-400" }>
                { (window as any).Capacitor?.isNativePlatform?.() ? "NATIVE ULTIMATE (V16.3.0)" : "WEB STANDARD" }
              </p>
            </div>

            <div className="p-4 bg-slate-900 rounded-lg border border-red-900/50 mt-4">
               <p className="text-red-400 font-bold mb-2 uppercase text-[10px] tracking-widest">Super Diagnostics (V16.3.0)</p>
               <div className="grid grid-cols-1 gap-2">
                 <button 
                   onClick={async () => {
                     try {
                       const url = config.supabase.url || "MISSING";
                       const key = config.supabase.anonKey ? `${config.supabase.anonKey.substring(0, 10)}...` : "MISSING";
                       alert(`Supabase Config:\nURL: ${url}\nKey: ${key}`);
                       
                       // V16.3.0: More defensive diagnostics
                       alert("Checking Auth Session...");
                       const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                       alert(`Auth Session Result:\nUser: ${sessionData?.session?.user?.email || "NOT LOGGED IN"}\nError: ${sessionError?.message || "None"}`);
                       
                       alert("Checking Data Connection (Profiles)...");
                       const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').limit(1);
                       alert(`Data Test Result:\nRows: ${profileData?.length || 0}\nError: ${profileError?.message || "None"}`);
                     } catch (e: any) {
                       alert(`Super Diag Failed: ${e.message}\n${e.stack?.substring(0, 100)}`);
                     }
                   }}
                   className="w-full px-4 py-2 bg-red-600 rounded text-xs text-white hover:bg-red-700 transition-colors"
                 >
                   تشغيل الفحص العميق (Deep Audit)
                 </button>
                 <button 
                   onClick={async () => {
                     if (confirm("سيتم مسح كافة البيانات المخزنة وتسجيل الخروج. هل أنت متأكد؟")) {
                       localStorage.clear();
                       sessionStorage.clear();
                       const { Preferences } = await import("@capacitor/preferences");
                       await Preferences.clear();
                       window.location.reload();
                     }
                   }}
                   className="w-full px-4 py-2 bg-slate-700 rounded text-xs text-white hover:bg-slate-600 transition-colors"
                 >
                   مسح شامل للبيانات (Nuclear Reset)
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
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
                
                {/* مؤشر الاتصال المباشر */}
                <div className="flex flex-col gap-1 mt-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      connStatus === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
                      connStatus === 'fail' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 
                      'bg-slate-500 animate-pulse'
                    }`} />
                    <p className="text-[10px] font-bold text-slate-400">
                      {connStatus === 'ok' ? 'متصل بالسيرفر' : 
                       connStatus === 'fail' ? 'فشل الاتصال' : 
                       'جاري فحص الاتصال...'}
                    </p>
                  </div>
                  {connStatus === 'fail' && lastError && (
                    <p className="text-[8px] text-red-400/80 font-mono break-all bg-red-500/5 p-1 rounded border border-red-500/10">
                      خطأ: {lastError}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 opacity-60">
                  <div className="h-px w-4 bg-slate-500" />
                  <p className="text-[9px] font-black text-slate-400 tracking-[0.4em] uppercase">Smart Delivery System</p>
                  <div className="h-px w-4 bg-slate-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 cursor-pointer" onClick={handleVersionTap}>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">System Identifier</p>
                  <p className="text-sm font-black text-white tracking-tighter">{VERSION}</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">Active</span>
                </div>
              </div>

              {/* Manual Update Button - V16.4.3 */}
              <button 
                onClick={handleManualUpdate}
                disabled={isUpdating}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] group"
              >
                <RefreshCw className={`w-4 h-4 text-blue-400 ${isUpdating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                  {isUpdating ? "جاري البحث عن تحديثات..." : "سحب التحديث الجديد يدوياً"}
                </span>
              </button>
            </div>
          )}
        </motion.div>

        {/* زر تحميل APK — للمتصفح فقط وليس داخل التطبيق المثبت */}
        {mounted && !isInsideNativeApp && (
          <motion.a
            href={apkUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 backdrop-blur-xl px-5 py-4 rounded-2xl transition-all active:scale-[0.98] group"
          >
            <div className="w-11 h-11 bg-emerald-500/10 group-hover:bg-emerald-500 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-[12px] font-black text-white leading-none mb-1">تحميل تطبيق الأندرويد</p>
              <p className="text-[10px] text-slate-400">اضغط لتنزيل وتثبيت APK على هاتفك</p>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0" />
          </motion.a>
        )}
      </main>

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
