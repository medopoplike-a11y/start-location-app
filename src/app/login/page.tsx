"use client";

import { signIn } from "@/lib/auth";
import { config } from "@/lib/config";
import { motion } from "framer-motion";
import { StartLogo } from "@/components/StartLogo";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const isSupabaseConfigured = config.isConfigured();

const getRedirectPath = (role?: string) => {
  if (!role) return "/driver";
  const normalized = role.toLowerCase();
  if (normalized === "admin") return "/admin";
  if (normalized === "vendor") return "/vendor";
  return "/driver";
};

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [diagInfo, setDiagInfo] = useState<string | null>(null);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (loading) return;

    if (!isSupabaseConfigured) {
      setError("⚠️ Supabase غير مهيأ! يرجى التحقق من الإعدادات.");
      return;
    }

    setError("");
    setStatus("جاري الاتصال بالخادم...");
    setLoading(true);

    try {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) {}
      
      const { data, error: signInError } = await signIn(email.trim(), password);

      if (signInError) {
        const message = String(signInError.message || "").toLowerCase();
        if (message.includes("invalid login credentials") || message.includes("invalid email")) {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        } else if (message.includes("failed to fetch") || message.includes("network error")) {
          setError("خطأ في الاتصال بالسيرفر. تأكد من توفر الإنترنت.");
          checkConnection(); // Auto-trigger diagnostics
        } else {
          setError(signInError.message || "حدث خطأ أثناء تسجيل الدخول.");
        }
        setLoading(false);
        setStatus("");
        return;
      }

      if (!data?.user || !data?.session) {
        setError("تعذر تسجيل الدخول. تأكد من صحة البيانات.");
        setLoading(false);
        setStatus("");
        return;
      }

      setStatus("تم تسجيل الدخول بنجاح! جاري الانتقال...");
      
      // Essential delay for storage persistence before redirect
      setTimeout(() => {
        const role = String(data.user.user_metadata?.role || "driver").toLowerCase();
        const target = getRedirectPath(role);
        window.location.href = target;
      }, 1500);
      
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "حدث خطأ غير متوقع.");
      setLoading(false);
      setStatus("");
      checkConnection(); // Auto-trigger diagnostics
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
          <h1 className="text-3xl font-black text-white mb-1">
            Start Location
          </h1>
          <p className="text-xs text-slate-400 font-medium">النظام الذكي لإدارة التوصيل والمتاجر</p>
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

        <form onSubmit={handleSubmit} className="space-y-5">
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
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25"
            } disabled:opacity-50`}
          >
            {loading ? "جاري التحقق..." : "تسجيل الدخول"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-500">v0.3.5-LITE</span>
          <div className="flex items-center gap-2">
            <span className={`w-1 h-1 rounded-full ${isSupabaseConfigured ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-[9px] text-slate-500">{isSupabaseConfigured ? "متصل" : "غير متصل"}</span>
          </div>
        </div>
      </motion.section>
    </main>
  );
};

export default LoginPage;
