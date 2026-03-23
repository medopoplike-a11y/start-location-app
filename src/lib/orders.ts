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
    .select('*, profiles!driver_id(full_name, phone)') // جلب معلومات السائق
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching vendor orders:", error);
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
 * الاستماع للتغييرات اللحظية في الطلبات (Real-time)
 */
export const subscribeToOrders = (callback: (payload: any) => void) => {
  return supabase
    .channel('orders_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe();
};
