import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import Script from "next/script";
import AppWrapper from "@/components/AppWrapper";
import { motion, AnimatePresence } from "framer-motion";

const cairo = Cairo({ subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "Start Location",
  description: "Start Location Application",
  manifest: "/manifest.json",
  themeColor: "#4f46e5",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover",
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
                <AnimatePresence mode="wait">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="min-h-screen"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </AppWrapper>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
