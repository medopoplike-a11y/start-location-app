#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Static export script for Capacitor/Android builds.
 */

const apiDir = path.resolve(__dirname, '../src/app/api');
const apiBackup = path.resolve(__dirname, '../src/app/_api_backup');

function restoreApi() {
  if (fs.existsSync(apiBackup)) {
    if (fs.existsSync(apiDir)) fs.rmSync(apiDir, { recursive: true });
    fs.renameSync(apiBackup, apiDir);
    console.log('✅ API routes restored');
  }
}

process.on('exit', restoreApi);
process.on('SIGINT', () => { restoreApi(); process.exit(1); });
process.on('uncaughtException', (e) => { console.error(e); restoreApi(); process.exit(1); });

if (fs.existsSync(apiDir)) {
  if (fs.existsSync(apiBackup)) fs.rmSync(apiBackup, { recursive: true });
  fs.renameSync(apiDir, apiBackup);
  console.log('📦 API routes temporarily hidden for static export');
}

try {
  execSync('cross-env BUILD_TYPE=static next build', { stdio: 'inherit' });
} catch (err) {
  console.error('❌ Build failed:', err.message);
  restoreApi();
  process.exit(1);
}

restoreApi();
