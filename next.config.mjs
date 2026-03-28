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
    IS_BUILDING: process.env.BUILD_TYPE === 'static' ? 'true' : 'false',
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
