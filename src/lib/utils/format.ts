
/**
 * Universal Formatting Utilities for Start Location App
 * V1.3.2 - Efficiency Audit
 */

export const formatCurrency = (value: number | string | undefined | null) => {
  try {
    const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
    if (isNaN(num)) return "0";
    // Arabic Egypt locale for consistent RTL currency
    return num.toLocaleString('ar-EG');
  } catch (e) {
    return String(value || 0);
  }
};

export const translateStatus = (status: string) => {
  const statuses: Record<string, string> = { 
    pending: "جاري البحث", 
    assigned: "تم التعيين", 
    in_transit: "في الطريق", 
    delivered: "تم التوصيل", 
    cancelled: "ملغي" 
  };
  return statuses[status] || status;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-100 text-amber-600 border-amber-200';
    case 'assigned': return 'bg-sky-100 text-sky-600 border-sky-200';
    case 'in_transit': return 'bg-orange-100 text-orange-600 border-orange-200';
    case 'delivered': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
    case 'cancelled': return 'bg-rose-100 text-rose-600 border-rose-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

export const formatRelativeTime = (timestamp: string | number | Date) => {
  if (!timestamp) return "غير متوفر";
  const now = Date.now();
  const ts = new Date(timestamp).getTime();
  const diff = now - ts;
  
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  if (mins < 1440) return `منذ ${Math.floor(mins/60)} ساعة`;
  return `منذ ${Math.floor(mins/1440)} يوم`;
};

export const formatTimeOnly = (isoString: string | Date) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
};

export const getErrorMessage = (error: unknown): string => {
  if (!error) return "حدث خطأ غير معروف";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "حدث خطأ");
  }
  if (typeof error === "string") return error;
  return "حدث خطأ تقني";
};
