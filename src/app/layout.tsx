import * as React from "react";
import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import AppUpdater from "@/components/AppUpdater";
import Script from "next/script";

const cairo = Cairo({ 
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700"],
});

import { requestAllPermissions } from "@/lib/native-utils";

export const viewport: Viewport = {
  themeColor: "#f3f4f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Start Location - نظام التوصيل الذكي",
  description: "نظام توصيل ذكي، آمن، وشفاف يربط بين التاجر والمندوب بأقل نسبة هدر.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Start Location",
    startupImage: "/logo.svg"
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="bg-[#f3f4f6]">
      <body className={`${cairo.className} bg-[#f3f4f6] text-gray-900`}>
        <div className="silver-live-bg" />
        <AppWrapper>
          {children}
        </AppWrapper>
        <Script id="sw-registration" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform()) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('App: ServiceWorker registered');
                  },
                  function(err) {
                    console.log('App: ServiceWorker registration failed: ', err);
                  }
                );
              });
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
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#1f2937',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'sans-serif'
        }}
      >
        LOADING START-OS...
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
