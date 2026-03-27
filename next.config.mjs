/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only export statically if specifically requested (for mobile builds)
  output: process.env.BUILD_TYPE === 'static' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  trailingSlash: false,
  env: {
    IS_BUILDING: process.env.npm_lifecycle_script === 'next build' ? 'true' : 'false',
  },
};

export default nextConfig;
