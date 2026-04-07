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
  const version = packageJson.version;
  const bundleUrl = `${supabaseUrl}/storage/v1/object/public/app-updates/update.zip`;

  console.log(`🚀 Updating OTA version to: ${version}`);
  console.log(`🔗 Bundle URL: ${bundleUrl}`);

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
        force_update: true,
        updated_at: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to update DB version:', data);
      process.exit(1);
    }

    if (data.length === 0) {
      console.warn('⚠️ No record with id=1 found. Attempting to UPSERT...');
      const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/app_config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates, return=representation'
        },
        body: JSON.stringify({
          id: 1,
          latest_version: version,
          bundle_url: bundleUrl,
          force_update: true,
          updated_at: new Date().toISOString()
        })
      });
      const upsertData = await upsertResponse.json();
      if (!upsertResponse.ok) {
        console.error('❌ Failed to UPSERT DB version:', upsertData);
        process.exit(1);
      }
      console.log('✅ DB Version UPSERTED successfully:', upsertData[0].latest_version);
    } else {
      console.log('✅ DB Version UPDATED successfully:', data[0].latest_version);
    }
  } catch (error) {
    console.error('❌ Fatal error updating DB version:', error);
    process.exit(1);
  }
}

updateOtaVersion();
