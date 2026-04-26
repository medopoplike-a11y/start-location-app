/**
 * Centralized configuration and environment variable validation.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';

export const config = {
  supabase: {
    url: supabaseUrl.trim(),
    anonKey: supabaseAnonKey.trim(),
  },
  admin: {
    emails: adminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
  },
  features: {
    // Enable this only AFTER configuring Google Services on Android/iOS
    // If enabled without google-services.json, the app WILL CRASH on startup.
    pushNotifications: false, 
  },
  isProduction: process.env.NODE_ENV === 'production',
  isConfigured: () => {
    return (
      config.supabase.url !== '' && 
      config.supabase.anonKey !== '' && 
      !config.supabase.url.includes('placeholder') &&
      !config.supabase.anonKey.includes('placeholder')
    );
  }
};
