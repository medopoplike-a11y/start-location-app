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
  driverInsurance: number;
  vendorInsurance: number;
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
  // New settings for per-vendor customization
  billingType?: 'commission' | 'fixed_salary';
  vendorCommissionType?: 'percentage' | 'fixed';
  vendorCommissionValue?: number;
}

export const calculateOrderFinancials = (customerCount: number = 1, manualDeliveryFees: number[] = [], config?: PricingConfig): OrderFinancials => {
  // Total delivery fee is the sum of all manual delivery fees for each customer
  const totalDeliveryFee = manualDeliveryFees.reduce((sum, fee) => sum + (fee || 0), 0);
  
  // 1. Driver Side Calculations
  const driverCommPct = (config?.driverCommissionPct ?? 15) / 100;
  const driverInsurance = customerCount * (config?.driverInsuranceFee ?? 1.0);
  const driverSystemCommission = Math.round(totalDeliveryFee * driverCommPct * 100) / 100;

  // 2. Vendor Side Calculations
  let vendorSystemCommission = 0;
  // Strictly 1 EGP per customer from vendor side
  const vendorInsurance = customerCount * 1.0; 

  // If vendor is on fixed salary, they don't pay per-order commission
  if (config?.billingType !== 'fixed_salary') {
    if (config?.vendorCommissionType === 'fixed') {
      // Fixed commission per ORDER (not per customer, but could be adjusted if needed)
      vendorSystemCommission = config.vendorCommissionValue || 0;
    } else {
      // Percentage of delivery fee
      const vendorPct = (config?.vendorCommissionValue ?? config?.vendorCommissionPct ?? 15) / 100;
      vendorSystemCommission = Math.round(totalDeliveryFee * vendorPct * 100) / 100;
    }
  } else {
    // Fixed salary vendors pay 0 commission, but STILL pay insurance per order
    vendorSystemCommission = 0; 
  }

  // Driver Earnings: Total delivery fee minus their 15% commission and their 1 EGP insurance
  const driverEarnings = Math.round((totalDeliveryFee - driverSystemCommission - driverInsurance) * 100) / 100;

  return {
    totalFee: Math.round(totalDeliveryFee * 100) / 100,
    insuranceFundTotal: driverInsurance + vendorInsurance,
    driverInsurance,
    vendorInsurance,
    systemCommission: driverSystemCommission,
    vendorCommission: vendorSystemCommission,
    driverEarnings,
    vendorFee: vendorSystemCommission + vendorInsurance // Total owed by vendor to company for this order
  };
};
