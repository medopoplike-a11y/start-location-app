"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart,
  Truck,
  Banknote,
  Users
} from "lucide-react";
import type { AdminOrder } from "../types";

interface ReportsViewProps {
  allOrders: AdminOrder[];
}

export default function ReportsView({ allOrders = [] }: ReportsViewProps) {
  const [period, setFilterPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const stats = useMemo(() => {
    const now = new Date();
    const delivered = Array.isArray(allOrders) ? allOrders.filter(o => o.status === 'delivered') : [];
    
    // Filter by period
    const filteredByPeriod = delivered.filter(o => {
      const orderDate = new Date(o.status_updated_at || o.created_at);
      if (period === 'daily') return orderDate.toDateString() === now.toDateString();
      if (period === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return orderDate >= weekAgo;
      }
      if (period === 'monthly') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    const totalRevenue = filteredByPeriod.reduce((acc, o) => acc + (o.financials?.delivery_fee || 0), 0);
    
    const systemProfits = filteredByPeriod.reduce((acc, o) => {
      const f = o.financials || {};
      const deliveryFee = f.delivery_fee || 0;
      const driverComm = f.system_commission ?? (deliveryFee * 0.15);
      const vendorComm = f.vendor_commission ?? (deliveryFee * 0.15);
      const insurance = f.insurance_fee ?? 2.0;
      return acc + driverComm + vendorComm + insurance;
    }, 0);

    const totalInsurance = filteredByPeriod.reduce((acc, o) => acc + (o.financials?.insurance_fee ?? 2.0), 0);
    const orderCount = filteredByPeriod.length;

    return {
      totalRevenue,
      systemProfits,
      totalInsurance,
      orderCount
    };
  }, [allOrders, period]);

  const formatCurrency = (val: number) => val.toLocaleString('ar-EG') + " ج.م";

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">التقارير التحليلية</h2>
            <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Performance & Earnings</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
          {[
            { id: "daily", label: "يومي" },
            { id: "weekly", label: "أسبوعي" },
            { id: "monthly", label: "شهري" }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterPeriod(p.id as any)}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                period === p.id 
                  ? "bg-white text-slate-900 shadow-md border border-slate-100" 
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <ReportCard 
          title="إجمالي المبيعات" 
          value={formatCurrency(stats.totalRevenue)} 
          subtitle="رسوم التوصيل المحصلة"
          icon={<Truck className="w-5 h-5 text-blue-500" />}
          color="blue"
        />
        <ReportCard 
          title="أرباح النظام" 
          value={formatCurrency(stats.systemProfits)} 
          subtitle="العمولات الصافية"
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          color="emerald"
        />
        <ReportCard 
          title="صندوق التأمين" 
          value={formatCurrency(stats.totalInsurance)} 
          subtitle="تأمين الرحلات المحصل"
          icon={<Banknote className="w-5 h-5 text-amber-500" />}
          color="amber"
        />
        <ReportCard 
          title="عدد الرحلات" 
          value={stats.orderCount} 
          subtitle="رحلات ناجحة"
          icon={<Users className="w-5 h-5 text-purple-500" />}
          color="purple"
        />
      </div>

      {/* Charts / Visual Section (Placeholder for now) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[40px] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              مؤشر النمو {period === 'daily' ? 'اليومي' : period === 'weekly' ? 'الأسبوعي' : 'الشهري'}
            </h3>
            <button className="p-2 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 hover:text-slate-900 transition-all">
              <Download className="w-4 h-4" />
            </button>
          </div>
          
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-300">
            <PieChart className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-bold">الرسم البياني قيد التطوير</p>
            <p className="text-[10px] mt-1">سيتم ربط البيانات بـ Chart.js قريباً</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[40px] p-8 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 mb-6">توزيع الأرباح</h3>
          <div className="space-y-6">
            <ProfitSource label="عمولة المناديب" percentage={45} amount={stats.systemProfits * 0.45} color="bg-blue-500" />
            <ProfitSource label="عمولة المحلات" percentage={35} amount={stats.systemProfits * 0.35} color="bg-indigo-500" />
            <ProfitSource label="رسوم إدارية" percentage={20} amount={stats.systemProfits * 0.20} color="bg-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, value, subtitle, icon, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-900 mb-1 tracking-tight">{value}</p>
      <p className="text-[10px] font-bold text-slate-400">{subtitle}</p>
    </motion.div>
  );
}

function ProfitSource({ label, percentage, amount, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[11px] font-black">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-900">{amount.toLocaleString('ar-EG')} ج.م</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}