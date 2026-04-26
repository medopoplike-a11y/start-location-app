"use client";

import { useState, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Truck, Wallet, LogOut, Settings, History, Bot, Sparkles } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface DriverDrawerProps {
  showDrawer: boolean;
  onClose: () => void;
  onSelectOrders: () => void;
  onSelectWallet: () => void;
  onSelectHistory: () => void;
  onSelectSettings: () => void;
  onSignOut: () => void;
  onOpenAI?: () => void;
  driverName?: string;
  activeView?: string;
}

function DriverDrawer({
  showDrawer,
  onClose,
  onSelectOrders,
  onSelectWallet,
  onSelectHistory,
  onSelectSettings,
  onSignOut,
  onOpenAI,
  driverName = "قائمة السائق",
  activeView = "orders",
}: DriverDrawerProps) {
  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style });
      }
    } catch (e) {}
  };

  const handleNavClick = (view: string) => {
    triggerHaptic();
    if (view === "orders") onSelectOrders();
    if (view === "wallet") onSelectWallet();
    if (view === "history") onSelectHistory();
    if (view === "settings") onSelectSettings();
    onClose();
  };

  return (
    <AnimatePresence>
      {showDrawer && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[100]" 
          />
          <motion.div 
            initial={{ x: "100%", opacity: 0.5 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: "100%", opacity: 0.5 }} 
            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl z-[101] flex flex-col border-l border-white/20 dark:border-slate-800/50 shadow-[0_0_50px_rgba(0,0,0,0.3)]"
          >
            <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
                  <Truck className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-slate-100 text-base tracking-tight leading-none mb-1">{driverName}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">الكابتن المعتمد</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-full transition-colors border border-slate-100 dark:border-slate-700"
              >
                <X className="w-5 h-5 text-slate-400" />
              </motion.button>
            </div>
            
            <div className="flex-1 p-6 space-y-3 overflow-y-auto">
              <NavButton 
                active={activeView === "orders"} 
                onClick={() => handleNavClick("orders")}
                icon={<Truck className="w-5 h-5" />}
                label="الطلبات والمهام"
              />
              <NavButton 
                active={activeView === "wallet"} 
                onClick={() => handleNavClick("wallet")}
                icon={<Wallet className="w-5 h-5" />}
                label="المحفظة والأرباح"
              />
              <NavButton 
                active={activeView === "history"} 
                onClick={() => handleNavClick("history")}
                icon={<History className="w-5 h-5" />}
                label="سجل التوصيلات"
              />
              <NavButton 
                active={activeView === "settings"} 
                onClick={() => handleNavClick("settings")}
                icon={<Settings className="w-5 h-5" />}
                label="إعدادات الحساب"
              />

              <div className="h-px bg-slate-100 dark:bg-slate-800/50 my-6" />

              <motion.button 
                whileHover={{ y: -2 }}
                onClick={() => {
                  triggerHaptic();
                  onOpenAI?.();
                  onClose();
                }} 
                className="w-full flex items-center gap-4 p-5 rounded-[28px] transition-all bg-gradient-to-br from-indigo-600 to-violet-700 text-white border border-indigo-500/50 shadow-xl shadow-indigo-200/50 dark:shadow-none relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white relative z-10 border border-white/10 shadow-lg">
                  <Bot className="w-7 h-7" />
                </div>
                <div className="flex flex-col items-start relative z-10 text-right" dir="rtl">
                  <span className="text-sm font-black tracking-tight">مساعد الملاحة الذكي (AI)</span>
                  <span className="text-[10px] font-bold opacity-80 mt-0.5">تحليل العناوين والمسارات فوراً</span>
                </div>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:translate-x-1 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
              </motion.button>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
              <button 
                onClick={() => {
                  triggerHaptic(ImpactStyle.Medium);
                  onSignOut();
                }} 
                className="w-full flex items-center gap-4 p-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-red-100 dark:border-red-500/20">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="text-sm font-black">تسجيل الخروج</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-4 p-4 rounded-[22px] transition-all relative group ${
        active 
          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-200 dark:shadow-none border border-slate-800 dark:border-white" 
          : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-transparent"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
        active ? "bg-white/10 dark:bg-slate-900/10" : "bg-slate-100 dark:bg-slate-800 group-hover:scale-110"
      }`}>
        {icon}
      </div>
      <span className="text-sm font-black tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeNavDriver"
          className="absolute left-5 w-2 h-2 rounded-full bg-white dark:bg-slate-900 shadow-[0_0_8px_rgba(255,255,255,0.8)] dark:shadow-none" 
        />
      )}
    </button>
  );
}

export default memo(DriverDrawer);
