/**
 * Centralized configuration and environment variable validation.
 */

const getEnv = (key: string, required = true): string => {
  const value = process.env[key];
  if (required && (!value || value.includes('placeholder'))) {
    console.error(`❌ Error: Missing required environment variable: ${key}`);
    return '';
  }
  return value?.trim() || '';
};

export const config = {
  supabase: {
    url: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  },
  admin: {
    emails: getEnv('NEXT_PUBLIC_ADMIN_EMAILS', false).split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
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
