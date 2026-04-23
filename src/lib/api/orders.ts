
import { supabase } from '../supabaseClient';
import type { Order, OrderMessage } from '@/app/store/types';
import { dbService } from '../db-service';
import { Capacitor } from '@capacitor/core';

/**
 * Unified Order API - V17.2.7 Radical Stability Audit
 * The single source of truth for order operations across all roles.
 */

export const fetchOrders = async (options: {
  role?: 'admin' | 'driver' | 'vendor',
  userId?: string,
  status?: string[],
  limit?: number,
  /** When true (native only), return local cache instantly without awaiting remote. */
  preferCache?: boolean,
} = {}) => {
  // V17.4.8: True Local-First Strategy on native platforms.
  // If we have a cache, return it immediately and refresh in background.
  if (Capacitor.isNativePlatform()) {
    const localOrders = await dbService.getLocalOrders({
      role: options.role,
      userId: options.userId,
      status: options.status,
      limit: options.limit,
    });
    if (localOrders && localOrders.length > 0) {
      console.log('[OrdersAPI] Local-first: returning', localOrders.length, 'cached orders');
      // Always trigger a background sync so the next call has fresher data.
      dbService.syncFromRemote().catch(() => {});
      if (options.preferCache !== false) {
        return localOrders;
      }
    }
  }

  let query = supabase
    .from('orders')
    .select('*, vendor:vendor_id(full_name, phone, location, area), driver:driver_id(full_name, phone)')
    .order('created_at', { ascending: false });

  if (options.role === 'driver' && options.userId) {
    query = query.or(`driver_id.eq.${options.userId},status.eq.pending`);
  } else if (options.role === 'vendor' && options.userId) {
    query = query.eq('vendor_id', options.userId);
  }

  if (options.status && options.status.length > 0) {
    query = query.in('status', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Persist fresh remote results into the local cache (native only).
  if (Capacitor.isNativePlatform() && data && data.length > 0) {
    Promise.all(data.map((o) => dbService.saveOrder(o).catch(() => {}))).catch(() => {});
  }

  return data;
};

export const updateOrderStatus = async (orderId: string, status: string, driverId?: string) => {
  const updates: any = { 
    status,
    status_updated_at: new Date().toISOString()
  };
  if (driverId) updates.driver_id = driverId;

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;

  // Unified Broadcast for real-time sync
  const channel = supabase.channel('system_sync');
  await channel.subscribe(async (subStatus) => {
    if (subStatus === 'SUBSCRIBED') {
      await channel.send({
        type: 'broadcast',
        event: 'sync-update',
        payload: { orderId, status, updatedAt: updates.status_updated_at }
      });
      supabase.removeChannel(channel);
    }
  });

  return data;
};

export const createOrder = async (orderData: any) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateOrder = async (orderId: string, orderData: any) => {
  const { data, error } = await supabase
    .from('orders')
    .update(orderData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteOrder = async (orderId: string) => {
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) throw error;
  return true;
};

export const deleteAdminOrder = async (orderId: string) => {
  // Use RPC for safe deletion of order by admin (logs, financials, etc.)
  const { error } = await supabase.rpc('delete_order_by_admin', { p_order_id: orderId });
  if (error) throw error;
  return true;
};

/**
 * توزيع الطلبات تلقائياً على أقرب طيار متاح (الحد الأقصى 3 طلبات نشطة)
 */
const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const assignOrderToNearestDriver = async (
  orderId: string,
  vendorLocation?: { lat: number; lng: number }
): Promise<{ success: boolean; driverName?: string; error?: string }> => {
  // 1. Get online drivers with auto_accept enabled (active in last 30m)
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: onlineDrivers, error: driversError } = await supabase
    .from('profiles')
    .select('id, full_name, location, is_locked, last_location_update, max_active_orders')
    .eq('role', 'driver')
    .eq('is_online', true)
    .eq('auto_accept', true)
    .eq('is_locked', false)
    .gt('last_location_update', thirtyMinsAgo);

  if (driversError || !onlineDrivers?.length) {
    return { success: false, error: 'لا يوجد طيارين متاحين الآن' };
  }

  // 2. Count active deliveries per driver
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('driver_id, customer_details')
    .in('status', ['assigned', 'in_transit'])
    .not('driver_id', 'is', null);

  const activeCounts: Record<string, number> = {};
  (activeOrders || []).forEach((o: any) => {
    if (o.driver_id) {
      const count = Array.isArray(o.customer_details?.customers) ? o.customer_details.customers.length : 1;
      activeCounts[o.driver_id] = (activeCounts[o.driver_id] || 0) + count;
    }
  });

  const available = onlineDrivers.filter((d) => (activeCounts[d.id] || 0) < (d.max_active_orders || 3));

  if (!available.length) {
    return { success: false, error: 'جميع الطيارين مشغولون' };
  }

  // 3. Sort by distance and then load balance
  const sorted = available.sort((a, b) => {
    if (vendorLocation && a.location && b.location) {
      const aLoc = typeof a.location === 'string' ? JSON.parse(a.location) : a.location;
      const bLoc = typeof b.location === 'string' ? JSON.parse(b.location) : b.location;
      if (aLoc?.lat && bLoc?.lat) {
        const distA = haversineKm(vendorLocation, aLoc);
        const distB = haversineKm(vendorLocation, bLoc);
        if (Math.abs(distA - distB) > 0.01) return distA - distB;
      }
    }
    return (activeCounts[a.id] || 0) - (activeCounts[b.id] || 0);
  });

  const best = sorted[0];

  // 4. Atomic assignment
  const { data: rpcData, error: rpcError } = await supabase.rpc('assign_order_atomic', {
    p_order_id: orderId,
    p_driver_id: best.id
  });

  if (rpcError || !(rpcData as any)?.success) {
    return { success: false, error: (rpcData as any)?.error || 'فشل التعيين' };
  }

  return { success: true, driverName: best.full_name };
};

export const subscribeToOrders = (callback: (payload: any) => void, userId?: string, role: 'driver' | 'vendor' | 'admin' = 'admin') => {
  const channel = supabase.channel(`orders:${role}:${userId || 'all'}`);
  
  let filter = undefined;
  if (role === 'vendor' && userId) filter = `vendor_id=eq.${userId}`;
  if (role === 'driver' && userId) filter = `driver_id=eq.${userId}`;

  return channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter }, callback)
    .subscribe();
};

export const subscribeToMessages = (orderId: string, onNewMessage: (msg: OrderMessage) => void) => {
  return supabase
    .channel(`chat-${orderId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'order_messages',
      filter: `order_id=eq.${orderId}`
    }, (payload) => onNewMessage(payload.new as OrderMessage))
    .subscribe();
};
