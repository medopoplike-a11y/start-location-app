import { supabase } from '../supabaseClient';

/**
 * Admin API - Centralized management for system-wide operations
 */

export const fetchAdminAppConfig = async () => {
  const { data, error } = await supabase.from('app_config').select('*').single();
  if (error) throw error;
  return data;
};

export const updateAdminAppConfig = async (config: any) => {
  const { data, error } = await supabase.from('app_config').update(config).eq('id', config.id).select().single();
  if (error) throw error;
  return data;
};

export const resetUserDataAdmin = async (userId: string) => {
  const { error } = await supabase.rpc('reset_wallet_balance', { p_user_id: userId });
  if (error) throw error;
  return true;
};

export const resetAllSystemDataAdmin = async () => {
  // 1. Reset All Wallets
  const { error: walletError } = await supabase.rpc('reset_all_wallets');
  if (walletError) throw walletError;

  // 2. Cleanup All History
  const { error: cleanupError } = await supabase.rpc('cleanup_all_orders');
  if (cleanupError) throw cleanupError;
  
  return true;
};

export const broadcastAlert = async (message: string) => {
  const channel = supabase.channel('system_sync');
  await channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.send({
        type: 'broadcast',
        event: 'system-alert',
        payload: { message, timestamp: new Date().toISOString() }
      });
      supabase.removeChannel(channel);
    }
  });
  return true;
};
