export interface Order {
  id: string;
  vendor: string;
  vendorId: string;
  driverId: string;
  customer: string;
  address: string;
  distanceValue: number;
  distance: string;
  fee: string;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
  coords: { lat: number; lng: number } | null;
  vendorCoords: { lat: number; lng: number } | null;
  customerCoords: { lat: number; lng: number } | null;
  prepTime: string;
  isPickedUp: boolean;
  priority: number;
  statusUpdatedAt?: string;
  vendorPhone?: string;
  vendorArea?: string;
  customerPhone?: string;
  vendorCollectedAt?: string | null;
  driverConfirmedAt?: string | null;
  orderValue?: number;
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
  financials?: {
    order_value?: number;
    delivery_fee?: number;
    system_commission?: number;
    driver_earnings?: number;
    prep_time?: string;
  };
}

export interface DBDriverOrder {
  id: string;
  vendor_id: string;
  driver_id?: string | null;
  created_at?: string | null;
  profiles?: {
    full_name?: string;
    phone?: string;
    location?: { lat: number; lng: number };
  } | null;
  customer_details: {
    name?: string;
    phone?: string;
    address?: string;
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
  financials: {
    delivery_fee: number;
    prep_time: string;
    order_value?: number;
    system_commission?: number;
    driver_earnings?: number;
  };
  distance?: number;
  status: Order["status"];
  status_updated_at?: string;
  vendor_collected_at?: string | null;
  driver_confirmed_at?: string | null;
}
