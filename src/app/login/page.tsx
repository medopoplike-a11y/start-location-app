"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";

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
    <main className="min-h-screen bg-[#07111e] flex items-center justify-center p-6" dir="rtl">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_32px_90px_-50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <h1 className="text-3xl font-black text-white mb-2">تسجيل الدخول</h1>
        <p className="text-sm text-slate-300 mb-6">أدخل بريدك الإلكتروني وكلمة المرور للدخول إلى النظام.</p>

        {!isSupabaseConfigured && (
          <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            Supabase غير مهيأ. أضف المتغيرين NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY ثم أعد تشغيل التطبيق.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block text-sm font-semibold text-slate-100">
            البريد الإلكتروني
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-100">
            كلمة المرور
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder=""
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {status && !error && (
            <div className="rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              {status}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition active:scale-95 ${
              !isSupabaseConfigured 
                ? "bg-red-500 hover:bg-red-400" 
                : "bg-sky-500 hover:bg-sky-400"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {loading ? "جارٍ تسجيل الدخول..." : !isSupabaseConfigured ? "⚠️ Supabase غير مهيأ - انقر للتفاصيل" : "تسجيل الدخول"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
          <p>سيتم إعادة توجيهك تلقائياً إلى الصفحة المناسبة بعد تسجيل الدخول.</p>
          <p className="mt-3 text-xs text-slate-500">إذا استمرت المشكلة، امسح الكوكيز وذاكرة التخزين ثم أعد تحميل الصفحة.</p>
          
          {/* Debug Info */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-[10px] text-slate-500 mb-2">معلومات التشخيص:</p>
            <div className="text-[10px] font-mono space-y-1">
              <div className="flex items-center gap-2">
                <span className={isSupabaseConfigured ? "text-green-400" : "text-red-400"}>
                  {isSupabaseConfigured ? "✓" : "✗"}
                </span>
                <span>Supabase: {isSupabaseConfigured ? "مهيأ" : "غير مهيأ"}</span>
              </div>
              <div className="text-slate-600">
                URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "موجود" : "غير موجود"}
              </div>
              <div className="text-slate-600">
                Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "موجود" : "غير موجود"}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
