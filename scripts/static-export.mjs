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

// Load .env.production variables manually to ensure they are available for the build
// V1.8.2: ONLY load if the variable is not already set in the environment (e.g. by GitHub Actions)
const envProdPath = path.resolve(__dirname, '../.env.production');
let envVars = 'BUILD_TYPE=static ';
if (fs.existsSync(envProdPath)) {
  console.log('📝 Checking environment variables from .env.production');
  const envProd = fs.readFileSync(envProdPath, 'utf8');
  envProd.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && !process.env[key]) {
        envVars += `${key}=${value} `;
      } else if (key) {
        console.log(`ℹ️ Respecting existing environment variable: ${key}`);
      }
    }
  });
}

try {
  console.log('🚀 Starting static build...');
  execSync(`cross-env ${envVars} next build`, { stdio: 'inherit' });
} catch (err) {
  console.error('❌ Build failed:', err.message);
  restoreApi();
  process.exit(1);
}

restoreApi();
