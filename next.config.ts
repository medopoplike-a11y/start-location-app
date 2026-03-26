import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // ضروري لعمل التطبيق كـ Native APK
  images: {
    unoptimized: true, // الصور يجب أن تكون غير محسنة لتعمل محلياً في الأندرويد
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // إزالة server.url إذا كنت تريد الاعتماد كلياً على ملفات APK المحلية مع OTA
  // ولكننا سنبقيها في capacitor.config.json للسرعة حالياً
};

export default nextConfig;
