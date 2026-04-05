"use client";

import * as React from "react";
import AppUpdater from "@/components/AppUpdater";

// Wrapper to ensure hydration and global error handling
export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [hydrationError, setHydrationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      console.log("AppWrapper: useEffect mounting...");
      setIsHydrated(true);
      console.log("AppWrapper: isHydrated set to true");
    } catch (error) {
      console.error("AppWrapper: Hydration error:", error);
      setHydrationError(error instanceof Error ? error.message : "Unknown error");
    }
  }, []);

  // Timeout fallback - force hydration after 3 seconds
  React.useEffect(() => {
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
    const hydrationTimeout = isCapacitor ? 10000 : 3000;
    
    const timeout = setTimeout(() => {
      console.warn(`AppWrapper: Forced hydration after ${hydrationTimeout/1000}s timeout`);
      setIsHydrated(true);
    }, hydrationTimeout);
    return () => clearTimeout(timeout);
  }, [isHydrated]);

  if (hydrationError) {
    return (
      <div 
        style={{ 
          backgroundColor: '#f3f4f6', 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#dc2626',
          fontSize: '14px',
          fontWeight: 'bold',
          fontFamily: 'sans-serif',
          gap: '10px',
          padding: '20px',
          textAlign: 'center'
        }}
      >
        <div>خطأ في تحميل التطبيق</div>
        <div style={{ fontSize: '12px', color: '#666' }}>{hydrationError}</div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!isHydrated) {
    return (
      <div 
        style={{ 
          backgroundColor: '#f3f4f6', 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#1f2937',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'sans-serif',
          gap: '10px'
        }}
      >
        <div style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        SYNCING START-OS...
        <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>جاري تحميل النظام...</div>
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
