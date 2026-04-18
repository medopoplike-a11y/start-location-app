
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

export const subscribeToProfiles = (callback: (payload: any) => void) => {
  const channel = supabase.channel('global:profiles');

  return channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
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
    })
    .on('broadcast', { event: 'location_update' }, ({ payload }) => {
      callback({
        eventType: 'UPDATE',
        new: {
          id: payload.id,
          name: payload.name,
          location: payload.location,
          is_online: true,
          last_location_update: new Date().toISOString()
        },
        source: 'broadcast'
      });
    })
    .subscribe();
};
