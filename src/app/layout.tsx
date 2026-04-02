import * as React from "react";
import { Cairo } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Script from "next/script";
import AppWrapper from "@/components/AppWrapper";
import ParticlesBackground from "@/components/ParticlesBackground";

const cairo = Cairo({ 
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Start Location",
  description: "Start Location Delivery System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Start Location",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="bg-[#f3f4f6]">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Start Location" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`${cairo.className} bg-[#f3f4f6] text-gray-900`}>
        <ParticlesBackground theme="neon-blue" />
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
          </AppWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
