/**
 * Centralized configuration and environment variable validation.
 */

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').trim();

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },
  admin: {
    emails: adminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
  },
  features: {
    pushNotifications: true, // V19.0.1: Enabled (Requires google-services.json on Android)
  },
  isProduction: process.env.NODE_ENV === 'production',
  isConfigured: () => {
    return (
      config.supabase.url !== '' && 
      config.supabase.anonKey !== '' && 
      config.supabase.url.startsWith('https://') &&
      config.supabase.url.includes('.supabase.co')
    );
  }
};
