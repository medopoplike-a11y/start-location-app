"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { StartLogo } from "@/components/StartLogo";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console
    console.error("Admin Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center p-6 text-center font-sans" dir="rtl">
      <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[40px] border border-red-100 shadow-2xl max-w-md w-full relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center mb-8 border border-red-100">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">حدث خطأ غير متوقع</h1>
          
          <div className="bg-red-50/50 p-4 rounded-2xl mb-8 border border-red-50 text-right w-full">
            <p className="text-[10px] font-black text-red-400 uppercase mb-2">تفاصيل الخطأ:</p>
            <p className="text-xs font-bold text-red-700 leading-relaxed">
              {error.message || "فشل تحميل لوحة الإدارة بسبب خطأ في التشغيل."}
            </p>
            {error.digest && (
              <p className="text-[9px] font-bold text-red-300 mt-2">Digest: {error.digest}</p>
            )}
          </div>
          
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => reset()}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-slate-200 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة محاولة التحميل
            </button>
            
            <button
              onClick={() => window.location.href = "/"}
              className="w-full bg-white text-slate-500 py-4 rounded-2xl font-black flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <Home className="w-4 h-4" />
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex items-center gap-3 opacity-30">
        <StartLogo className="w-6 h-6 grayscale" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">START System Recovery</span>
      </div>
    </div>
  );
}
