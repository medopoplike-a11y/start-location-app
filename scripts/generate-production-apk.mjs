#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🚀 Start-OS Direct Distribution Build Script
 * Automates production APK with OTA support.
 */
const buildDir = path.resolve(__dirname, '..');

function run(command, cwd = buildDir) {
  console.log(`\n🏃 Running: ${command}`);
  execSync(command, { stdio: 'inherit', cwd });
}

async function main() {
  try {
    console.log('🌟 Starting High-Performance APK Build...');

    // 1. Clean previous builds
    const outDir = path.join(buildDir, 'out');
    if (fs.existsSync(outDir)) {
      console.log('🧹 Cleaning old build directory...');
      fs.rmSync(outDir, { recursive: true, force: true });
    }

    // 2. Build Web Assets (Production Static Export)
    console.log('📦 Building Web Assets (Next.js Static Export)...');
    run('npm run export');

    // 3. Fix Paths and Routes for Capacitor
    console.log('🛠️ Fixing paths and routes for mobile...');
    run('node fix-paths.js');

    // 4. Sync Capacitor
    console.log('🔄 Syncing Capacitor with Native Android...');
    run('npx cap sync android');

    // 5. Build Android APK (Release & Debug for signing)
    console.log('🤖 Compiling Android APK...');
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    
    // We build Debug version because it is auto-signed by Android Studio/Gradle
    // making it installable immediately without manual signing.
    run(`cd android && ${gradlew} assembleDebug`);

    const debugApkPath = path.join(buildDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    
    // Read version from package.json
    const pkg = JSON.parse(fs.readFileSync(path.join(buildDir, 'package.json'), 'utf8'));
    const finalApkName = `Start-Location-v${pkg.version}-ready.apk`;
    const finalPath = path.join(buildDir, finalApkName);

    if (fs.existsSync(debugApkPath)) {
      fs.copyFileSync(debugApkPath, finalPath);
      console.log(`\n✅ SUCCESS! Your installable APK is ready: ${finalApkName}`);
      console.log(`📍 Location: ${finalPath}`);
      console.log('\n📣 NOTE: This version is auto-signed and will install on any Android phone.');
      console.log('✨ Future updates will still be pushed automatically via OTA (Capgo).');
    } else {
      throw new Error('APK build failed - file not found.');
    }

  } catch (error) {
    console.error('\n❌ Build Failed:', error.message);
    process.exit(1);
  }
}

main();
