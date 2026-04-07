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
    .select('*, profiles:vendor_id(full_name, phone, location, area)')
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
    .select('*, profiles:vendor_id(full_name, phone, location, area)')
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

  return await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
};

/**
 * الاشتراكات الحية (Real-time Subscriptions)
 */

export const subscribeToOrders = (callback: () => void, vendorId?: string) => {
  const channel = supabase.channel(`orders${vendorId ? `:${vendorId}` : ''}`);
  
  if (vendorId) {
    return channel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `vendor_id=eq.${vendorId}`
      }, callback)
      .subscribe();
  }

  return channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe();
};

export const subscribeToProfiles = (callback: () => void, profileId?: string) => {
  const channel = supabase.channel(`profiles${profileId ? `:${profileId}` : ''}`);
  
  if (profileId) {
    return channel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles',
        filter: `id=eq.${profileId}`
      }, callback)
      .subscribe();
  }

  // For global profile changes (like online status), we should be careful.
  // Instead of subscribing to ALL profile changes, we only care about is_online changes.
  return channel
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'profiles'
    }, (payload) => {
      // Only trigger if is_online status changed or it's an important update
      // This helps reduce unnecessary refreshes from location updates
      const oldStatus = (payload.old as any)?.is_online;
      const newStatus = (payload.new as any)?.is_online;
      if (oldStatus !== newStatus) {
        callback();
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
  // 1. Get all online drivers
  const { data: onlineDrivers, error: driversError } = await supabase
    .from('profiles')
    .select('id, full_name, location, is_locked')
    .eq('role', 'driver')
    .eq('is_online', true)
    .eq('is_locked', false);

  if (driversError || !onlineDrivers?.length) {
    return { success: false, error: 'لا يوجد طيارين متاحين الآن' };
  }

  // 2. Count active orders per driver
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('driver_id')
    .in('status', ['assigned', 'in_transit'])
    .not('driver_id', 'is', null);

  const orderCount: Record<string, number> = {};
  (activeOrders || []).forEach((o) => {
    if (o.driver_id) orderCount[o.driver_id] = (orderCount[o.driver_id] || 0) + 1;
  });

  // 3. Filter drivers under the max limit (3 active orders)
  const MAX_ORDERS_PER_DRIVER = 3;
  const available = onlineDrivers.filter((d) => (orderCount[d.id] || 0) < MAX_ORDERS_PER_DRIVER);

  if (!available.length) {
    return { success: false, error: 'جميع الطيارين مشغولون (الحد الأقصى 3 طلبات)' };
  }

  // 4. Advanced sorting:
  // - First priority: Drivers with 0 orders (to ensure fair distribution)
  // - Second priority: Nearest distance
  // - Third priority: Fewest total orders
  const sorted = available.sort((a, b) => {
    const aOrders = orderCount[a.id] || 0;
    const bOrders = orderCount[b.id] || 0;
    
    // Fair distribution check
    if (aOrders === 0 && bOrders > 0) return -1;
    if (bOrders === 0 && aOrders > 0) return 1;

    // Distance check
    if (vendorLocation && a.location && b.location) {
      try {
        const aLoc = typeof a.location === 'string' ? JSON.parse(a.location) : a.location;
        const bLoc = typeof b.location === 'string' ? JSON.parse(b.location) : b.location;
        
        if (aLoc.lat && aLoc.lng && bLoc.lat && bLoc.lng) {
          const distA = haversineKm(vendorLocation, aLoc);
          const distB = haversineKm(vendorLocation, bLoc);
          if (Math.abs(distA - distB) > 0.1) return distA - distB; // 100m tolerance
        }
      } catch (e) {
        console.warn("Distance sort failed for some drivers", e);
      }
    }
    
    // Fallback to order count
    return aOrders - bOrders;
  });

  const best = sorted[0];

  // 5. Assign the order
  const { error: assignError } = await supabase
    .from('orders')
    .update({ status: 'assigned', driver_id: best.id })
    .eq('id', orderId);

  if (assignError) {
    return { success: false, error: 'فشل تعيين الطيار' };
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
