const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'assets');
const publicDir = path.join(assetsDir, 'public');
const gradlew = path.join(__dirname, 'android', 'gradlew');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created ${dir}`);
  }
}

ensureDir(publicDir);
ensureDir(assetsDir);

const configPath = path.join(assetsDir, 'capacitor.config.json');
const pluginsPath = path.join(assetsDir, 'capacitor.plugins.json');

if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, '{}');
if (!fs.existsSync(pluginsPath)) fs.writeFileSync(pluginsPath, '{}');

console.log('Prepared android assets directories and capacitor config files.');

try {
  fs.chmodSync(gradlew, 0o755);
  console.log('Set chmod +x android/gradlew');
} catch (error) {
  console.warn('chmod +x android/gradlew failed (probably on Windows):', error.message);
}
