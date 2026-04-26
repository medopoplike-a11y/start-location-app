"use client";

import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { AnimatePresence, motion } from "framer-motion";
import { History, LogOut, MapPin, Settings, Store, Wallet, X, Bot } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";

interface StoreDrawerProps {
  showDrawer: boolean;
  vendorName: string;
  activeView: "store" | "wallet" | "settings" | "settlements";
  onClose: () => void;
  onChangeView: (view: "store" | "wallet" | "settings" | "settlements") => void;
  onUpdateLocation: () => void;
  onSignOut: () => void;
  onOpenAI?: () => void;
}

export default function StoreDrawer({
  showDrawer,
  vendorName,
  activeView,
  onClose,
  onChangeView,
  onUpdateLocation,
  onSignOut,
  onOpenAI,
}: StoreDrawerProps) {
  useBackButton(onClose, showDrawer);
  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style });
      }
    } catch (e) {}
  };

  const handleNavClick = async (view: "store" | "wallet" | "settings" | "settlements") => {
    triggerHaptic();
    onChangeView(view);
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
            className="fixed top-0 right-0 bottom-0 w-72 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl z-[101] flex flex-col border-l border-white/20 dark:border-slate-800/50 shadow-2xl"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-slate-100 text-sm tracking-tight leading-none mb-1">{vendorName}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">المتجر المعتمد</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </motion.button>
            </div>
            
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              <NavButton 
                active={activeView === "store"} 
                onClick={() => handleNavClick("store")}
                icon={<Store className="w-4 h-4" />}
                label="الرئيسية والطلبات"
              />
              <NavButton 
                active={activeView === "wallet"} 
                onClick={() => handleNavClick("wallet")}
                icon={<Wallet className="w-4 h-4" />}
                label="المحفظة المالية"
              />
              <NavButton 
                active={activeView === "settlements"} 
                onClick={() => handleNavClick("settlements")}
                icon={<History className="w-4 h-4" />}
                label="سجل التسويات"
              />
              <NavButton 
                active={activeView === "settings"} 
                onClick={() => handleNavClick("settings")}
                icon={<Settings className="w-4 h-4" />}
                label="إعدادات الحساب"
              />
              
              <div className="h-px bg-slate-100 dark:bg-slate-800/30 my-4" />
              
              <button 
                onClick={() => { 
                  triggerHaptic();
                  onClose(); 
                  onUpdateLocation(); 
                }} 
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 rounded-xl transition-all text-slate-600 dark:text-slate-400 group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MapPin className="w-4 h-4 opacity-60" />
                </div>
                <span className="text-xs font-black">تحديث موقع المحل</span>
              </button>

              <div className="h-px bg-slate-100 dark:bg-slate-800/30 my-2" />

              <motion.button 
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  triggerHaptic();
                  onOpenAI?.();
                  onClose();
                }} 
                className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all bg-gradient-to-br from-slate-900 to-slate-800 dark:from-indigo-600 dark:to-violet-700 text-white border border-slate-700 dark:border-indigo-500 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white relative z-10">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-start relative z-10 text-right">
                  <span className="text-xs font-black tracking-tight">مستشار النمو الذكي</span>
                  <span className="text-[8px] font-bold opacity-70 uppercase tracking-widest">AI Insights</span>
                </div>
              </motion.button>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800/30">
              <button 
                onClick={() => {
                  triggerHaptic(ImpactStyle.Medium);
                  onSignOut();
                }} 
                className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-xs font-black">تسجيل الخروج</span>
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
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all relative group ${
        active 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
          : "hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400"
      }`}
    >
      <div className={`shrink-0 transition-transform ${active ? "" : "group-hover:scale-110"}`}>
        {icon}
      </div>
      <span className="text-xs font-black tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeNav"
          className="absolute left-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" 
        />
      )}
    </button>
  );
}
