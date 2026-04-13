export interface AdminOrder {
  id: string;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
  vendor_full_name?: string | null;
  vendor_id?: string;
  driver_id?: string | null;
  customer_details?: { 
    name?: string;
    phone?: string;
    address?: string;
    notes?: string;
    coords?: { lat: number; lng: number } | null;
    customers?: Array<{
      name: string;
      phone: string;
      address: string;
      orderValue: number;
      deliveryFee: number;
      status: 'pending' | 'delivered';
      deliveredAt?: string;
    }>;
  };
  financials?: { 
    order_value?: number; 
    delivery_fee?: number; 
    insurance_fee?: number; 
    system_commission?: number; 
    vendor_commission?: number;
    prep_time?: string;
  };
  created_at: string;
  status_updated_at?: string;
  vendor_collected_at?: string | null;
  driver_confirmed_at?: string | null;
}

export interface LiveOrderItem {
  id: string;
  id_full: string;
  vendor: string;
  customer: string;
  status: string;
  driver: string | null;
  driver_id?: string | null;
  amount: number;
  delivery_fee: number;
  created_at: string;
  customers?: AdminOrder['customer_details']['customers'];
}

export interface DriverCard {
  id: string;
  id_full: string;
  name: string;
  status: string;
  isShiftLocked: boolean;
  earnings: number;
  debt: number;
  totalOrders: number;
  email?: string;
  phone?: string;
  max_active_orders?: number;
  billing_type?: 'commission' | 'fixed_salary';
  commission_value?: number;
  monthly_salary?: number;
}

export interface VendorCard {
  id: string;
  id_full: string;
  name: string;
  type: string;
  orders: number;
  balance: number;
  status: string;
  email?: string;
  phone?: string;
  location?: { lat?: number; lng?: number } | null;
  commission_type?: 'percentage' | 'fixed';
  commission_value?: number;
  billing_type?: 'commission' | 'fixed_salary';
  monthly_salary?: number;
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  area: string;
  vehicle_type: string;
  national_id: string;
  role: string;
  created_at: string;
}

export interface OnlineDriver {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lastSeen: string;
  status?: 'available' | 'busy';
  is_online?: boolean;
}

export interface SettlementItem {
  id: string;
}

export interface ProfileRow {
  id: string;
  role?: string;
  is_online?: boolean;
  is_locked?: boolean;
  full_name?: string;
  phone?: string;
  area?: string;
  vehicle_type?: string;
  national_id?: string;
  created_at?: string;
  updated_at?: string;
  last_location_update?: string;
  location?: { lat?: number; lng?: number } | string | null;
  email?: string;
}

export interface WalletRow {
  user_id: string;
  balance?: number;
  debt?: number;
  system_balance?: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  text: string;
  time: string;
}

export interface ActivityLogItem {
  id: string;
  text: string;
  time: string;
}
