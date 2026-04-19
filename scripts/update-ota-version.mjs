import fs from 'fs';
import path from 'path';

async function updateOtaVersion() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const baseVersion = packageJson.version;
  
  // Use GitHub Run ID or timestamp to ensure the version is ALWAYS unique
  // This ensures the mobile app detects a new version even if package.json hasn't changed
  const buildId = process.env.GITHUB_RUN_ID || Date.now().toString().slice(-6);
  const version = `${baseVersion}-${buildId}`;
  
  const bundleUrl = `${supabaseUrl}/storage/v1/object/public/app-updates/update.zip?t=${Date.now()}`;
  // V1.9.9: Use versioned APK URL in database to bypass browser cache completely
  const downloadUrl = `${supabaseUrl}/storage/v1/object/public/app-updates/start-location-v${baseVersion}.apk?t=${Date.now()}`;

  console.log(`🚀 Updating OTA version to: ${version}`);
  console.log(`🔗 Bundle URL: ${bundleUrl}`);
  console.log(`📥 Download URL: ${downloadUrl}`);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/app_config?id=eq.1`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        latest_version: version,
        bundle_url: bundleUrl,
        download_url: downloadUrl,
        force_update: true,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to update version: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      
      // Try UPSERT if PATCH fails (maybe record 1 doesn't exist yet)
      console.log('⚠️ Attempting UPSERT instead of PATCH...');
      const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/app_config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 1,
          latest_version: version,
          bundle_url: bundleUrl,
          download_url: downloadUrl,
          force_update: true,
          updated_at: new Date().toISOString()
        })
      });
      
      if (!upsertResponse.ok) {
        throw new Error(`UPSERT failed: ${upsertResponse.status} ${await upsertResponse.text()}`);
      }
    }

    console.log('✅ Version updated successfully in Database');
  } catch (error) {
    console.error('❌ Error updating OTA version:', error.message || error);
    process.exit(1);
  }
}

updateOtaVersion();
