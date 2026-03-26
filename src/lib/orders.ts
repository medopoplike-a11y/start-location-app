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
 * جلب طلبات مطعم معين
 */
export const getVendorOrders = async (vendorId: string) => {
  const { data, error } = await supabase
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
  const updates: any = { status };
  if (driverId) updates.driver_id = driverId;
  if (status === 'delivered') updates.driver_confirmed_at = new Date().toISOString();

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

export const subscribeToMessages = (orderId: string, onNewMessage: (msg: any) => void) => {
  return supabase
    .channel(`chat-${orderId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'order_messages',
      filter: `order_id=eq.${orderId}`
    }, (payload) => onNewMessage(payload.new))
    .subscribe();
};
