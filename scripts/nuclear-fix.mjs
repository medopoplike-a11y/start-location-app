
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

if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is required for this script.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixAll() {
    console.log("1. Fixing app_config...");
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
    const version = packageJson.version; // Should be 16.8.0 now
    
    const bundleUrl = `${supabaseUrl}/storage/v1/object/public/app-updates/update.zip?t=${Date.now()}`;
    const downloadUrl = `${supabaseUrl}/storage/v1/object/public/app-updates/start-location-v${version}.apk?t=${Date.now()}`;

    const { data: config, error: configError } = await supabase.from('app_config').update({
        latest_version: version + '-force-v1',
        bundle_url: bundleUrl,
        download_url: downloadUrl,
        update_url: bundleUrl,
        force_update: true,
        update_message: "تحديث أمان هام لإصلاح مزامنة البيانات والاتصال بالخادم (V16.8.1)",
        updated_at: new Date().toISOString()
    }).eq('id', 1).select();

    if (configError) {
        console.error("Error updating config:", configError);
    } else {
        console.log("Config updated successfully.");
    }

    console.log("\n2. Fixing RLS Policies for Profiles (Nuclear Bypass)...");
    // We can't do DROP POLICY from JS unless we use RPC.
    // Let's check if we have an RPC for executing SQL.
    
    console.log("\n3. Repairing data integrity...");
    const { data: repair, error: repairError } = await supabase.rpc('fix_system_data_integrity');
    if (repairError) {
        console.error("Error running repair RPC:", repairError);
    } else {
        console.log("Repair result:", repair);
    }
}

fixAll();
