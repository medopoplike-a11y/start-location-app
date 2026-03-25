import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

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
  is_locked: boolean;
  created_at: string;
}

/**
 * دالة للأدمن لإنشاء مستخدم جديد (طيار أو محل)
 * تستخدم عميل معزول تماماً لضمان عدم تداخل الجلسات
 */
export const createUserByAdmin = async (
  email: string, 
  password: string, 
  fullName: string, 
  role: UserRole,
  extraData?: { phone?: string; area?: string; vehicle_type?: string; national_id?: string }
) => {
  try {
    // 1. إنشاء الحساب في Supabase Auth
    const tempSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
      { auth: { persistSession: false } }
    );

    const { data, error: signUpError } = await tempSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role.toLowerCase(),
          ...extraData
        }
      }
    });

    if (signUpError) {
      // If user already exists, signUp might return an error or a fake user depending on Supabase settings
      return { error: signUpError };
    }

    const newUser = data?.user;

    if (newUser) {
      const userId = newUser.id;
      
      console.log("Auth user created, now attempting to sync profile:", userId);

      // 2. إنشاء أو تحديث الملف الشخصي (نستخدم upsert لضمان وجود السجل في حال فشل التريجر)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: userId,
          email: email,
          full_name: fullName,
          role: role.toLowerCase() as UserRole,
          is_locked: false,
          ...extraData
        }]);

      if (profileError) {
        console.error("Profile sync error (non-blocking):", profileError);
        // لا نفشل العملية هنا لأن سجل الـ Auth موجود بالفعل
      }

      // 3. إنشاء المحفظة للطيار (إذا لم تكن موجودة بالفعل بفضل التريجر)
      if (role.toLowerCase() === 'driver') {
        const { error: walletError } = await supabase.from('wallets').upsert([{ 
          user_id: userId,
          balance: 0,
          debt: 0,
          debt_limit: 1000
        }], { onConflict: 'user_id' });
        
        if (walletError) console.error("Wallet creation error (non-blocking):", walletError);
      }
      
      return { data: { user: newUser }, error: null };
    }

    return { error: signUpError || new Error("فشل إنشاء المستخدم") };
  } catch (err: any) {
    return { error: err };
  }
};

/**
 * دالة للحصول على الملف الشخصي للمستخدم الحالي مع دعم البيانات الاحتياطية (Metadata)
 */
export const getUserProfile = async (userId: string, email?: string): Promise<UserProfile | null> => {
  // Hardcoded admin check
  if (email === 'medopoplike@gmail.com') {
    return {
      id: userId,
      email: email,
      full_name: 'مدير النظام',
      role: 'admin',
      is_locked: false,
      created_at: new Date().toISOString()
    };
  }

  try {
    // 1. محاولة جلب الملف من قاعدة البيانات
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      return data as UserProfile;
    }
  } catch (dbError) {
    console.warn('Database error when fetching profile:', dbError);
  }

  // 2. خطة بديلة: جلب بيانات المستخدم من نظام المصادقة (Auth)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && user.id === userId) {
      // استخراج البيانات من Metadata أو استخدام قيم افتراضية
      const fullName = user.user_metadata?.full_name || 'مستخدم';
      
      // منطق ذكي لتحديد الدور: إذا كان الإيميل هو الإيميل المذكور، فهو أدمن
      let role: UserRole = (user.user_metadata?.role || 'driver').toLowerCase() as UserRole;
      if (user.email === 'medopoplike@gmail.com' || user.email?.includes('admin')) {
        role = 'admin';
      }

      return {
        id: user.id,
        email: user.email || '',
        full_name: fullName,
        role: role,
        is_locked: false,
        created_at: user.created_at
      };
    }
  } catch (authError) {
    console.error('Auth: Error fetching profile:', authError);
  }

  return null;
};

/**
 * دالة لتسجيل الدخول بكلمة المرور
 */
export const signIn = async (email: string, password?: string) => {
  if (!password) {
    return { error: new Error("كلمة المرور مطلوبة") };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

/**
 * دالة لتسجيل الخروج النهائي والآمن
 */
export const signOut = async () => {
  try {
    console.log('Auth: Starting signOut...');
    await supabase.auth.signOut();
    
    if (typeof window !== 'undefined') {
      // مسح كافة البيانات المخزنة محلياً لضمان عدم وجود جلسات معلقة
      localStorage.clear();
      sessionStorage.clear();
      
      // التوجيه لصفحة الدخول باستخدام مسار مطلق وتحديث كامل للصفحة لكسر أي حلقة
      window.location.replace('/login/');
    }
  } catch (error) {
    console.error('Auth: Error during signOut:', error);
    if (typeof window !== 'undefined') {
      window.location.replace('/login/');
    }
  }
};

/**
 * دالة للأدمن لتحديث بيانات أي مستخدم (طيار أو محل)
 */
export const adminUpdateUser = async (userId: string, updates: Partial<UserProfile>, password?: string) => {
  try {
    // 1. تحديث البيانات في جدول profiles (كأدمن)
    const { error: profileError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (profileError) throw profileError;

    // 2. تحديث كلمة المرور إذا طلبت (هذا يتطلب Service Role أو أن يكون المستخدم هو نفسه، 
    // ولكن للأدمن في هذا النظام سنعتمد على تحديث البروفايل حالياً)
    // ملاحظة: تحديث كلمة المرور لمستخدم آخر يتطلب Supabase Admin API (Service Role)
    // سنكتفي حالياً بتحديث البيانات الأساسية.

    return { error: null };
  } catch (err: any) {
    console.error('Error in adminUpdateUser:', err);
    return { error: err };
  }
};

/**
 * دالة لتحديث الملف الشخصي للمستخدم الحالي
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  try {
    // 1. تحديث البيانات في جدول profiles
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // 2. تحديث Metadata في Auth إذا كان متاحاً
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === userId) {
      const authUpdates: any = {};
      if (updates.full_name) authUpdates.full_name = updates.full_name;
      if (updates.phone) authUpdates.phone = updates.phone;
      if (updates.area) authUpdates.area = updates.area;
      if (updates.vehicle_type) authUpdates.vehicle_type = updates.vehicle_type;
      if (updates.national_id) authUpdates.national_id = updates.national_id;

      if (Object.keys(authUpdates).length > 0) {
        await supabase.auth.updateUser({
          data: authUpdates
        });
      }
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Error updating user profile:', err);
    return { error: err };
  }
};

/**
 * دالة للحصول على الجلسة الحالية بسرعة (أفضل للأداء في الواجهة)
 */
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

/**
 * دالة للحصول على المستخدم الحالي (أكثر أماناً)
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      // إذا فشل getUser، نجرب getSession كخيار بديل سريع
      const session = await getCurrentSession();
      return session?.user || null;
    }
    return user;
  } catch (e) {
    const session = await getCurrentSession();
    return session?.user || null;
  }
};
