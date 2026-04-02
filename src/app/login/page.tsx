"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { StartLogo } from "@/components/StartLogo";
import { Haptics } from "@capacitor/haptics";

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder")
);

const getRedirectPath = (role?: string) => {
  if (!role) return "/driver";
  const normalized = role.toLowerCase();
  if (normalized === "admin") return "/admin";
  if (normalized === "vendor") return "/vendor";
  return "/driver";
};

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    console.log("=== BUTTON CLICKED ===");
    
    if (loading) {
      console.log("Login blocked: already loading");
      return;
    }

    console.log("=== LOGIN ATTEMPT START ===");
    console.log("Email:", email);
    console.log("Supabase configured:", isSupabaseConfigured);
    console.log("Supabase URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Supabase Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (!isSupabaseConfigured) {
      console.error("Supabase NOT configured!");
      setError(
        "⚠️ Supabase غير مهيأ!\n\n" +
        "المتغيرات المطلوبة غير موجودة:\n" +
        "- NEXT_PUBLIC_SUPABASE_URL\n" +
        "- NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n" +
        "يرجى التحقق من ملف .env.local"
      );
      setStatus("");
      return;
    }

    setError("");
    setStatus("جاري الاتصال بالخادم...");
    setLoading(true);

    try {
      try {
        await Haptics.impact({ style: "medium" });
      } catch (e) {}
      console.log("Calling signIn...");
      const { data, error: signInError } = await signIn(email.trim(), password);
      console.log("=== LOGIN RESULT ===");
      console.log("Data:", data);
      console.log("Error:", signInError);
      console.log("User:", data?.user);
      console.log("Session:", data?.session);

      if (signInError) {
        console.error("SignIn error:", signInError);
        const message = String(signInError.message || "").toLowerCase();
        if (message.includes("invalid login credentials") || message.includes("invalid email")) {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        } else if (message.includes("invalid api key") || message.includes("api key")) {
          setError("مفتاح Supabase خاطئ أو غير موجود. تحقق من الإعدادات.");
        } else {
          setError(signInError.message || "حدث خطأ أثناء تسجيل الدخول.");
        }
        setStatus("");
        return;
      }

      if (!data?.user) {
        console.error("No user returned from signIn");
        setError("تعذر تسجيل الدخول. تأكد من صحة البيانات.");
        setStatus("");
        return;
      }

      const role = String(data.user.user_metadata?.role || "driver").toLowerCase();
      const target = getRedirectPath(role);
      console.log("=== LOGIN SUCCESS ===");
      console.log("Role:", role);
      console.log("Target:", target);
      setStatus(`تم تسجيل الدخول كـ ${role}. جاري الانتقال...`);
      
      // Add delay before redirect to show success message
      setTimeout(() => {
        console.log("Redirecting to:", target);
        window.location.href = target;
      }, 1000);
      
    } catch (unknownError) {
      console.error("=== LOGIN EXCEPTION ===");
      console.error("Error:", unknownError);
      setError(unknownError instanceof Error ? unknownError.message : "حدث خطأ غير متوقع. حاول مجدداً.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 overflow-hidden relative" dir="rtl">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-full h-full bg-blue-500/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.15, 0.05],
            rotate: [0, -120, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-full h-full bg-indigo-500/10 rounded-full blur-[120px]" 
        />
      </div>

      <motion.section 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10 glass-morphism rounded-[2.5rem] p-8 md:p-10 premium-glow"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <StartLogo className="w-24 h-24 mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          </motion.div>
          <h1 className="text-4xl font-black text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white/70">
            Start Location
          </h1>
          <p className="text-sm text-slate-400 font-medium text-center">النظام الذكي لإدارة التوصيل والمتاجر</p>
        </div>

        <AnimatePresence mode="wait">
          {!isSupabaseConfigured && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-md"
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                <span>⚠️</span>
                <span>تنبيه النظام</span>
              </div>
              Supabase غير مهيأ. يرجى مراجعة إعدادات الاتصال.
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">
              البريد الإلكتروني
            </label>
            <div className="relative group">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="user@example.com"
                autoComplete="email"
                className="w-full bg-slate-900/40 border-white/5 px-5 py-4 text-white placeholder:text-slate-600 outline-none transition-all duration-300 focus:bg-slate-900/80 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl"
              />
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                📧
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">
              كلمة المرور
            </label>
            <div className="relative group">
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-slate-900/40 border-white/5 px-5 py-4 text-white placeholder:text-slate-600 outline-none transition-all duration-300 focus:bg-slate-900/80 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl"
              />
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                🔒
              </div>
            </div>
          </div>

          <AnimatePresence>
            {(error || status) && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl px-4 py-3 text-sm font-medium backdrop-blur-md ${
                  error ? "bg-red-500/10 text-red-200 border border-red-500/20" : "bg-blue-500/10 text-blue-200 border border-blue-500/20"
                }`}
              >
                {error || status}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`w-full relative overflow-hidden rounded-2xl py-4 text-sm font-black text-white transition-all duration-500 shadow-lg ${
              !isSupabaseConfigured 
                ? "bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/20" 
                : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/25 hover:shadow-blue-500/40"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                <span>جاري التحقق...</span>
              </div>
            ) : (
              <span>تسجيل الدخول</span>
            )}
            
            {/* Shimmer Effect */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
            />
          </motion.button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>التشخيص الذكي</span>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              {isSupabaseConfigured ? "متصل" : "غير متصل"}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="bg-white/5 rounded-lg p-2 border border-white/5 text-slate-400">
              CORE: <span className="text-blue-400">v0.3.0-PREMIUM</span>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/5 text-slate-400">
              ENV: <span className="text-indigo-400">{isSupabaseConfigured ? "PRODUCTION" : "PENDING"}</span>
            </div>
          </div>
        </div>
      </motion.section>
    </main>
  );
};
};

export default LoginPage;
