#!/usr/bin/env node
/**
 * Static export script for Capacitor/Android builds.
 * Temporarily moves the /api directory out of the Next.js app so that
 * `output: 'export'` builds succeed (API routes are server-only and not
 * needed in the static mobile build — the app talks directly to Supabase).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.resolve(__dirname, '../src/app/api');
const apiBackup = path.resolve(__dirname, '../src/app/_api_backup');

function restoreApi() {
  if (fs.existsSync(apiBackup)) {
    if (fs.existsSync(apiDir)) fs.rmSync(apiDir, { recursive: true });
    fs.renameSync(apiBackup, apiDir);
    console.log('✅ API routes restored');
  }
}

// Ensure cleanup even on crash
process.on('exit', restoreApi);
process.on('SIGINT', () => { restoreApi(); process.exit(1); });
process.on('uncaughtException', (e) => { console.error(e); restoreApi(); process.exit(1); });

// Step 1: Hide API routes
if (fs.existsSync(apiDir)) {
  if (fs.existsSync(apiBackup)) fs.rmSync(apiBackup, { recursive: true });
  fs.renameSync(apiDir, apiBackup);
  console.log('📦 API routes temporarily hidden for static export');
}

// Step 2: Run Next.js static build
try {
  execSync('cross-env BUILD_TYPE=static next build', { stdio: 'inherit' });
} catch (err) {
  console.error('❌ Build failed:', err.message);
  restoreApi();
  process.exit(1);
}

// Step 3: Restore API routes
restoreApi();
