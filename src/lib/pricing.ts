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
  systemCommission: number;
  driverEarnings: number;
  vendorFee: number;
}

export const calculateOrderFinancials = (distance: number, surgeFee: number = 0): OrderFinancials => {
  const deliveryFee = calculateDeliveryFee(distance, surgeFee);
  
  // Insurance Fund Contributions
  const driverInsurance = SAFE_RIDE_FEE;
  const vendorInsurance = VENDOR_INSURANCE_FEE;
  const insuranceFundTotal = driverInsurance + vendorInsurance;
  
  // System Commission (Driver side): 15% of delivery fee
  const systemCommission = deliveryFee * 0.15;
  
  // Driver Earnings: The delivery fee minus the system commission and their insurance contribution
  const driverEarnings = deliveryFee - systemCommission - driverInsurance;

  // Vendor Fee: Fixed 1 EGP per order (all goes to insurance)
  const vendorFee = vendorInsurance;

  return {
    totalFee: deliveryFee,
    insuranceFundTotal,
    systemCommission,
    driverEarnings,
    vendorFee
  };
};
