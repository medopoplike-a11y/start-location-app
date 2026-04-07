import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseLock } from './supabaseClient';
import { config } from './config';

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
  const userEmail = email;
  
  if (isConfiguredAdminEmail(userEmail)) {
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
    console.log("signIn: Calling supabase.auth.signInWithPassword with 30s timeout...");
    
    // Increased timeout to 30s for slower desktop connections
    const signInPromise = supabase.auth.signInWithPassword({ email, password });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('انتهت مهلة الاتصال بالسيرفر. يرجى التحقق من اتصال الإنترنت ومحاولة تسجيل الدخول مرة أخرى.')), 30000);
    });

    const result = await Promise.race([signInPromise, timeoutPromise]) as any;
    console.log("=== signIn RESULT SUCCESS ===");
    return result;
  } catch (error: any) {
    console.error("=== signIn ERROR ===");
    console.error("signIn Error details:", error);
    
    // Handle specific common errors
    if (error.message?.includes('Failed to fetch')) {
      return { data: null, error: new Error('فشل الاتصال بالسيرفر. يرجى التأكد من عدم وجود إضافات (مثل AdBlock) تمنع الاتصال.') };
    }
    
    return { data: null, error: error };
  }
};

export const signOut = async () => {
  try {
    const signOutPromise = supabase.auth.signOut();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('signOut timeout')), 5000);
    });

    const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any;
    if (error) {
      console.warn('Auth: signOut returned error', error);
    }
  } catch (error) {
    console.error('Auth: Error during signOut:', error);
  } finally {
    if (typeof window !== 'undefined') {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (key.includes('auth-token') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // ignore
      }
      window.location.replace('/login');
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
