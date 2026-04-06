/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'out');
const publicDir = path.join(root, 'public');
const zipPath = path.join(publicDir, 'update.zip');

if (!fs.existsSync(outDir)) {
  console.error('Error: out directory not found. Run the build first.');
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });

const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Created ${zipPath} (${archive.pointer()} total bytes)`);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn(err.message);
  } else {
    throw err;
  }
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(outDir, false);
archive.finalize();
