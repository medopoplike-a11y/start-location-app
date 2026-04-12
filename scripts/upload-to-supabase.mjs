
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function uploadFile(filePath, bucketName, destinationName, contentType) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  console.log(`🚀 Uploading ${destinationName} (${(fileSizeInBytes / (1024 * 1024)).toFixed(2)} MB)...`);

  const fileBuffer = fs.readFileSync(filePath);

  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${destinationName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: fileBuffer
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed with status ${response.status}: ${error}`);
    }

    console.log(`✅ Successfully uploaded ${destinationName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error uploading ${destinationName}:`, error.message);
    return false;
  }
}

async function main() {
  const assets = [
    { 
      path: 'update.zip', 
      bucket: 'app-updates', 
      name: 'update.zip', 
      type: 'application/zip' 
    },
    { 
      path: 'start-location.apk', 
      bucket: 'app-updates', 
      name: 'start-location.apk', 
      type: 'application/vnd.android.package-archive' 
    }
  ];

  let allSuccess = true;
  for (const asset of assets) {
    const success = await uploadFile(asset.path, asset.bucket, asset.name, asset.type);
    if (!success) allSuccess = false;
  }

  if (!allSuccess) {
    process.exit(1);
  }
}

main();
