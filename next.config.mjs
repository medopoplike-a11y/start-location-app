import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// V17.4.5: Single source of truth for the app version.
// Read it from package.json at build time and expose it to the browser bundle
// as NEXT_PUBLIC_APP_VERSION so any UI (login screen, settings, toasts) can
// display the live version without manual edits.
const pkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [process.env.REPLIT_DEV_DOMAIN].filter(Boolean),
  typescript: {
    ignoreBuildErrors: true,
  },
  // Force standard build on Vercel to support API routes, and static export only for local mobile builds
  output: (process.env.BUILD_TYPE === 'static' && !process.env.VERCEL) ? 'export' : undefined,
  trailingSlash: false, // Set to false to prevent Vercel redirect loops (needed true only for some static hosts)
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  env: {
    IS_BUILDING: process.env.BUILD_TYPE === 'static' ? 'true' : 'false',
    NEXT_PUBLIC_APP_VERSION: pkg.version,
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

