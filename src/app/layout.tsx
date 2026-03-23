import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

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
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>{children}</body>
    </html>
  );
}
