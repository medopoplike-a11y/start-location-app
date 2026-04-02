# Start Location — Replit Project

## Overview
A Next.js 16 delivery tracking web app with Supabase backend, supporting admin and driver roles. Originally deployed on Vercel, migrated to Replit.

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
  - `api/admin/` — Server-side admin API routes
  - `vendor/` — Vendor view
- `src/components/` — Shared React components (AuthProvider, LiveMap, etc.)
- `src/lib/` — Supabase client, utilities

## Replit Configuration
- **Port**: 5000 (bound to 0.0.0.0 for Replit proxy)
- **Dev command**: `npm run dev` → `next dev -p 5000 -H 0.0.0.0`
- **Workflow**: "Start application"
- `allowedDevOrigins` set dynamically via `REPLIT_DEV_DOMAIN` env var

## Required Environment Variables
Set these as Replit Secrets:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `NEXT_PUBLIC_ADMIN_EMAILS` — Comma-separated admin emails
- `NEXT_PUBLIC_APP_URL` — Set to your Replit dev domain URL

## Security Notes
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never exposed to the client
- Only `NEXT_PUBLIC_*` vars are sent to the browser
