import { supabase } from './supabaseClient';

export const fetchAdminOrders = async (limit = 100) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles:vendor_id(full_name, phone, location, area)')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
};

export const fetchLiveOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles:vendor_id(full_name, phone, location, area)')
    .in('status', ['pending', 'assigned', 'in_transit'])
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const fetchAdminProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("AdminApi: profiles fetch error:", error);
      throw error;
    }
    return data;
  } catch (err) {
    console.error("AdminApi: Unexpected error in fetchAdminProfiles:", err);
    return [];
  }
};

export const fetchAdminWallets = async () => {
  const { data, error } = await supabase
    .from('wallets')
    .select('*, profiles!user_id(full_name, role)')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const updateAdminWallet = async (userId: string, updates: { balance?: number; debt?: number; system_balance?: number }) => {
  const { data, error } = await supabase
    .from('wallets')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const toggleDriverLock = async (driverId: string, isLocked: boolean) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_locked: isLocked })
    .eq('id', driverId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const resetUserDataAdmin = async (targetUserId: string) => {
  const { data, error } = await supabase.rpc('reset_wallets', { p_user_id: targetUserId });
  if (error) throw error;
  return { success: true, data };
};

export const resetAllSystemDataAdmin = async () => {
  const { data, error } = await supabase.rpc('reset_wallets', { p_user_id: null });
  if (error) throw error;
  return { success: true, data };
};

export const fetchAdminAppConfig = async () => {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .single();
  
  if (error) throw error;
  return data;
};

export const updateAdminAppConfig = async (config: Record<string, unknown>) => {
  const { data, error } = await supabase
    .from('app_config')
    .update(config)
    .eq('id', (config.id as string) || '1')
    .select()
    .single();
  
  if (error && error.code === 'PGRST116') {
    const { data: inserted, error: insError } = await supabase
      .from('app_config')
      .insert([config])
      .select()
      .single();
    if (insError) throw insError;
    return inserted;
  }
  
  if (error) throw error;
  return data;
};

export const createAdminOrder = async (orderData: any) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateAdminOrder = async (orderId: string, updates: any) => {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteAdminOrder = async (orderId: string) => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);
  
  if (error) throw error;
  return true;
};

export const fetchUserOrderHistory = async (userId: string, role: 'driver' | 'vendor') => {
  const query = supabase
    .from('orders')
    .select('*, vendor:vendor_id(full_name, phone), driver:driver_id(full_name, phone)')
    .order('created_at', { ascending: false });
  
  if (role === 'driver') {
    query.eq('driver_id', userId);
  } else {
    query.eq('vendor_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const fetchAllOrdersAdmin = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, vendor:vendor_id(full_name, phone), driver:driver_id(full_name, phone)')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const updateProfileBilling = async (profileId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteUserByAdmin = async (userId: string) => {
  // 1. Delete associated data (handled by cascading or manual cleanup)
  // Wallets, profiles, settlements should be linked to user id.
  
  // Note: deleting the user from auth.users requires service role or a specialized RPC.
  // For this project, we'll use a RPC that deletes from profiles/wallets and then auth.
  const { data, error } = await supabase.rpc('delete_user_complete', { target_user_id: userId });
  
  if (error) {
    // Fallback: manual deletion of data if RPC is not available
    await supabase.from('wallets').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
    throw error;
  }
  
  return data;
};

export const updateUserAdmin = async (userId: string, updates: { email?: string; password?: string; full_name?: string; phone?: string }) => {
  const { data, error } = await supabase.rpc('update_user_admin', { 
    target_user_id: userId,
    new_email: updates.email,
    new_password: updates.password,
    new_full_name: updates.full_name,
    new_phone: updates.phone
  });
  
  if (error) throw error;
  return data;
};

