import { createClient } from '@supabase/supabase-js';

export const getSupabaseAdminClient = () => {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // During static export builds the server-side key may not be present.
    // Return a no-op client so the module loads without throwing.
    // Actual runtime calls will return errors from Supabase, not crash the build.
    const fallbackUrl = supabaseUrl || 'https://placeholder.supabase.co';
    const fallbackKey = supabaseServiceRoleKey || 'placeholder-key';
    return createClient(fallbackUrl, fallbackKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};
