import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const getSupabaseAdminClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY in environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};
