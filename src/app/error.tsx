'use client';

import { useEffect } from 'react';
import { StartLogo } from '@/components/StartLogo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('CRITICAL SYSTEM ERROR:', error);
  }, [error]);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-500/10 rounded-full blur-[80px]" />
      
      <div className="relative z-10">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-red-500/10 rounded-3xl border border-red-500/20">
            <StartLogo className="w-16 h-16 grayscale opacity-50" />
          </div>
        </div>
        
        <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight italic">
          عذراً، حدث خطأ غير متوقع
        </h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
          واجه النظام مشكلة تقنية مفاجئة. يمكنك محاولة إعادة التشغيل أو التواصل مع الدعم الفني.
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
          >
            إعادة محاولة التشغيل
          </button>
          
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98]"
          >
            العودة لصفحة الدخول
          </button>
        </div>

        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-8 p-4 bg-black/50 rounded-xl text-[10px] font-mono text-red-400 text-left overflow-auto max-h-40 border border-red-900/30">
            {error.message}
            <br />
            {error.stack}
          </div>
        )}
      </div>
    </div>
  );
}
