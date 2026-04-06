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
  driverCommissionPct: number; // e.g., 15
  vendorCommissionPct: number; // e.g., 20
  driverInsuranceFee: number; // e.g., 1
  vendorInsuranceFee: number; // e.g., 1
}

export const calculateOrderFinancials = (distance: number, surgeFee: number = 0, manualFee?: number, config?: PricingConfig): OrderFinancials => {
  const deliveryFee = manualFee !== undefined ? manualFee : calculateDeliveryFee(distance, surgeFee);
  
  const driverCommPct = (config?.driverCommissionPct ?? 15) / 100;
  const vendorCommPct = (config?.vendorCommissionPct ?? 20) / 100;
  const driverInsurance = config?.driverInsuranceFee ?? SAFE_RIDE_FEE;
  const vendorInsurance = config?.vendorInsuranceFee ?? VENDOR_INSURANCE_FEE;
  
  const insuranceFundTotal = driverInsurance + vendorInsurance;
  
  // System Commission (Driver side)
  const systemCommission = Math.round(deliveryFee * driverCommPct * 100) / 100;

  // System Commission (Vendor side)
  const vendorCommission = Math.round(deliveryFee * vendorCommPct * 100) / 100;
  
  // Driver Earnings: The delivery fee minus the system commission and their insurance contribution
  const driverEarnings = Math.round((deliveryFee - systemCommission - driverInsurance) * 100) / 100;

  // Vendor Fee: Fixed contribution to insurance
  const vendorFee = vendorInsurance;

  return {
    totalFee: Math.round(deliveryFee * 100) / 100,
    insuranceFundTotal: Math.round(insuranceFundTotal * 100) / 100,
    systemCommission,
    vendorCommission,
    driverEarnings,
    vendorFee
  };
};
