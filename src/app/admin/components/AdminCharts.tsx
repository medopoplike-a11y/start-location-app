"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Clock } from 'lucide-react';

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface AdminChartsProps {
  orders: any[];
}

export default function AdminCharts({ orders }: AdminChartsProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Simple aggregation: Orders by status
  const statusCounts = orders.reduce((acc: any, order) => {
    const status = order.status || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const chartData: ChartData[] = [
    { label: 'بانتظار التعيين', value: statusCounts['pending'] || 0, color: '#f59e0b' }, // Amber
    { label: 'تم التعيين', value: statusCounts['assigned'] || 0, color: '#0ea5e9' }, // Sky
    { label: 'في الطريق', value: statusCounts['in_transit'] || 0, color: '#6366f1' }, // Indigo
    { label: 'تم التوصيل', value: statusCounts['delivered'] || 0, color: '#10b981' }, // Emerald
  ];

  const maxVal = Math.max(...chartData.map(d => d.value), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* Status Bar Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[40px] p-8 border border-slate-100 dark:border-slate-800/50 shadow-2xl shadow-slate-200/20 dark:shadow-none"
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-[16px] font-black text-slate-900 dark:text-white tracking-tight">حالة الطلبات</h3>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">توزيع الطلبات حسب الحالة</p>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between h-56 gap-6 px-4">
          {chartData.map((data, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-4 h-full justify-end group">
              <div className="relative w-full flex justify-center items-end h-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(data.value / maxVal) * 100}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 15, delay: i * 0.1 }}
                  onHoverStart={() => setHoveredBar(i)}
                  onHoverEnd={() => setHoveredBar(null)}
                  className="w-full max-w-[48px] rounded-t-2xl cursor-pointer relative shadow-2xl group-hover:brightness-110 transition-all ring-4 ring-transparent group-hover:ring-white/10"
                  style={{ backgroundColor: data.color }}
                >
                  {hoveredBar === i && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap z-20 shadow-2xl border border-white/10 dark:border-slate-200"
                    >
                      {data.value} طلب
                    </motion.div>
                  )}
                </motion.div>
              </div>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 text-center leading-tight h-10 flex items-center tracking-tight">
                {data.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatsCard 
          icon={<ShoppingBag size={18} />} 
          label="إجمالي الطلبات" 
          value={orders.length} 
          color="blue" 
          delay={0.1}
        />
        <StatsCard 
          icon={<DollarSign size={18} />} 
          label="إجمالي المبيعات" 
          value={`${orders.reduce((acc, o) => acc + (o.financials?.order_value || 0), 0)} ج.م`} 
          color="emerald" 
          delay={0.2}
        />
        <StatsCard 
          icon={<TrendingUp size={18} />} 
          label="معدل التوصيل" 
          value={`${Math.round(((statusCounts['delivered'] || 0) / (orders.length || 1)) * 100)}%`} 
          color="purple" 
          delay={0.3}
        />
        <StatsCard 
          icon={<Clock size={18} />} 
          label="تحت التنفيذ" 
          value={(statusCounts['pending'] || 0) + (statusCounts['assigned'] || 0) + (statusCounts['in_transit'] || 0)} 
          color="amber" 
          delay={0.4}
        />
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color, delay }: { icon: any, label: string, value: any, color: string, delay: number }) {
  const colors: any = {
    blue: "bg-blue-500/10 text-blue-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    purple: "bg-purple-500/10 text-purple-500",
    amber: "bg-amber-500/10 text-amber-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="drawer-glass rounded-[28px] p-5 border-none shadow-sm flex flex-col justify-between"
    >
      <div className={`w-9 h-9 ${colors[color]} rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-lg font-black text-slate-900 dark:text-white">{value}</p>
      </div>
    </motion.div>
  );
}
