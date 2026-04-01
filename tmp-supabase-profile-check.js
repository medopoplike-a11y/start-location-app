const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

process.chdir(path.join(__dirname));
const envPath = path.join(process.cwd(), '.env.local');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const parsed = Object.fromEntries(
  env
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [key, ...rest] = line.split('=');
      let value = rest.join('=');
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      return [key, value];
    })
);

const url = (parsed.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const key = (parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
if (!url || !key) {
  console.error('Missing env vars', { url, key });
  process.exit(1);
}

const supabase = createClient(url, key);
const userId = '89bbdf46-5895-4120-85db-70aebe4efe10';

(async () => {
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  console.log('PROFILE', JSON.stringify({ profile, profileError }, null, 2));

  try {
    const result = await supabase.auth.admin.getUserById(userId);
    console.log('AUTH_USER', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('AUTH_USER_ERROR', err);
  }
})();
