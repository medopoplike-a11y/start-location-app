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

  const forceUpdate = String(process.env.FORCE_UPDATE || 'false').toLowerCase() === 'true';

  const bundleUrl = `${supabaseUrl}/storage/v1/object/public/app-updates/update.zip?v=${version}`;
  const downloadUrl = `${supabaseUrl}/storage/v1/object/public/app-updates/start-location-v${version}.apk?v=${version}`;

  console.log(`🔍 Target version: ${version}`);
  console.log(`🚦 force_update: ${forceUpdate}`);

  // 1) Read current latest_version from app_config and skip if unchanged
  try {
    const currentRes = await fetch(`${supabaseUrl}/rest/v1/app_config?id=eq.1&select=latest_version`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    if (currentRes.ok) {
      const rows = await currentRes.json();
      const current = Array.isArray(rows) && rows[0] ? rows[0].latest_version : null;
      if (current === version) {
        console.log(`✅ Version unchanged (${current}). Skipping app_config flip — no client update will be triggered.`);
        return;
      }
      console.log(`📦 Current published version: ${current ?? '(none)'} → new: ${version}`);
    } else {
      console.warn(`⚠️ Could not read current app_config (${currentRes.status}). Proceeding with upsert.`);
    }
  } catch (err) {
    console.warn(`⚠️ Failed reading current version, will still attempt update: ${err.message}`);
  }

  // 2) Flip the switch
  console.log(`🚀 Updating OTA version to: ${version}`);
  console.log(`🔗 Bundle URL: ${bundleUrl}`);
  console.log(`📥 Download URL: ${downloadUrl}`);

  const payload = {
    latest_version: version,
    bundle_url: bundleUrl,
    download_url: downloadUrl,
    force_update: forceUpdate,
    updated_at: new Date().toISOString()
  };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/app_config?id=eq.1`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ PATCH failed: ${response.status} ${response.statusText} — ${errorText}`);
      console.log('⚠️ Attempting UPSERT instead of PATCH...');
      const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/app_config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ id: 1, ...payload })
      });

      if (!upsertResponse.ok) {
        throw new Error(`UPSERT failed: ${upsertResponse.status} ${await upsertResponse.text()}`);
      }
    }

    console.log(`✅ app_config flipped. Clients will see version ${version} on next poll. force_update=${forceUpdate}`);
  } catch (error) {
    console.error('❌ Error updating OTA version:', error.message || error);
    process.exit(1);
  }
}

updateOtaVersion();
