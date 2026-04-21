
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
    console.log("--- DB STATS REPORT ---");
    
    // 1. Total Orders
    const { count: totalOrders, error: countErr } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    if (countErr) console.error("Error counting orders:", countErr);
    else console.log(`Total Orders in DB: ${totalOrders}`);

    // 2. Orders per vendor
    const { data: vendorStats, error: vendorErr } = await supabase.from('orders').select('vendor_id');
    if (!vendorErr) {
        const stats = {};
        vendorStats.forEach(o => stats[o.vendor_id] = (stats[o.vendor_id] || 0) + 1);
        console.log("\nOrders per Vendor:");
        Object.entries(stats).forEach(([id, count]) => console.log(`- Vendor [${id}]: ${count} orders`));
    }

    // 3. Total Profiles
    const { count: totalProfiles, error: profErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (profErr) console.error("Error counting profiles:", profErr);
    else console.log(`\nTotal Profiles in DB: ${totalProfiles}`);

    // 4. List all profile emails/roles
    const { data: profiles } = await supabase.from('profiles').select('email, role');
    if (profiles) {
        console.log("Profiles found:");
        profiles.forEach(p => console.log(`- ${p.email} (${p.role})`));
    }
}

checkData();
