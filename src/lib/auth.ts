import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
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
          // V5.0.0: No lock for temp client
          lock: undefined,
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

  // V16.8.0: Nuclear fallback for missing profiles in UI
  const createEmptyProfile = (id: string, email: string, role: UserRole = 'driver'): UserProfile => ({
    id,
    email: email || '',
    full_name: 'جاري التحميل...',
    role,
    is_locked: false,
    created_at: new Date().toISOString()
  });

  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!error && data) {
      console.log("getUserProfile: Profile found in DB");
      return data as UserProfile;
    }
    
    // V1.8.2: Auto-Repair missing profiles from metadata if possible
    // This is critical when migrating projects or if profile sync failed during signup
    console.warn("getUserProfile: No profile found in DB for user", userId, "Attempting auto-repair...");
    
    // V16.6.7: CRITICAL - Use getUser() to get the freshest metadata
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) console.warn("getUserProfile: auth.getUser() failed", authError);
    
    const user = authData?.user;
    
    if (user && user.id === userId) {
      const metadata = user.user_metadata || {};
      const role = (metadata.role || 'driver').toLowerCase() as UserRole;
      
      console.log("getUserProfile: Repairing with role:", role);

      const newProfile: UserProfile = {
        id: userId,
        email: user.email || userEmail || '',
        full_name: metadata.full_name || metadata.name || 'مستخدم',
        role: role,
        is_locked: false,
        created_at: new Date().toISOString(),
        phone: metadata.phone || '',
        area: metadata.area || ''
      };
      
      // Attempt to create the missing profile (Now allowed by new RLS policy)
      const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
      if (!insertError) {
        console.log("getUserProfile: Profile auto-repaired successfully");
        return newProfile;
      } else {
        console.error("getUserProfile: Auto-repair failed (Insert Error)", insertError);
        // Even if insert fails, return the profile object so the UI can at least show something
        return newProfile;
      }
    } else {
      console.error("getUserProfile: auth.getUser() returned wrong user or null", { 
        foundId: user?.id, 
        requestedId: userId 
      });
    }
  } catch (dbError) {
    console.warn('getUserProfile: Database error:', dbError);
  }

  // V16.8.0: FINAL NUCLEAR FALLBACK
  // If we reach here, the user exists in Auth but we can't get their profile from DB or repair it.
  // Return a minimal profile object so the UI can at least show a dashboard based on metadata.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === userId) {
      const metadata = user.user_metadata || {};
      return createEmptyProfile(userId, user.email || '', (metadata.role || 'driver').toLowerCase() as UserRole);
    }
  } catch (e) {}

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
  console.log("Auth: signOut started (V17.2.7 BLOCKING)");
  
  if (typeof window !== 'undefined') {
    try {
      // 1. Immediate local cleanup
      const sessionKey = 'start-location-v1-session';
      localStorage.removeItem(sessionKey);
      sessionStorage.clear();
      
      // Targeted cleanup of auth-related keys in localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth-token') || key.includes('supabase') || key.includes('session'))) {
          localStorage.removeItem(key);
        }
      }

      // 2. BLOCKING cleanup for Native and Supabase
      if (Capacitor.isNativePlatform()) {
        try {
          const { Preferences } = await import('@capacitor/preferences');
          const { keys } = await Preferences.keys();
          for (const key of keys) {
            if (key.includes('auth-token') || key.includes('supabase') || key.includes('session') || key === sessionKey) {
              await Preferences.remove({ key });
            }
          }
          // Also clear all preferences to be 100% sure for a "clean" logout feel
          // await Preferences.clear(); // Maybe too aggressive? Let's stick to auth keys.
        } catch (e) {
          console.warn("Auth: Preferences cleanup error", e);
        }
      }

      // Global signout from Supabase (Blocking)
      await supabase.auth.signOut({ scope: 'global' }).catch(() => {});

      // 3. Final safety delay to ensure storage writes are flushed
      await new Promise(r => setTimeout(r, 500));

      // 4. Instant redirect using replace to prevent "Back" button from returning to authenticated state
      window.location.replace('/login?logged_out=true');
    } catch (err) {
      console.error("Auth: Logout failed", err);
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
      // Use RPC for better reliability and bypassing RLS complexity
      const { error: profileError } = await supabase.rpc('update_user_details', {
        new_full_name: updates.full_name,
        new_phone: updates.phone,
        new_area: updates.area,
        new_vehicle_type: updates.vehicle_type
      });
      
      if (profileError) {
        console.warn('update_user_details RPC failed, falling back to direct update:', profileError);
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);
        if (fallbackError) throw fallbackError;
      }
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
