import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only export statically if specifically requested (for mobile builds)
  output: process.env.BUILD_TYPE === 'static' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  trailingSlash: false,
  env: {
    IS_BUILDING: process.env.npm_lifecycle_script === 'next build' ? 'true' : 'false',
  },
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@capacitor-community/background-geolocation': path.resolve(__dirname, 'src/lib/background-geolocation-mock.ts'),
    };
    return config;
  },
};

export default nextConfig;
