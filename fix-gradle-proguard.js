
/**
 * Fix Gradle ProGuard issue for @capacitor-community/background-geolocation
 * Changes: proguard-android.txt -> proguard-android-optimize.txt
 */

const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(
  __dirname,
  'node_modules',
  '@capacitor-community',
  'background-geolocation',
  'android',
  'build.gradle'
);

try {
  if (fs.existsSync(buildGradlePath)) {
    let content = fs.readFileSync(buildGradlePath, 'utf8');
    
    // Replace proguard-android.txt with proguard-android-optimize.txt
    if (content.includes("proguard-android.txt")) {
      content = content.replace(
        /getDefaultProguardFile\('proguard-android\.txt'\)/g,
        "getDefaultProguardFile('proguard-android-optimize.txt')"
      );
      
      fs.writeFileSync(buildGradlePath, content, 'utf8');
      console.log('✅ Fixed: proguard-android.txt -> proguard-android-optimize.txt');
    } else {
      console.log('✓ Already fixed or not needed');
    }
  } else {
    console.log('⚠️  File not found (this is OK for web-only builds)');
  }
} catch (error) {
  console.error('⚠️  Warning: Could not fix Gradle ProGuard:', error.message);
  // Don't fail the build for this
  process.exit(0);
}
