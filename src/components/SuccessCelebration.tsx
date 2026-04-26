"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface SuccessCelebrationProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

export const SuccessCelebration = ({ show, message = "تمت العملية بنجاح!", onComplete }: SuccessCelebrationProps) => {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="bg-white dark:bg-slate-900 shadow-2xl rounded-[40px] px-8 py-6 flex flex-col items-center gap-4 border-2 border-emerald-500/20"
          >
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-black text-slate-800 dark:text-white text-center"
            >
              {message}
            </motion.h2>

            {/* V19.3.0: Floating Particles Effect */}
            <div className="absolute inset-0 overflow-hidden rounded-[40px] -z-10">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: "50%", 
                    y: "50%", 
                    scale: 0,
                    opacity: 1 
                  }}
                  animate={{ 
                    x: `${Math.random() * 200 - 100}%`, 
                    y: `${Math.random() * 200 - 100}%`,
                    scale: Math.random() * 1.5,
                    opacity: 0
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute w-3 h-3 bg-emerald-400 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};