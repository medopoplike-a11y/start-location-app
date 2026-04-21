
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
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking for orders...");
    const { data: orders, error: ordersError } = await supabase.from('orders').select('id, vendor_id, status').limit(5);
    if (ordersError) {
        console.error("Error fetching orders:", ordersError);
    } else {
        console.log(`Found ${orders.length} orders total.`);
        orders.forEach(o => console.log(`Order ID: ${o.id}, Vendor ID: ${o.vendor_id}, Status: ${o.status}`));
    }

    console.log("\nChecking for profiles...");
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, email, role').limit(5);
    if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
    } else {
        console.log(`Found ${profiles.length} profiles total.`);
        profiles.forEach(p => console.log(`Profile ID: ${p.id}, Email: ${p.email}, Role: ${p.role}`));
    }
}

checkData();
