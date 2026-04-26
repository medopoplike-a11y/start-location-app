import fs from 'fs';
import path from 'path';

const dirs = ['out', '.next', 'android/app/src/main/assets/public'];

dirs.forEach(dir => {
  const fullPath = path.resolve(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`🧹 Cleaning ${dir}...`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
});

console.log('✅ Clean complete. Now running npm install...');
