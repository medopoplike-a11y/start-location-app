import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// Validate that we have real credentials (not placeholders)
const hasValidCredentials = supabaseUrl && supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder') &&
  supabaseUrl.includes('supabase.co');

console.log('Supabase config:', {
  url: supabaseUrl || '<<EMPTY>>',
  anonKeyHint: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 8)}...${supabaseAnonKey.slice(-8)}` : '<<EMPTY>>',
  hasValidCredentials,
});

if (!hasValidCredentials) {
  console.error('❌ Supabase: Using placeholder credentials - check environment variables');
} else {
  console.log('✅ Supabase: Connected with real credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});