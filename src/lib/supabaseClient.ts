import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sdpjvorettivpdviytqo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcGp2b3JldHRpdnBkdml5dHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTM2MDIsImV4cCI6MjA4OTQ1ODYwMn0.Ti0wZbQHBQwFCBZlCdSaar7JUZm7k7sYUbvr9H2MsZ4';

// Validate that we have real credentials (not placeholders)
const hasValidCredentials = supabaseUrl !== 'https://placeholder.supabase.co' &&
                          supabaseAnonKey !== 'placeholder-key' &&
                          supabaseUrl.includes('supabase.co');

if (!hasValidCredentials) {
  console.error('❌ Supabase: Using placeholder credentials - check environment variables');
} else {
  console.log('✅ Supabase: Connected with real credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});