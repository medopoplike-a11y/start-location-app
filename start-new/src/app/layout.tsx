"use client";

import * as React from "react";
import { Cairo } from "next/font/google";
import "./globals.css";
import AppUpdater from "@/components/AppUpdater";
import Script from "next/script";

const cairo = Cairo({ 
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <html lang="ar" dir="rtl" className="bg-[#000814]">
      <body className={`${cairo.className} bg-[#000814] text-white`}>
        {isHydrated ? (
          <>
            <AppUpdater />
            {children}
          </>
        ) : (
          <div style={{ backgroundColor: '#000814', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            STARTING...
          </div>
        )}
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
