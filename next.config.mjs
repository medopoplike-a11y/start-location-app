/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // تفعيل التصدير الثابت ضروري لعمل التطبيق على الهاتف (Capacitor)
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  trailingSlash: true,
};

export default nextConfig;
