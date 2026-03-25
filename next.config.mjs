/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only export statically if specifically requested (for mobile builds)
  output: process.env.BUILD_TYPE === 'static' ? 'export' : undefined,
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
  env: {
    IS_BUILDING: process.env.npm_lifecycle_script === 'next build',
  },
};

export default nextConfig;
