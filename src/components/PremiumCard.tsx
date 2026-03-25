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
      className={`relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl shadow-blue-900/5 group ${className}`}
    >
      {/* Decorative Glow */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500" />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
            {subtitle && <span className="text-xs font-bold text-gray-400">{subtitle}</span>}
          </div>
          
          {trend && (
            <div className={`flex items-center gap-1 text-[10px] font-bold ${
              trendType === 'positive' ? 'text-green-500' : 
              trendType === 'negative' ? 'text-red-500' : 'text-blue-500'
            }`}>
              <span>{trend}</span>
            </div>
          )}
        </div>
        
        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform duration-300 shadow-sm">
          {icon}
        </div>
      </div>
    </motion.div>
  );
};
