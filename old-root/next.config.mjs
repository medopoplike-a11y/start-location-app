/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // assetPrefix: './', // تسبب خطأ في بناء الخطوط، سنستخدم حل بديل
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
  env: {
    IS_BUILDING: process.env.npm_lifecycle_script === 'next build',
  },
};

export default nextConfig;
