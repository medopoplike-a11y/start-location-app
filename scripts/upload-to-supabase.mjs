
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function uploadFile(fileName, bucketName, contentType, rename = null) {
  const targetName = rename || fileName;
  const filePath = path.resolve(process.cwd(), 'build-out', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found at: ${filePath}`);
    return false;
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  console.log(`\n📦 Preparing: ${targetName}`);
  console.log(`📏 Original Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB (${fileSize} bytes)`);

  const fileBuffer = fs.readFileSync(filePath);

  try {
    // Binary-safe upload using standard fetch with precise headers
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${targetName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'x-upsert': 'true'
      },
      body: fileBuffer // Send Buffer directly for binary safety in Node.js
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Upload failed [${response.status}]: ${errorData}`);
    }

    console.log(`✅ SUCCESS: ${targetName} uploaded to ${bucketName}`);
    
    // Double check size on Supabase (optional but good for logs)
    const infoResponse = await fetch(`${supabaseUrl}/storage/v1/object/info/public/${bucketName}/${targetName}`, {
        headers: { 'apikey': serviceRoleKey }
    });
    if (infoResponse.ok) {
        const info = await infoResponse.json();
        console.log(`🔍 Verified Remote Size: ${(info.size / (1024 * 1024)).toFixed(2)} MB`);
    }

    return true;
  } catch (error) {
    console.error(`❌ CRITICAL ERROR uploading ${targetName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Robust Binary Upload to Supabase Storage...');
  
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  
  const assets = [
    { name: 'update.zip', bucket: 'app-updates', type: 'application/zip' },
    { name: 'start-location.apk', bucket: 'app-updates', type: 'application/vnd.android.package-archive' },
    { name: 'start-location.apk', bucket: 'app-updates', type: 'application/vnd.android.package-archive', rename: `start-location-v${packageJson.version}.apk` }
  ];

  for (const asset of assets) {
    const success = await uploadFile(asset.name, asset.bucket, asset.type, asset.rename);
    if (!success) {
        console.error(`🛑 Failed to upload ${asset.name}. Aborting.`);
        process.exit(1);
    }
  }
  
  console.log('\n✨ All assets are verified and live on Supabase Storage!');
}

main();
