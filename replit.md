# Start Location — Replit Project

## Overview
A Next.js 16 delivery tracking web app with Supabase backend, supporting admin, driver, and vendor roles. Originally deployed on Vercel, migrated to Replit.

## GitHub
- Remote: `https://github.com/medopoplike-a11y/start-location-app`
- To push: use `GIT_ASKPASS="" git push https://medopoplike-a11y:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/medopoplike-a11y/start-location-app.git HEAD:main`
- Secret stored as `GITHUB_PERSONAL_ACCESS_TOKEN` in Replit secrets

## Tech Stack
- **Framework**: Next.js 16.2.1 (App Router, Turbopack)
- **Auth/DB**: Supabase (supabase-js v2)
- **Styling**: Tailwind CSS v4
- **Maps**: Leaflet / react-leaflet
- **Animations**: Framer Motion, tsparticles
- **Mobile**: Capacitor (Android build only — not relevant for Replit web)

## App Structure
- `src/app/` — Next.js App Router pages
  - `login/` — Login page
  - `admin/` — Admin dashboard
  - `driver/` — Driver dashboard
  - `vendor/` — Vendor view
  - `api/admin/` — Server-side admin API routes (orders, profiles, reset, app-config)
- `src/components/` — Shared React components (AuthProvider, LiveMap, AuthGuard, etc.)
- `src/lib/` — Supabase client, auth utilities, pricing logic
- `src/lib/server/` — Server-only Supabase admin client (uses service role key)

## Replit Configuration
- **Port**: 5000 (bound to 0.0.0.0 for Replit proxy)
- **Dev command**: `npm run dev` → `next dev -p 5000 -H 0.0.0.0`
- **Workflow**: "Start application"
- `allowedDevOrigins` set dynamically via `REPLIT_DEV_DOMAIN` env var

## Required Environment Variables (Replit Secrets)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `NEXT_PUBLIC_ADMIN_EMAILS` — Comma-separated admin emails (optional)

## Environment Variables (non-sensitive)
- `NEXT_PUBLIC_APP_VERSION` = "0.2.2"
- `NEXT_PUBLIC_BUILD_TYPE` = "production"
- `NEXT_PUBLIC_CAPGO_APP_ID` = "com.start.location"
- `NEXT_PUBLIC_AUTO_UPDATE_ENABLED` = "true"
- `NEXT_PUBLIC_UPDATE_CHECK_INTERVAL` = "1800000"

## Security Notes
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never exposed to the client
- Only `NEXT_PUBLIC_*` vars are sent to the browser
- Admin API routes are in `src/app/api/admin/` and use the server-side Supabase admin client
