import { supabase } from './supabaseClient';

export interface Order {
  id: string;
  vendor_id: string;
  driver_id: string | null;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  customer_details: {
    name: string;
    phone: string;
    address: string;
    notes?: string;
  };
  financials: {
    order_value: number;
    delivery_fee: number;
    prep_time?: string;
  };
  invoice_url?: string;
  vendor_collected_at?: string | null;
  driver_confirmed_at?: string | null;
  created_at: string;
}

/**
 * جلب جميع طلبات المحل الحالي
 */
export const getVendorOrders = async (vendorId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles:driver_id(full_name, phone)') // جلب معلومات السائق
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching vendor orders:", error);
    return [];
  }
  return data || [];
};

/**
 * جلب الطلبات المتاحة للطيارين (مع بيانات المطعم)
 */
export const getAvailableOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles:vendor_id(full_name, phone, location)') // جلب معلومات المطعم
    .or('status.eq.pending,status.eq.assigned,status.eq.in_transit')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching available orders:", error);
    return [];
  }
  return data || [];
};

/**
 * تحصيل مديونية الطلب من قبل المحل
 */
export const vendorCollectDebt = async (orderId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ vendor_collected_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  return { data, error };
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

/**
 * إنشاء طلب جديد
 */
export const createOrder = async (orderData: Omit<Order, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();

  return { data, error };
};

/**
 * تحديث بيانات طلب
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
 * إلغاء طلب
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
 * حذف كافة الطلبات الملغية لمحل معين
 */
export const deleteCanceledOrders = async (vendorId: string) => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('vendor_id', vendorId)
    .eq('status', 'cancelled');

  return { error };
};

/**
 * الاستماع للتغييرات اللحظية في الطلبات (Real-time) مع معالجة محسنة
 */
export const subscribeToOrders = (callback: (payload: any) => void) => {
  const channel = supabase
    .channel('orders_realtime_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        console.log("Real-time order change:", payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log("Orders subscription status:", status);
      if (status === 'CHANNEL_ERROR') {
        console.warn("Real-time subscription error, attempting to reconnect...");
        setTimeout(() => channel.subscribe(), 5000);
      }
    });
  
  return channel;
};

/**
 * الاستماع لتغييرات المحفظة (Real-time) لضمان تحديث الأرصدة فوراً
 */
export const subscribeToWallets = (userId: string, callback: (payload: any) => void) => {
  const channel = supabase
    .channel(`wallet_${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
      (payload) => {
        console.log("Real-time wallet update:", payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        setTimeout(() => channel.subscribe(), 5000);
      }
    });
  
  return channel;
};

/**
 * الاستماع لتغييرات التسويات (Settlements)
 */
export const subscribeToSettlements = (userId: string, callback: (payload: any) => void) => {
  const channel = supabase
    .channel(`settlements_${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settlements', filter: `user_id=eq.${userId}` },
      (payload) => {
        console.log("Real-time settlement change:", payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        setTimeout(() => channel.subscribe(), 5000);
      }
    });
  
  return channel;
};

/**
 * الاستماع لتغييرات الملفات الشخصية (للمواقع والاتصال)
 */
export const subscribeToProfiles = (callback: (payload: any) => void) => {
  const channel = supabase
    .channel('profiles_realtime_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      (payload) => {
        console.log("Real-time profile change:", payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log("Profiles subscription status:", status);
      if (status === 'CHANNEL_ERROR') {
        setTimeout(() => channel.subscribe(), 5000);
      }
    });
  
  return channel;
};
