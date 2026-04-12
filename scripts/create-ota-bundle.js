/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'out');
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'public');
const zipPath = path.join(distDir, 'update.zip');
const publicZipPath = path.join(publicDir, 'update.zip');

if (!fs.existsSync(outDir)) {
  console.error('Error: out directory not found. Run the build first.');
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

// Wrap the script in a promise to ensure it waits for the archive to finalize
async function createBundle() {
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`Created ${zipPath} (${archive.pointer()} total bytes)`);
      
      // Copy to public directory so Vercel can serve it
      try {
        fs.copyFileSync(zipPath, publicZipPath);
        console.log(`✅ Copied update.zip to public/ for Vercel deployment`);
        resolve();
      } catch (err) {
        console.error(`❌ Failed to copy update.zip to public: ${err.message}`);
        reject(err);
      }
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
