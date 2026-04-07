/**
 * Pricing Engine for Start Location
 * 
 * Rules:
 * - < 3 km: 30 EGP (Fixed).
 * - 3 - 10 km: 30 EGP + 3 EGP per extra km.
 * - > 10 km: 51 EGP + 5 EGP per extra km.
 */

export const calculateDeliveryFee = (distance: number, surgeFee: number = 0): number => {
  let fee = 0;

  if (distance < 3) {
    fee = 30;
  } else if (distance >= 3 && distance <= 10) {
    const extraDistance = distance - 3;
    fee = 30 + extraDistance * 3;
  } else {
    // Greater than 10 km
    const extraDistance = distance - 10;
    fee = 51 + extraDistance * 5;
  }

  return fee + surgeFee;
};

export const SAFE_RIDE_FEE = 1.0; // Driver's contribution to insurance fund
export const VENDOR_INSURANCE_FEE = 1.0; // Vendor's contribution to insurance fund

export interface OrderFinancials {
  totalFee: number;
  insuranceFundTotal: number; // Sum of driver + vendor insurance contributions
  systemCommission: number; // Driver side (15%)
  vendorCommission: number; // Vendor side (20%)
  driverEarnings: number;
  vendorFee: number; // Vendor contribution to insurance
}

export interface PricingConfig {
  driverCommissionPct?: number;
  vendorCommissionPct?: number;
  vendorCommissionFixed?: number;
  vendorCommissionType?: 'percentage' | 'fixed';
  driverInsuranceFee?: number;
  vendorInsuranceFee?: number;
  surgePricingActive?: boolean;
  surgePricingMultiplier?: number;
}

export const calculateOrderFinancials = (customerCount: number = 1, manualDeliveryFees: number[] = [], config?: PricingConfig): OrderFinancials => {
  // Total delivery fee is the sum of all manual delivery fees for each customer
  const totalDeliveryFee = manualDeliveryFees.reduce((sum, fee) => sum + (fee || 0), 0);
  
  const driverCommPct = (config?.driverCommissionPct ?? 15) / 100;
  
  // Calculate Vendor Commission
  let vendorCommission = 0;
  if (config?.vendorCommissionType === 'fixed') {
    vendorCommission = (config.vendorCommissionFixed ?? 0) * customerCount;
  } else {
    const vendorCommPct = (config?.vendorCommissionPct ?? 20) / 100;
    vendorCommission = Math.round(totalDeliveryFee * vendorCommPct * 100) / 100;
  }
  
  // 1 EGP insurance fee per customer (total)
  const insuranceFundTotal = customerCount * 1.0; 
  
  // System Commission from Driver side (e.g. 15% of delivery fee)
  const systemCommission = Math.round(totalDeliveryFee * driverCommPct * 100) / 100;

  // Driver Earnings: Total delivery fee minus system commission minus insurance
  const driverEarnings = Math.round((totalDeliveryFee - systemCommission - insuranceFundTotal) * 100) / 100;

  return {
    totalFee: Math.round(totalDeliveryFee * 100) / 100,
    insuranceFundTotal: Math.round(insuranceFundTotal * 100) / 100,
    systemCommission,
    vendorCommission,
    driverEarnings,
    vendorFee: insuranceFundTotal
  };
};
