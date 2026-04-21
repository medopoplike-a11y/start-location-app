
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

async function checkConfig() {
    console.log("Checking Supabase app_config...");
    const { data, error } = await supabase.from('app_config').select('*').eq('id', 1).single();
    if (error) {
        console.error("Error fetching config:", error);
    } else {
        console.log("Current DB Config:");
        console.log(JSON.stringify(data, null, 2));
    }
}

checkConfig();
