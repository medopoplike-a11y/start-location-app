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
        <Script id="kill-sw" strategy="afterInteractive">
          {`
            try {
              if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) registration.unregister();
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
