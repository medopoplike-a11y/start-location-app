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
 * جلب طلبات المحل
 */
export const getVendorOrders = async (vendorId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles:driver_id(full_name, phone)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  return data || [];
};

/**
 * جلب الطلبات المتاحة للطيارين (مع بيانات المطعم)
 */
export const getAvailableOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles:vendor_id(full_name, phone, location)')
    .or('status.eq.pending,status.eq.assigned,status.eq.in_transit')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching available orders:", error);
    return [];
  }
  return data || [];
};

/**
 * إنشاء طلب جديد
 */
export const createOrder = async (order: Partial<Order>) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([order])
    .select()
    .single();

  return { data, error };
};

/**
 * تحديث حالة الطلب
 */
export const updateOrder = async (orderId: string, updates: Partial<Order>) => {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  return { data, error };
};

/**
 * إلغاء الطلب
 */
export const cancelOrder = async (orderId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .select()
    .single();
  return { data, error };
};

/**
 * تأكيد تحصيل المديونية من قبل المحل
 */
export const vendorCollectDebt = async (orderId: string) => {
  const { error } = await supabase
    .from('orders')
    .update({
      vendor_collected_at: new Date().toISOString()
    })
    .eq('id', orderId);
  return { error };
};

/**
 * تأكيد دفع المديونية من قبل الطيار
 */
export const driverConfirmPayment = async (orderId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ driver_confirmed_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  return { data, error };
};

// --- الاشتراكات اللحظية ---

export const subscribeToOrders = (onUpdate: (payload: any) => void) => {
  return supabase
    .channel('orders-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onUpdate)
    .subscribe();
};

export const subscribeToProfiles = (onUpdate: (payload: any) => void) => {
  return supabase
    .channel('profiles-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onUpdate)
    .subscribe();
};

export const subscribeToWallets = (userId: string, onUpdate: (payload: any) => void) => {
  return supabase
    .channel(`wallet-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` }, onUpdate)
    .subscribe();
};

export const subscribeToSettlements = (userId: string, onUpdate: (payload: any) => void) => {
  return supabase
    .channel(`settlements-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements', filter: `user_id=eq.${userId}` }, onUpdate)
    .subscribe();
};

export const deleteCanceledOrders = async (vendorId: string) => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('vendor_id', vendorId)
    .eq('status', 'cancelled');
  return { error };
};
