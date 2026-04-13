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
  console.log("Auth: signOut started (Optimistic)");
  
  // 1. Immediate local cleanup
  if (typeof window !== 'undefined') {
    try {
      const sessionKey = 'start-location-v1-session';
      localStorage.removeItem(sessionKey);
      
      // Targeted cleanup of auth-related keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth-token') || key.includes('supabase') || key.includes('session'))) {
          localStorage.removeItem(key);
        }
      }

      // 2. Background global signout (don't await)
      supabase.auth.signOut({ scope: 'global' }).catch(err => {
        console.warn("Auth: Background signOut error", err);
      });

      // 3. Native Preferences cleanup (background)
      if (Capacitor.isNativePlatform()) {
        import('@capacitor/preferences').then(({ Preferences }) => {
          Preferences.remove({ key: sessionKey }).catch(() => {});
          Preferences.remove({ key: 'supabase.auth.token' }).catch(() => {});
        }).catch(() => {});
      }

      // 4. Instant redirect
      window.location.href = '/login?logged_out=true';
    } catch (err) {
      console.error("Auth: Logout failed", err);
      window.location.href = '/login';
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

export const updateUserAccount = async (updates: { email?: string; password?: string; full_name?: string; phone?: string; area?: string; vehicle_type?: string }) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw userError || new Error('User not found');

    // 1. Update Auth Metadata and Credentials
    const authUpdates: any = {};
    if (updates.email && updates.email !== user.email) authUpdates.email = updates.email;
    if (updates.password) authUpdates.password = updates.password;
    
    const metadata: any = user.user_metadata || {};
    if (updates.full_name) metadata.full_name = updates.full_name;
    if (updates.phone) metadata.phone = updates.phone;
    if (updates.area) metadata.area = updates.area;
    if (updates.vehicle_type) metadata.vehicle_type = updates.vehicle_type;
    
    authUpdates.data = metadata;

    const { error: authError } = await supabase.auth.updateUser(authUpdates);
    if (authError) throw authError;

    // 2. Update Public Profile in DB
    const profileUpdates: any = {};
    if (updates.full_name) profileUpdates.full_name = updates.full_name;
    if (updates.phone) profileUpdates.phone = updates.phone;
    if (updates.area) profileUpdates.area = updates.area;
    if (updates.vehicle_type) profileUpdates.vehicle_type = updates.vehicle_type;
    if (updates.email) profileUpdates.email = updates.email;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);
      if (profileError) throw profileError;
    }

    return { error: null };
  } catch (error) {
    console.error('updateUserAccount error:', error);
    return { error: error as Error };
  }
};

export const submitRating = async (orderId: string, fromId: string, toId: string, rating: number, comment?: string, type?: 'driver_to_vendor' | 'vendor_to_driver') => {
  try {
    const { error } = await supabase.from('ratings').insert([{
      order_id: orderId,
      from_id: fromId,
      to_id: toId,
      rating,
      comment,
      type: type || (fromId === toId ? 'vendor_to_driver' : 'driver_to_vendor') // Fallback logic if needed
    }]);
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
