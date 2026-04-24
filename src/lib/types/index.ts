
/**
 * Global Type Definitions for Start Location App
 * V1.3.2 Efficiency Audit
 */

export type Role = 'admin' | 'driver' | 'vendor';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  is_online: boolean;
  is_locked: boolean;
  location?: { lat: number; lng: number; ts?: number };
  last_location_update?: string;
  created_at: string;
  updated_at: string;
  area?: string;
  vehicle_type?: string;
  national_id?: string;
  max_active_orders?: number;
  auto_accept?: boolean;
}

export interface Order {
  id: string;
  vendor_id: string;
  driver_id: string | null;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  customer_details: {
    name?: string;
    phone?: string;
    address?: string;
    notes?: string;
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
    system_commission: number;
    vendor_commission: number;
    driver_earnings: number;
    insurance_fee: number;
    prep_time?: string;
  };
  invoice_url?: string;
  vendor_name?: string;
  vendor_phone?: string;
  vendor_area?: string;
  vendor_location?: { lat: number; lng: number } | null;
  created_at: string;
  status_updated_at?: string;
  vendor_collected_at?: string | null;
  driver_confirmed_at?: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  debt: number;
  system_balance: number;
  debt_limit: number;
  created_at: string;
}

export interface Settlement {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
}

export interface OnlineDriver extends Partial<Profile> {
  id: string;
  lat: number;
  lng: number;
  lastSeen?: string;
  lastSeenTimestamp?: number;
  path?: Array<{ lat: number; lng: number }>;
}
