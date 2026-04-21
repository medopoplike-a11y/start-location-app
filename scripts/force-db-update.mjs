
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env.production
const envPath = path.resolve(__dirname, '../.env.production');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixConfig() {
    console.log("Fixing Supabase app_config...");
    
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
    const version = packageJson.version;
    const buildId = Date.now().toString().slice(-6);
    const latestVersion = `${version}-${buildId}`;
    
    const bundleUrl = `${supabaseUrl}/storage/v1/object/public/app-updates/update.zip?t=${Date.now()}`;
    const downloadUrl = `${supabaseUrl}/storage/v1/object/public/app-updates/start-location-v${version}.apk?t=${Date.now()}`;

    const { data, error } = await supabase.from('app_config').update({
        latest_version: latestVersion,
        bundle_url: bundleUrl,
        download_url: downloadUrl,
        update_url: bundleUrl, // Fix the double https here if it exists
        force_update: true,
        updated_at: new Date().toISOString()
    }).eq('id', 1).select();

    if (error) {
        console.error("Error updating config:", error);
    } else {
        console.log("Updated DB Config successfully to version:", latestVersion);
        console.log(JSON.stringify(data, null, 2));
    }
}

fixConfig();
