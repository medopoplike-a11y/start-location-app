"use client";

import * as React from "react";
import { Cairo } from "next/font/google";
import "./globals.css";
import AppUpdater from "@/components/AppUpdater";
import { AuthProvider } from "@/components/AuthProvider";
import Script from "next/script";
import { requestAllPermissions } from "@/lib/native-utils";

const cairo = Cairo({ 
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="bg-[#f3f4f6]">
      <body className={`${cairo.className} bg-[#f3f4f6] text-gray-900`}>
        <div className="silver-live-bg" />
        <AuthProvider>
          <AppWrapper>
            {children}
          </AppWrapper>
        </AuthProvider>
        <Script id="kill-sw" strategy="beforeInteractive">
          {`
            // Force clear old Service Workers and Caches
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                  registration.unregister();
                }
              });
            }
            if ('caches' in window) {
              caches.keys().then(function(names) {
                for (let name of names) caches.delete(name);
              });
            }
            // Clear specific old session keys
            if (typeof localStorage !== 'undefined') {
              if (!localStorage.getItem('start_v3_clean')) {
                localStorage.clear();
                sessionStorage.clear();
                localStorage.setItem('start_v3_clean', 'true');
                window.location.reload();
              }
            }
          `}
        </Script>
      </body>
    </html>
  );
}

// Wrapper to ensure hydration and global error handling
function AppWrapper({ children }: { children: React.ReactNode }) {
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
