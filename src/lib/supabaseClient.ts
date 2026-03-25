import { createClient } from '@supabase/supabase-js';

// Hardcoded for Vercel/Native stability - Absolute Truth
const supabaseUrl = 'https://sdpjvorettivpdviytqo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcGp2b3JldHRpdnBkdml5dHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODI2MDIsImV4cCI6MjA4OTQ1ODYwMn0.Ti0wZbQHBQwFCBZlCdSaar7JUZm7k7sYUbvr9H2MsZ4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});