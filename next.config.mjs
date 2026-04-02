import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [process.env.REPLIT_DEV_DOMAIN].filter(Boolean),
  typescript: {
    ignoreBuildErrors: true,
  },
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
  turbopack: {
    root: __dirname,
  },
  webpack: (config) => {
    config.watchOptions = {
      ignored: ['**/android/**', '**/android/app/**'],
    };
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@capacitor-community/background-geolocation': path.resolve(__dirname, 'src/lib/background-geolocation-mock.ts'),
    };
    return config;
  },
};

export default nextConfig;

