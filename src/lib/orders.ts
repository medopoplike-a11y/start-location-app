import { supabase } from './supabaseClient';

export interface Order {
  id: string;
  vendor_id: string;
  driver_id: string | null;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  distance: number;
  customer_details: {
    name: string;
    phone: string;
    address: string;
    notes?: string;
    coords?: { lat: number, lng: number } | null;
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
  const updates: Partial<Pick<Order, 'status' | 'driver_id'>> = { status };
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

export const subscribeToOrders = (callback: () => void) => {
  return supabase
    .channel('public:orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe();
};

export const subscribeToProfiles = (callback: () => void) => {
  return supabase
    .channel('public:profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, callback)
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
    .select('id, full_name, location')
    .eq('role', 'driver')
    .eq('is_online', true);

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

  // 4. Sort by fewest orders first, then by nearest distance
  const sorted = available.sort((a, b) => {
    const aOrders = orderCount[a.id] || 0;
    const bOrders = orderCount[b.id] || 0;
    if (aOrders !== bOrders) return aOrders - bOrders;

    if (vendorLocation && a.location && b.location) {
      const aLoc = a.location as { lat: number; lng: number };
      const bLoc = b.location as { lat: number; lng: number };
      return haversineKm(vendorLocation, aLoc) - haversineKm(vendorLocation, bLoc);
    }
    return 0;
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
