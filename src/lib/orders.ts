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
 * جلب جميع الطلبات المتاحة للطيارين (محسن للأداء)
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
 * جلب تفاصيل طلب واحد مع بيانات المحل والطيار
 */
export const getOrderDetails = async (orderId: string) => {
  return await supabase
    .from('orders')
    .select('*, vendor:vendor_id(full_name, phone, location), driver:driver_id(full_name, phone)')
    .eq('id', orderId)
    .single();
};

/**
 * تحديث حالة الطلب مع تسجيل الحدث في الـ History (قريباً)
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
 * نظام الدردشة - إرسال رسالة
 */
export const sendChatMessage = async (orderId: string, senderId: string, text: string) => {
  return await supabase
    .from('order_messages')
    .insert([{ order_id: orderId, sender_id: senderId, message: text }]);
};

/**
 * نظام الدردشة - الاستماع للرسائل الجديدة
 */
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

/**
 * تأكيد استلام المديونية (المطعم يؤكد استلام المال من الطيار)
 */
export const confirmVendorCollection = async (orderId: string) => {
  return await supabase
    .from('orders')
    .update({ vendor_collected_at: new Date().toISOString() })
    .eq('id', orderId);
};

// بقية الدوال الأساسية
export const getVendorOrders = async (vendorId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, driver:driver_id(full_name, phone)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  return data || [];
};

export const createOrder = async (order: Partial<Order>) => {
  return await supabase.from('orders').insert([order]).select().single();
};

export const cancelOrder = async (orderId: string) => {
  return await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId).select().single();
};
