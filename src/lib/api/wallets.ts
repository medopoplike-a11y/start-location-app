
import { supabase } from '../supabaseClient';

export const fetchWallets = async (userId?: string) => {
  let query = supabase.from('wallets').select('*, profiles!user_id(full_name, role)').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const fetchWalletById = async (userId: string) => {
  const { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
  if (error) throw error;
  return data;
};

export const updateWallet = async (userId: string, updates: { balance?: number; debt?: number; system_balance?: number }) => {
  const { data, error } = await supabase.from('wallets').update(updates).eq('user_id', userId).select().single();
  if (error) throw error;
  return data;
};

export const fetchSettlements = async (userId?: string) => {
  let query = supabase.from('settlements').select('*').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const subscribeToWallets = (userId: string, callback: () => void) => {
  return supabase
    .channel(`wallet:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'wallets',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe();
};

export const subscribeToSettlements = (userId: string, callback: () => void) => {
  return supabase
    .channel(`settlements:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'settlements',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe();
};
