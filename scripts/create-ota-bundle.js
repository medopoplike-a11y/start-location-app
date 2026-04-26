/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'out');
const distDir = path.join(root, 'dist');
const zipPath = path.join(distDir, 'update.zip');

// Single source of truth for OTA bundles: Supabase Storage (app-updates bucket).
// The zip is saved to dist/update.zip only — upload it manually (or via CI) to:
//   Supabase Storage → app-updates → update.zip
// Never copy to public/ to avoid a duplicate on Vercel serving a stale version.

if (!fs.existsSync(outDir)) {
  console.error('Error: out directory not found. Run the build first.');
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

async function createBundle() {
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeKB = Math.round(archive.pointer() / 1024);
      console.log(`✅ Bundle created: ${zipPath} (${sizeKB} KB)`);
      console.log('');
      console.log('📤 Next step: Upload dist/update.zip to Supabase Storage:');
      console.log('   Bucket: app-updates  →  File: update.zip  (replace existing)');
      console.log('   Then update latest_version in app_config from the Admin panel.');
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn(err.message);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(outDir, false);
    archive.finalize();
  });
}

createBundle().then(() => {
  console.log('✅ Bundle creation completed');
}).catch((err) => {
  console.error('❌ Bundle creation failed:', err.message);
  process.exit(1);
});
