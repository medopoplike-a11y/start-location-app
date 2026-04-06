"use client";

import * as React from "react";
import AppUpdater from "@/components/AppUpdater";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [globalAlert, setGlobalAlert] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setMounted(true);
      if (typeof window !== 'undefined') {
        (window as any).showSystemAlert = (msg: string) => {
          setGlobalAlert(msg);
          setTimeout(() => setGlobalAlert(null), 10000);
        };
      }
    } catch (e) {
      console.error('AppWrapper catch:', e);
      setError(e instanceof Error ? e.message : 'Unknown hydration error');
    }
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
        <h2>حدث خطأ أثناء تحميل التطبيق</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>إعادة المحاولة</button>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '30px', height: '30px', border: '3px solid #ccc', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {globalAlert && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-6 left-6 right-6 z-[9999] flex justify-center pointer-events-none"
          >
            <div className="bg-red-600 text-white px-6 py-4 rounded-[28px] shadow-2xl shadow-red-200 border border-red-500/50 flex items-center gap-4 max-w-lg w-full pointer-events-auto backdrop-blur-md">
              <div className="bg-white/20 p-2 rounded-xl">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-0.5">تنبيه من إدارة النظام</p>
                <p className="text-sm font-black leading-tight">{globalAlert}</p>
              </div>
              <button 
                onClick={() => setGlobalAlert(null)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors"
              >
                <span className="text-xs font-black">إغلاق</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* AppUpdater disabled temporarily to prevent redirect loops and stick splash issues */}
      {/* <AppUpdater /> */}
      {children}
    </>
  );
}
