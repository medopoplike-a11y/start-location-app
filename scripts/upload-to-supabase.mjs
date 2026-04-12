
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function uploadFile(fileName, bucketName, contentType) {
  const filePath = path.resolve(process.cwd(), fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found at path: ${filePath}`);
    return false;
  }

  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  console.log(`🚀 Preparing to upload: ${fileName}`);
  console.log(`📍 Full path: ${filePath}`);
  console.log(`📦 Size: ${(fileSizeInBytes / (1024 * 1024)).toFixed(2)} MB (${fileSizeInBytes} bytes)`);

  const fileBuffer = fs.readFileSync(filePath);

  try {
    // Using fetch with Uint8Array for binary safety
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: new Uint8Array(fileBuffer)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Upload failed (${response.status}): ${JSON.stringify(result)}`);
    }

    console.log(`✅ Successfully uploaded ${fileName} to ${bucketName}`);
    console.log(`🔗 URL: ${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error uploading ${fileName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Starting asset upload to Supabase...');
  console.log(`📁 Current Working Directory: ${process.cwd()}`);
  
  const assets = [
    { 
      name: 'update.zip', 
      bucket: 'app-updates', 
      type: 'application/zip' 
    },
    { 
      name: 'start-location.apk', 
      bucket: 'app-updates', 
      type: 'application/vnd.android.package-archive' 
    }
  ];

  let allSuccess = true;
  for (const asset of assets) {
    const success = await uploadFile(asset.name, asset.bucket, asset.type);
    if (!success) allSuccess = false;
  }

  if (!allSuccess) {
    console.error('❌ One or more assets failed to upload.');
    process.exit(1);
  }
  
  console.log('🎉 All assets uploaded successfully!');
}

main();
