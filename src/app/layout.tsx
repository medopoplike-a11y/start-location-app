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

export const viewport: Viewport = {
  themeColor: "#000814",
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
    <html lang="ar" dir="rtl" className="bg-[#000814]">
      <body className={`${cairo.className} bg-[#000814] text-white`}>
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
  }, []);

  if (!isHydrated) {
    return (
      <div 
        style={{ 
          backgroundColor: '#000814', 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px'
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
