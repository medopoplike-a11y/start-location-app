export const translateVendorOrderStatus = (status: string) => {
  const statuses: Record<string, string> = {
    pending: "جاري البحث عن طيار",
    assigned: "تم تعيين طيار",
    in_transit: "في الطريق",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  };
  return statuses[status] || status;
};

export const formatVendorTime = (isoString: string) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
};
