import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import Script from "next/script";
import AppWrapper from "@/components/AppWrapper";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";

const cairo = Cairo({ subsets: ["arabic"] });

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export const metadata: Metadata = {
  title: "Start Location",
  description: "Start Location Application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Start Location",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head />
      <body className={`${cairo.className} antialiased selection:bg-indigo-500/10`}>
        <GlobalErrorBoundary 
          title="خطأ في النظام" 
          description="حدث خطأ غير متوقع في التطبيق، ولكن تم حفظ حالتك بأمان. يمكنك المحاولة مرة أخرى."
        >
          <GlobalErrorHandler />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            forcedTheme={undefined}
            disableTransitionOnChange
          >
            <AuthProvider>
              <ToastProvider>
                <AppWrapper>
                  {children}
                </AppWrapper>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
