"use client";

import * as React from "react";
import AppUpdater from "@/components/AppUpdater";
import { requestAllPermissions } from "@/lib/native-utils";

// Wrapper to ensure hydration and global error handling
export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
    console.log("App: Root Layout Hydrated");
    requestAllPermissions();
  }, []);

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
