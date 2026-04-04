"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PremiumCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  className?: string;
  delay?: number;
}

export const PremiumCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendType = 'neutral', 
  subtitle, 
  className = "",
  delay = 0 
}: PremiumCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl shadow-blue-900/5 group transition-shadow hover:shadow-blue-500/10 ${className}`}
    >
      {/* Decorative Glow */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-500" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-500" />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1 h-1 bg-sky-500 rounded-full animate-pulse" />
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-sky-600 transition-colors">{value}</h3>
            {subtitle && <span className="text-[10px] font-black text-slate-400 uppercase">{subtitle}</span>}
          </div>
          
          {trend && (
            <div className={`flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full w-fit border ${
              trendType === 'positive' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
              trendType === 'negative' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
              'bg-slate-50 text-slate-500 border-slate-100'
            }`}>
              <div className={`w-1 h-1 rounded-full ${
                trendType === 'positive' ? 'bg-emerald-500' : 
                trendType === 'negative' ? 'bg-rose-500' : 
                'bg-slate-400'
              }`} />
              <span className="text-[9px] font-black uppercase tracking-tighter">{trend}</span>
            </div>
          )}
        </div>
        
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-110 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-sky-500/10 transition-all duration-300">
          <div className="text-slate-600 group-hover:text-sky-500 transition-colors">
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
