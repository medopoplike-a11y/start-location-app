"use client";

import * as React from "react";
import AppUpdater from "@/components/AppUpdater";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setMounted(true);
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
      <AppUpdater />
      {children}
    </>
  );
}
