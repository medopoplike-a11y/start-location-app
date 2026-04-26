import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseLock } from './supabaseClient';
import { config } from './config';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = config.supabase.url || '';
const supabaseAnonKey = config.supabase.anonKey || '';

export type UserRole = 'admin' | 'driver' | 'vendor';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  area?: string;
  vehicle_type?: string;
  national_id?: string;
  location?: { lat: number; lng: number } | null;
  is_locked: boolean;
  created_at: string;
}

const isConfiguredAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return config.admin.emails.includes(email.toLowerCase());
};

export const createUserByAdmin = async (
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  extraData?: { phone?: string; area?: string; vehicle_type?: string; national_id?: string }
) => {
  try {
    const tempSupabase = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key',
      { 
        auth: { 
          persistSession: false,
          lock: supabaseLock as any,
        } 
      }
    );

    const { data, error: signUpError } = await tempSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role.toLowerCase(),
          ...extraData,
        },
      },
    });

    if (signUpError) {
      return { error: signUpError };
    }

    const newUser = data?.user;
    if (!newUser) {
      return { error: new Error('فشل إنشاء المستخدم') };
    }

    const userId = newUser.id;
    const { error: profileError } = await supabase.from('profiles').upsert([
      {
        id: userId,
        email,
        full_name: fullName,
        role: role.toLowerCase() as UserRole,
        is_locked: false,
        ...extraData,
      },
    ]);

    if (profileError) {
      console.error('Profile sync error (non-blocking):', profileError);
    }

    if (role.toLowerCase() === 'driver') {
      const { error: walletError } = await supabase.from('wallets').upsert(
        [{
          user_id: userId,
          balance: 0,
          debt: 0,
          debt_limit: 1000,
        }],
        { onConflict: 'user_id' }
      );
      if (walletError) console.error('Wallet creation error (non-blocking):', walletError);
    }

    return { data: { user: newUser }, error: null };
  } catch (err: unknown) {
    return { error: err };
  }
};

export const getUserProfile = async (userId: string, email?: string): Promise<UserProfile | null> => {
  const userEmail = email?.toLowerCase();
  
  console.log("getUserProfile: Checking for email:", userEmail);

  if (isConfiguredAdminEmail(userEmail)) {
    console.log("getUserProfile: Detected Admin Email from config");
    return {
      id: userId,
      email: userEmail || '',
      full_name: 'مدير النظام',
      role: 'admin',
      is_locked: false,
      created_at: new Date().toISOString(),
    };
  }

  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!error && data) {
      return data as UserProfile;
    }
    console.warn("getUserProfile: No profile found in DB for user", userId);
  } catch (dbError) {
    console.warn('getUserProfile: Database error:', dbError);
  }

  return null;
};

export const signIn = async (email: string, password?: string) => {
  console.log("=== signIn START ===");
  
  if (!password) {
    console.log("signIn: No password provided");
    return { data: null, error: new Error('كلمة المرور مطلوبة') };
  }

  try {
    console.log("signIn: Calling supabase.auth.signInWithPassword...");
    const result = await supabase.auth.signInWithPassword({ email, password });
    console.log("=== signIn RESULT SUCCESS ===");
    return result;
  } catch (error: any) {
    console.error("=== signIn ERROR ===");
    console.error("signIn Error details:", error);
    
    // Handle specific common errors
    if (error.message?.includes('Failed to fetch')) {
      return { data: null, error: new Error('فشل الاتصال بالسيرفر. يرجى التحقق من اتصال الإنترنت.') };
    }
    
    return { data: null, error: error };
  }
};

export const signOut = async () => {
  try {
    console.log("Auth: signOut started");
    // 1. Tell Supabase to sign out globally
    const signOutPromise = supabase.auth.signOut({ scope: 'global' });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('signOut timeout')), 3000); // Shorter timeout for snappier UI
    });

    try {
      const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any;
      if (error) {
        console.warn('Auth: signOut returned error', error);
      }
    } catch (raceErr) {
      console.warn('Auth: signOut race error or timeout', raceErr);
    }
  } catch (error) {
    console.error('Auth: Error during signOut:', error);
  } finally {
    console.log("Auth: Cleaning storage and redirecting...");
    if (typeof window !== 'undefined') {
      try {
        // 2. Clear localStorage aggressively
        const sessionKey = 'start-location-v1-session';
        localStorage.removeItem(sessionKey);
        
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (key.includes('auth-token') || key.includes('supabase') || key.includes('session')) {
            localStorage.removeItem(key);
          }
        }

        // 3. Clear Preferences for Capacitor if native
        const isNative = Capacitor.isNativePlatform();
        if (isNative) {
          try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.remove({ key: sessionKey });
            // Clear all preferences just in case? No, let's be targeted.
            await Preferences.remove({ key: 'supabase.auth.token' });
          } catch (prefErr) {
            console.warn("Auth: Preferences clear error", prefErr);
          }
        }

        // 4. Force hard redirect to login page
        // Use a small delay to let state settle
        setTimeout(() => {
          window.location.replace('/login?logged_out=true');
        }, 100);
      } catch (err) {
        console.error("Auth: Cleanup failed", err);
        window.location.replace('/login');
      }
    }
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<Omit<UserProfile, 'id' | 'email' | 'role' | 'is_locked' | 'created_at'>>) => {
  try {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
};

export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user || null;
    }
    return user;
  } catch {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  }
};
