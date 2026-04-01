const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).map(l => {
  const m = l.match(/^([^=]+)=(.*)$/);
  return m ? [m[1], m[2].replace(/^"|"$/g,"")] : null;
}).filter(Boolean));
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }
});
(async () => {
  const r = await supabase.rpc('get_all_orders_admin');
  console.log(JSON.stringify(r, null, 2));
})();
