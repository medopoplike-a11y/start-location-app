export type Locale = 'ar' | 'en';

export const translations = {
  ar: {
    common: {
      search: "بحث...",
      loading: "جاري التحميل...",
      error: "خطأ",
      success: "نجاح",
      save: "حفظ",
      cancel: "إلغاء",
      delete: "حذف",
      edit: "تعديل",
    },
    admin: {
      dashboard: "لوحة التحكم",
      orders: "الطلبات",
      fleet: "المناديب",
      finance: "المالية",
      settings: "الإعدادات",
      systemHealth: "سلامة النظام",
      onlineDrivers: "المناديب المتصلين",
      activeOrders: "الطلبات النشطة",
    }
  },
  en: {
    common: {
      search: "Search...",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
    },
    admin: {
      dashboard: "Dashboard",
      orders: "Orders",
      fleet: "Fleet",
      finance: "Finance",
      settings: "Settings",
      systemHealth: "System Health",
      onlineDrivers: "Online Drivers",
      activeOrders: "Active Orders",
    }
  }
};
