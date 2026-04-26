"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  interactive?: boolean;
}

export const GlassCard = ({ 
  children, 
  className = "", 
  delay = 0, 
  hover = false,
  interactive = false 
}: GlassCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { scale: 1.01, translateY: -2 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ 
        duration: 0.5, 
        delay,
        scale: { type: "spring", stiffness: 300, damping: 20 }
      }}
      className={`relative overflow-hidden bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[40px] shadow-xl shadow-blue-900/5 dark:shadow-none ${className}`}
    >
      {/* V19.3.0: subtle gradient glow on hover */}
      {hover && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
      {children}
    </motion.div>
  );
};
