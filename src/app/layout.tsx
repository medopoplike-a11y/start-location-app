import * as React from "react";
import { Cairo } from "next/font/google";
import "./globals.css";
import AppUpdater from "@/components/AppUpdater";
import { AuthProvider } from "@/components/AuthProvider";
import Script from "next/script";
import AppWrapper from "@/components/AppWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
            // Mark that cleanup has run once, but preserve existing session tokens
            if (typeof localStorage !== 'undefined') {
              if (!localStorage.getItem('start_v3_clean')) {
                localStorage.setItem('start_v3_clean', 'true');
              }
            }
          `}
        </Script>
        <AuthProvider>
          <AppWrapper>
            {children}
            <AppUpdater />
          </AppWrapper>
        </AuthProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
