"use client";

import { motion } from "framer-motion";
import { StartLogo } from "./StartLogo";

export const AppLoader = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-[#f3f4f6] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Live Silver Effect */}
      <div className="silver-live-bg opacity-30" />
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <div className="relative">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-blue-100 rounded-full blur-2xl"
          />
          <StartLogo className="w-24 h-24 relative z-10" />
        </div>
        
        <div className="mt-12 flex flex-col items-center gap-4">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Start</h2>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="w-1.5 h-1.5 bg-blue-600 rounded-full"
              />
            ))}
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Connecting to System</p>
        </div>
      </motion.div>
    </div>
  );
};
