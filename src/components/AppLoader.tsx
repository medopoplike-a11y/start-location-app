"use client";

import { StartLogo } from "./StartLogo";

export const AppLoader = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-[#f3f4f6] flex flex-col items-center justify-center overflow-hidden">
      {/* Optimized background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px]" />
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-100/50 rounded-full blur-xl animate-pulse" />
          <StartLogo className="w-20 h-20 relative z-10" />
        </div>
        
        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase mb-4">Start</h2>
        
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
        </div>
        
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-6">Connecting to System</p>
      </div>
    </div>
  );
};
