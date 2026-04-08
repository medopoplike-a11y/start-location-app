/**
 * Pricing Engine for Start Location (Simplified)
 * 
 * New Rules:
 * - No distance calculations. Delivery fee is manually set or based on flat agreement.
 * - Insurance Fee: Fixed 1 EGP per order from BOTH Driver and Vendor.
 * - System Commission: 
 *   - From Driver: 15% of Delivery Fee.
 *   - From Vendor: 15% of Delivery Fee.
 */

export const SAFE_RIDE_FEE = 1.0; // Driver's insurance fee
export const VENDOR_INSURANCE_FEE = 1.0; // Vendor's insurance fee

export interface OrderFinancials {
  totalFee: number;
  insuranceFundTotal: number; // Sum of driver + vendor insurance (2 EGP total per order)
  systemCommission: number; // Driver side (15%)
  vendorCommission: number; // Vendor side (15%)
  driverEarnings: number;
  vendorFee: number; // Vendor side insurance + commission
}

export interface PricingConfig {
  driverCommissionPct?: number;
  vendorCommissionPct?: number;
  driverInsuranceFee?: number;
  vendorInsuranceFee?: number;
}

export const calculateOrderFinancials = (customerCount: number = 1, manualDeliveryFees: number[] = [], config?: PricingConfig): OrderFinancials => {
  // Total delivery fee is the sum of all manual delivery fees for each customer
  const totalDeliveryFee = manualDeliveryFees.reduce((sum, fee) => sum + (fee || 0), 0);
  
  // Default 15% for both sides as requested
  const driverCommPct = (config?.driverCommissionPct ?? 15) / 100;
  const vendorCommPct = (config?.vendorCommissionPct ?? 15) / 100;
  
  // 1 EGP insurance fee per customer from each side
  const driverInsurance = customerCount * (config?.driverInsuranceFee ?? 1.0);
  const vendorInsurance = customerCount * (config?.vendorInsuranceFee ?? 1.0);
  
  // System Commission from Driver side (15% of delivery fee)
  const driverSystemCommission = Math.round(totalDeliveryFee * driverCommPct * 100) / 100;

  // System Commission from Vendor side (15% of delivery fee)
  const vendorSystemCommission = Math.round(totalDeliveryFee * vendorCommPct * 100) / 100;

  // Driver Earnings: Total delivery fee minus their 15% commission and their 1 EGP insurance
  const driverEarnings = Math.round((totalDeliveryFee - driverSystemCommission - driverInsurance) * 100) / 100;

  return {
    totalFee: Math.round(totalDeliveryFee * 100) / 100,
    insuranceFundTotal: driverInsurance + vendorInsurance,
    systemCommission: driverSystemCommission,
    vendorCommission: vendorSystemCommission,
    driverEarnings,
    vendorFee: vendorSystemCommission + vendorInsurance // Total owed by vendor to company
  };
};
