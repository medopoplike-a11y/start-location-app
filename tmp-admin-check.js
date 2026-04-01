const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const data = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of data.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) {
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[m[1]] = v;
  }
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
console.log('url', !!url, 'key', !!key);
if (!url || !key) {
  console.error('Missing required env vars');
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
(async () => {
  try {
    console.log('service role key present');
    const appConfig = await supabase.from('app_config').select('*').single();
    console.log('app_config', appConfig);
    const profilesRpc = await supabase.rpc('get_all_profiles_admin');
    console.log('profiles rpc', profilesRpc);
  } catch (error) {
    console.error('ERROR', error.message || error);
    console.error(error);
    process.exit(1);
  }
})();
