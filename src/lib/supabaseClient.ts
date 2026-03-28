import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://sdpjvorettivpdviytqo.supabase.co';
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcGp2b3JldHRpdnBkdml5dHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTM2MDIsImV4cCI6MjA4OTQ1ODYwMn0.Ti0wZbQHBQwFCBZlCdSaar7JUZm7k7sYUbvr9H2MsZ4';

export const getSupabaseCredentials = () => {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (typeof window !== 'undefined') {
    const localUrl = window.localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL');
    const localKey = window.localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (localUrl) url = localUrl;
    if (localKey) anonKey = localKey;
  }

  if (!url) url = defaultSupabaseUrl;
  if (!anonKey) anonKey = defaultSupabaseAnonKey;

  return { url, anonKey };
};

export const hasSupabaseConfig = () => {
  const { url, anonKey } = getSupabaseCredentials();
  return url && anonKey && !url.includes('placeholder') && !anonKey.includes('placeholder');
};

export const createSupabaseClient = (): SupabaseClient => {
  const { url, anonKey } = getSupabaseCredentials();

  const hasValidCredentials = url !== 'https://placeholder.supabase.co' &&
    anonKey !== 'placeholder-key' &&
    url.includes('supabase.co');

  if (!hasValidCredentials) {
    console.error('❌ Supabase: Using placeholder credentials - check environment variables or localStorage');
  } else {
    console.log('✅ Supabase: Connected with real credentials');
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  });
};

export const supabase = createSupabaseClient();