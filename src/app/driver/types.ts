export interface Order {
  id: string;
  vendor: string;
  vendorId: string;
  customer: string;
  address: string;
  distanceValue: number;
  distance: string;
  fee: string;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
  coords: { lat: number; lng: number };
  prepTime: string;
  isPickedUp: boolean;
  priority: number;
  vendorPhone?: string;
  customerPhone?: string;
  vendorCollectedAt?: string | null;
  driverConfirmedAt?: string | null;
}

export interface DBDriverOrder {
  id: string;
  vendor_id: string;
  profiles?: {
    full_name?: string;
    phone?: string;
    location?: { lat: number; lng: number };
  } | null;
  customer_details: {
    name: string;
    phone?: string;
    address: string;
  };
  financials: {
    delivery_fee: number;
    prep_time: string;
  };
  distance?: number;
  status: Order["status"];
  vendor_collected_at?: string | null;
  driver_confirmed_at?: string | null;
}
