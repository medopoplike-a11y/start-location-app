
import { 
  Zap, 
  FileText, 
  LayoutDashboard, 
  Users, 
  Wallet, 
  BarChart3, 
  Settings 
} from "lucide-react";

export const menuGroups = [
  {
    title: "التشغيل والعمليات",
    items: [
      { id: "operations", label: "مركز العمليات الموحد", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
      { id: "order-history", label: "سجل الطلبات والفواتير", icon: FileText },
      { id: "dashboard", label: "الإحصائيات المباشرة", icon: LayoutDashboard },
    ]
  },
  {
    title: "الإدارة والبيانات",
    items: [
      { id: "users", label: "المستخدمين", icon: Users },
      { id: "wallets", label: "مراقبة المحافظ", icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-50" },
      { id: "settlements", label: "التسويات المالية", icon: FileText },
      { id: "reports", label: "التقارير المالية", icon: BarChart3 },
    ]
  },
  {
    title: "الإعدادات",
    items: [
      { id: "settings", label: "إعدادات النظام", icon: Settings },
    ]
  }
];
