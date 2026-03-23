/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // تم التعليق عليه لضمان نجاح الرفع على Vercel، يمكنك تفعيله محلياً للموبايل
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
