"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Truck, Wallet, LogOut, Settings, History, Bot } from "lucide-react";
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

export default function DriverDrawer({
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
  };

  return (
    <AnimatePresence>
      {showDrawer && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div 
            initial={{ x: "100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "100%" }} 
            className="fixed top-0 right-0 bottom-0 w-72 drawer-glass z-[101] flex flex-col"
          >
            <div className="p-6 border-b border-white/10 dark:border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-600">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-slate-100 text-sm tracking-tight">{driverName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              <button 
                onClick={() => handleNavClick("orders")} 
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  activeView === "orders" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Truck className="w-5 h-5" />
                <span className="text-sm font-black">الطلبات والمهام</span>
              </button>
              <button 
                onClick={() => handleNavClick("wallet")} 
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  activeView === "wallet" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-black">المحفظة والأرباح</span>
              </button>
              <button 
                onClick={() => handleNavClick("history")} 
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  activeView === "history" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                }`}
              >
                <History className="w-5 h-5" />
                <span className="text-sm font-black">سجل التوصيلات</span>
              </button>
              <button 
                onClick={() => handleNavClick("settings")} 
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  activeView === "settings" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-black">إعدادات الحساب</span>
              </button>

              <div className="h-px bg-white/10 dark:bg-slate-800/50 my-2" />

              {/* V1.7.0: Driver AI Assistant in Sidebar */}
              <button 
                onClick={() => {
                  triggerHaptic();
                  onOpenAI?.();
                  onClose();
                }} 
                className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 border border-purple-500/20 shadow-sm shadow-purple-500/5"
              >
                <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-black">مساعد الملاحة (AI)</span>
                  <span className="text-[9px] font-bold opacity-60">تحليل العناوين والمسارات</span>
                </div>
              </button>
            </div>
            <div className="p-4 border-t border-white/10 dark:border-slate-800/50">
              <button 
                onClick={() => {
                  triggerHaptic(ImpactStyle.Medium);
                  onSignOut();
                }} 
                className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-black">تسجيل الخروج</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default DriverDrawer;
