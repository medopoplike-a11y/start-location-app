import * as React from "react";
import { Cairo } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Script from "next/script";
import AppWrapper from "@/components/AppWrapper";
// import ParticlesBackground from "@/components/ParticlesBackground";


const cairo = Cairo({ 
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Start Location",
  description: "Smart Delivery Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Start Location",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="bg-[#f3f4f6]" data-scroll-behavior="smooth">
      <head>
        {/* Next.js automatically handles metadata and viewport exports */}
      </head>
      <body className={`${cairo.className} bg-[#f3f4f6] text-gray-900`}>

        {/* Removed heavy backgrounds */}

        <Script id="kill-sw" strategy="afterInteractive">
          {`
            // Safer cleanup for Capacitor
            try {
              if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
              if (typeof window !== 'undefined' && 'caches' in window) {
                caches.keys().then(function(names) {
                  for (let name of names) caches.delete(name);
                });
              }
            } catch (e) {
              console.warn('SW Cleanup failed:', e);
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
