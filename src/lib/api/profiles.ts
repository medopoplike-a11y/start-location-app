
import { supabase } from '../supabaseClient';

export const fetchProfiles = async (role?: 'driver' | 'vendor' | 'admin') => {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (role) query = query.eq('role', role);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const fetchProfileById = async (id: string) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const updateProfile = async (id: string, updates: any) => {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const toggleLock = async (id: string, isLocked: boolean) => {
  const { data, error } = await supabase.from('profiles').update({ is_locked: isLocked }).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteUserByAdmin = async (id: string) => {
  // Use RPC for safe deletion of user and related data
  const { error } = await supabase.rpc('delete_user_by_admin', { p_user_id: id });
  if (error) throw error;
  return true;
};

export const subscribeToProfiles = (
  callback: (payload: any) => void,
  opts: { role?: 'admin' | 'driver' | 'vendor'; userId?: string } = {}
) => {
  const { role = 'admin', userId } = opts;
  // Use a per-role/per-user channel name so each client gets its own server-side
  // filter — no more cross-talk where drivers receive other users' profile changes.
  const channelName =
    role === 'admin'
      ? 'global:profiles'
      : `profiles:${role}:${userId || 'anon'}`;

  // Server-side filter: non-admins only get changes for their OWN row. This
  // dramatically cuts realtime traffic and prevents stale/foreign data from
  // leaking into driver/vendor UIs.
  const filter = role !== 'admin' && userId ? `id=eq.${userId}` : undefined;

  const channel = supabase.channel(channelName);

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'profiles', filter },
    (payload) => {
      const oldData = payload.old as any;
      const newData = payload.new as any;
      if (
        !oldData ||
        oldData.is_online !== newData.is_online ||
        JSON.stringify(oldData.location) !== JSON.stringify(newData.location) ||
        oldData.is_locked !== newData.is_locked
      ) {
        callback({ ...payload, source: 'postgres' });
      }
    }
  );

  // Driver-location broadcast is only useful for the admin live map.
  if (role === 'admin') {
    channel.on('broadcast', { event: 'location_update' }, ({ payload }) => {
      callback({
        eventType: 'UPDATE',
        new: {
          id: payload.id,
          name: payload.name,
          location: payload.location,
          is_online: true,
          last_location_update: new Date().toISOString(),
        },
        source: 'broadcast',
      });
    });
  }

  return channel.subscribe();
};
