#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 🚀 Start-OS Direct Distribution Build Script
 * This script automates the generation of a production APK with OTA support.
 */

const projectName = 'start';
const buildDir = path.join(__dirname, '..');

function run(command, cwd = buildDir) {
  console.log(`\n🏃 Running: ${command}`);
  execSync(command, { stdio: 'inherit', cwd });
}

async function main() {
  try {
    console.log('🌟 Starting High-Performance APK Build...');

    // 1. Clean previous builds
    if (fs.existsSync(path.join(buildDir, 'out'))) {
      console.log('🧹 Cleaning old build directory...');
      fs.rmSync(path.join(buildDir, 'out'), { recursive: true, force: true });
    }

    // 2. Build Web Assets (Production)
    console.log('📦 Building Web Assets (Next.js)...');
    run('npm run build');

    // 3. Export Static Files
    // Note: ensure next.config.mjs has output: 'export' if using mobile
    console.log('📤 Exporting static assets...');
    run('npx next build'); // Next.js 15+ exports automatically if configured

    // 4. Sync Capacitor
    console.log('🔄 Syncing Capacitor with Native Android...');
    run('npx cap sync android');

    // 5. Build Android APK (Release)
    console.log('🤖 Compiling Android APK (Release mode)...');
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    run(`cd android && ${gradlew} assembleRelease`);

    const apkPath = path.join(buildDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
    const finalApkName = `Start-Location-v${require('../package.json').version}.apk`;
    const finalPath = path.join(buildDir, finalApkName);

    if (fs.existsSync(apkPath)) {
      fs.copyFileSync(apkPath, finalPath);
      console.log(`\n✅ SUCCESS! Your production APK is ready: ${finalApkName}`);
      console.log(`📍 Location: ${finalPath}`);
      console.log('\n📣 NOTE: Since you are not using Google Play, users can install this file directly (Side-loading).');
      console.log('✨ Future updates will be pushed automatically via OTA (Capgo) without needing a new APK.');
    } else {
      throw new Error('APK build failed - file not found.');
    }

  } catch (error) {
    console.error('\n❌ Build Failed:', error.message);
    process.exit(1);
  }
}

main();
