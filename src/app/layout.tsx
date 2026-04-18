import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import Script from "next/script";
import AppWrapper from "@/components/AppWrapper";

const cairo = Cairo({ subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "Start Location",
  description: "Start Location Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
      </head>
      <body className={cairo.className}>
        <Script id="kill-sw" strategy="beforeInteractive">
          {`
            try {
              if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              }

                // Force reload if we find a version mismatch in localStorage
                const currentVersion = "V1.6.4-HYPER-STABLE";
                const storedVersion = localStorage.getItem('app_version');
                if (storedVersion && storedVersion !== currentVersion) {
                  localStorage.setItem('app_version', currentVersion);
                  console.log('Version mismatch detected, clearing storage and reloading...');
                  if (typeof window !== 'undefined') {
                    // Only clear essential items, don't clear everything to avoid login loops
                    localStorage.removeItem('auth_profile');
                    sessionStorage.clear();
                    window.location.reload();
                  }
                } else {
                  localStorage.setItem('app_version', currentVersion);
                }
            } catch (e) {
              console.warn('SW Cleanup failed:', e);
            }
          `}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <AppWrapper>
              {children}
            </AppWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
