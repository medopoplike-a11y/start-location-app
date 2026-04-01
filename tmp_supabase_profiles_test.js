const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local','utf-8').split(/\r?\n/).reduce((acc,line)=>{ const m=line.match(/^\s*([^=]+)=(.*)$/); if(m){ acc[m[1].trim()]=m[2].trim().replace(/^\"|\"$/g,''); } return acc; },{});
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
(async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('id,email,role').limit(20);
    console.log(JSON.stringify({ error, data }, null, 2));
  } catch (err) {
    console.error('ERR', err);
  }
})();
