
import { 
  Zap, 
  FileText, 
  LayoutDashboard, 
  Users, 
  Wallet, 
  BarChart3, 
  Settings,
  ShieldCheck,
  Truck,
  Store,
  Map as MapIcon,
  Bot
} from "lucide-react";

export const menuGroups = [
  {
    title: "غرفة العمليات الموحدة",
    items: [
      { id: "operations", label: "مركز القيادة والتحكم", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
      { id: "orders", label: "إدارة جميع الطلبات", icon: FileText },
      { id: "ai-monitor", label: "المراقب الذكي (AI)", icon: Bot, color: "text-purple-500", bg: "bg-purple-50" },
    ]
  },
  {
    title: "إدارة الأطراف والمالية",
    items: [
      { id: "fleet", label: "الأسطول والشركاء", icon: Truck },
      { id: "financials", label: "التسويات والتقارير", icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-50" },
    ]
  },
  {
    title: "إعدادات النظام",
    items: [
      { id: "settings", label: "الإعدادات العامة", icon: Settings },
    ]
  }
];
