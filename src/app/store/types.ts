import type { Order as DBOrder } from "@/lib/orders";

export interface Order {
  id: string;
  customer: string;
  phone: string;
  address: string;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
  driver: string | null;
  driverPhone?: string;
  amount: string;
  deliveryFee: string;
  time: string;
  createdAt: string;
  isPickedUp: boolean;
  notes: string;
  prepTime: string;
  invoiceUrl?: string;
  vendorCollectedAt?: string | null;
  driverConfirmedAt?: string | null;
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
    vendor_commission?: number;
    driver_earnings?: number;
    insurance_fee?: number;
    prep_time?: string;
  };
}

export interface VendorLocation {
  lat: number;
  lng: number;
}

export interface OnlineDriver {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface SettlementHistoryItem {
  id: string;
  amount: number;
  status: string;
  date: string;
}

export type VendorDBOrder = DBOrder & {
  driver?: {
    full_name?: string;
    phone?: string;
  } | null;
};
