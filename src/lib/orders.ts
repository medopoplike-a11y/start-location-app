import { supabase } from './supabaseClient';

export interface Order {
  id: string;
  vendor_id: string;
  driver_id: string | null;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  distance: number;
  customer_details: {
    name?: string;
    phone?: string;
    address?: string;
    notes?: string;
    coords?: { lat: number, lng: number } | null;
    customers?: Array<{
      name: string;
      phone: string;
      address: string;
      orderValue: number;
      deliveryFee: number;
      status: 'pending' | 'delivered';
      deliveredAt?: string;
      invoice_url?: string;
    }>;
  };
  financials: {
    order_value: number;
    delivery_fee: number;
    prep_time: string;
    system_commission: number;
    vendor_commission: number;
    driver_earnings: number;
    insurance_fee: number;
  };
  invoice_url?: string;
  vendor_name?: string;
  vendor_phone?: string;
  vendor_area?: string;
  vendor_location?: { lat: number, lng: number } | null;
  created_at?: string;
  status_updated_at?: string;
  vendor_collected_at?: string | null;
  driver_confirmed_at?: string | null;
}

type OrderMessage = Record<string, unknown>;

/**
 * جلب جميع الطلبات المتاحة للطيارين
 */
export const getAvailableOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, vendor:vendor_id(full_name, phone, location, area)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Orders: Fetch available failed", error);
    return [];
  }
  return data || [];
};

/**
 * جلب الطلبات النشطة للطيار (مقبولة أو في الطريق)
 */
export const getDriverActiveOrders = async (driverId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, vendor:vendor_id(full_name, phone, location, area)')
    .eq('driver_id', driverId)
    .in('status', ['assigned', 'in_transit'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Orders: Fetch driver active failed", error);
    return [];
  }
  return data || [];
};

/**
 * جلب طلبات مطعم معين
 */
export const getVendorOrders = async (vendorId: string) => {
  const { data } = await supabase
    .from('orders')
    .select('*, driver:driver_id(full_name, phone)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  return data || [];
};

/**
 * إنشاء طلب جديد
 */
export const createOrder = async (order: Partial<Order>) => {
  return await supabase.from('orders').insert([order]).select().single();
};

/**
 * تحديث طلب موجود
 */
export const updateOrder = async (orderId: string, updates: Partial<Order>) => {
  return await supabase.from('orders').update(updates).eq('id', orderId).select().single();
};

/**
 * إلغاء طلب
 */
export const cancelOrder = async (orderId: string) => {
  return await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId).select().single();
};

/**
 * تأكيد تحصيل المديونية من قبل المطعم
 */
export const vendorCollectDebt = async (orderId: string) => {
  return await supabase
    .from('orders')
    .update({ vendor_collected_at: new Date().toISOString() })
    .eq('id', orderId);
};

/**
 * حذف الطلبات الملغاة (اختياري)
 */
export const deleteCanceledOrders = async (vendorId: string) => {
  return await supabase.from('orders').delete().eq('vendor_id', vendorId).eq('status', 'cancelled');
};

/**
 * تحديث حالة الطلب
 */
export const updateOrderStatus = async (orderId: string, status: Order['status'], driverId?: string) => {
  const updates: any = { 
    status,
    status_updated_at: new Date().toISOString()
  };
  if (driverId) updates.driver_id = driverId;

  // V0.9.76: More robust update with row-level condition check
  let query = supabase.from('orders').update(updates).eq('id', orderId);
  
  // V0.9.78: Improved re-assignment logic. 
  // If status is 'assigned', it must be 'pending' OR already 'assigned' (for re-assignment).
  // If it's 'in_transit', we allow re-assignment too if requested by admin.
  if (status === 'assigned') {
    query = query.in('status', ['pending', 'assigned', 'in_transit']);
  }

  // Use select() to check if the update actually happened
  const { data, error, count } = await query.select();
  
  if (error) {
    console.error("updateOrderStatus: Database error:", error);
    return { data: null, error };
  }

  if (!data || data.length === 0) {
    const msg = status === 'assigned' 
      ? 'فشل التعيين: الطلب لم يعد متاحاً (ربما تم تعيينه بالفعل أو استلامه)' 
      : 'لم يتم العثور على الطلب أو لا يمكن تحديثه';
    return { data: null, error: { message: msg, code: 'NOT_FOUND' } };
  }

  // Broadcast sync event for real-time consistency
  const channel = supabase.channel('system_sync');
  channel.send({
    type: 'broadcast',
    event: 'sync-update',
    payload: { orderId, status: updates.status, updatedAt: updates.status_updated_at }
  });

  return { data: data[0], error: null };
};

/**
 * الاشتراكات الحية (Real-time Subscriptions)
 */

export const subscribeToOrders = (callback: () => void, filterId?: string, role: 'driver' | 'vendor' | 'admin' = 'admin') => {
  const channelId = `orders:${role}${filterId ? `:${filterId}` : ''}`;
  const channel = supabase.channel(channelId);
  
  if (role === 'vendor' && filterId) {
    return channel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `vendor_id=eq.${filterId}`
      }, callback)
      .subscribe();
  }

  if (role === 'driver' && filterId) {
    // V0.9.68: Drivers only listen to their own assigned orders OR new pending orders
    // We use two handlers in one channel for efficiency
    return channel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `driver_id=eq.${filterId}`
      }, callback)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders',
        filter: `status=eq.pending`
      }, callback)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `status=eq.pending`
      }, callback)
      .subscribe();
  }

  return channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe();
};

export const subscribeToProfiles = (callback: (payload?: any) => void, profileId?: string) => {
  const channel = supabase.channel(`profiles${profileId ? `:${profileId}` : ''}`);
  
  if (profileId) {
    return channel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles',
        filter: `id=eq.${profileId}`
      }, (payload) => callback(payload))
      .subscribe();
  }

  // For global profile changes (like online status and location)
  return channel
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'profiles'
    }, (payload) => {
      if (payload.event === 'DELETE' || payload.event === 'INSERT') {
        callback(payload);
        return;
      }

      const oldData = payload.old as any;
      const newData = payload.new as any;
      
      // Trigger update if:
      // 1. is_online changed
      // 2. location changed (crucial for admin map)
      // 3. is_locked changed
      if (
        !oldData || 
        oldData.is_online !== newData.is_online || 
        JSON.stringify(oldData.location) !== JSON.stringify(newData.location) ||
        oldData.is_locked !== newData.is_locked
      ) {
        callback(payload);
      }
    })
    .subscribe();
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
  // 1. Get all online drivers with auto_accept enabled
  // Heartbeat check (V0.9.62): only consider drivers who updated their location in the last 30 minutes
  // (Increased from 10 to 30 mins to match Admin UI resilience)
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: onlineDrivers, error: driversError } = await supabase
    .from('profiles')
    .select('id, full_name, location, is_locked, last_location_update')
    .eq('role', 'driver')
    .eq('is_online', true)
    .eq('auto_accept', true)
    .eq('is_locked', false)
    .gt('last_location_update', thirtyMinsAgo);

  if (driversError || !onlineDrivers?.length) {
    return { success: false, error: 'لا يوجد طيارين متاحين الآن' };
  }

  // 2. Count active customers (deliveries) per driver
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('driver_id, customer_details')
    .in('status', ['assigned', 'in_transit'])
    .not('driver_id', 'is', null);

  const activeCustomerCounts: Record<string, number> = {};
  (activeOrders || []).forEach((o: any) => {
    if (o.driver_id) {
      // Each order has a 'customers' array inside 'customer_details'
      const count = Array.isArray(o.customer_details?.customers) ? o.customer_details.customers.length : 1;
      activeCustomerCounts[o.driver_id] = (activeCustomerCounts[o.driver_id] || 0) + count;
    }
  });

  // 3. Filter drivers under the max limit (Default: 3 active customers)
  // Logic: Each driver can have their own 'max_active_orders' setting in their profile
  const { data: driverConfigs } = await supabase
    .from('profiles')
    .select('id, max_active_orders')
    .in('id', onlineDrivers.map(d => d.id));

  const maxOrdersMap: Record<string, number> = {};
  (driverConfigs || []).forEach(d => {
    maxOrdersMap[d.id] = d.max_active_orders || 3; // Default to 3 if not set
  });

  const available = onlineDrivers.filter((d) => (activeCustomerCounts[d.id] || 0) < (maxOrdersMap[d.id] || 3));

  if (!available.length) {
    return { success: false, error: 'جميع الطيارين مشغولون (وصلوا للحد الأقصى للطلبات)' };
  }

  // 4. Advanced sorting (V0.9.66 - Unlimited Radius):
  // - First priority: Nearest distance to vendor (Efficiency)
  // - Second priority: Driver with FEWEST active customers (Load balancing)
  const sorted = available.sort((a, b) => {
    // 1. Distance check (Primary - Efficiency)
    if (vendorLocation && a.location && b.location) {
      try {
        const aLoc = typeof a.location === 'string' ? JSON.parse(a.location) : a.location;
        const bLoc = typeof b.location === 'string' ? JSON.parse(b.location) : b.location;
        
        if (aLoc?.lat && aLoc?.lng && bLoc?.lat && bLoc?.lng) {
          const distA = haversineKm(vendorLocation, aLoc);
          const distB = haversineKm(vendorLocation, bLoc);
          
          // If distance difference is significant (> 10m), use distance
          if (Math.abs(distA - distB) > 0.01) {
            return distA - distB;
          }
        }
      } catch (e) {}
    }

    // 2. Customer count check (Secondary - Load Balancing)
    const aCustomers = activeCustomerCounts[a.id] || 0;
    const bCustomers = activeCustomerCounts[b.id] || 0;
    return aCustomers - bCustomers;
  });

  const best = sorted[0];

  // 5. Assign the order using Atomic RPC (V0.9.88)
  // This prevents race conditions where two orders might be assigned to the same driver simultaneously
  // or an order might be assigned to a driver who just went offline.
  const { data: rpcData, error: rpcError } = await supabase.rpc('assign_order_atomic', {
    p_order_id: orderId,
    p_driver_id: best.id
  });

  if (rpcError || !(rpcData as any)?.success) {
    return { success: false, error: (rpcData as any)?.error || 'فشل تعيين الطيار (حالة سباق)' };
  }

  return { success: true, driverName: best.full_name };
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
