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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div 
            initial={{ x: "100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "100%" }} 
            className="fixed top-0 right-0 bottom-0 w-72 drawer-glass z-[101] flex flex-col"
          >
            <div className="p-6 border-b border-white/10 dark:border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-slate-100 text-sm tracking-tight">{vendorName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              <button 
                onClick={() => handleNavClick("store")} 
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  activeView === "store" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Store className="w-5 h-5" />
                <span className="text-sm font-black">الرئيسية والطلبات</span>
              </button>
              <button 
                onClick={() => handleNavClick("wallet")} 
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  activeView === "wallet" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-bold">المحفظة المالية</span>
              </button>
              <button 
                onClick={() => handleNavClick("settlements")} 
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  activeView === "settlements" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                }`}
              >
                <History className="w-5 h-5" />
                <span className="text-sm font-bold">سجل التسويات</span>
              </button>
              <button 
                onClick={() => handleNavClick("settings")} 
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  activeView === "settings" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-bold">إعدادات الحساب</span>
              </button>
              <div className="h-px bg-white/10 dark:bg-slate-800/50 my-4" />
              <button 
                onClick={() => { 
                  triggerHaptic();
                  onClose(); 
                  onUpdateLocation(); 
                }} 
                className="w-full flex items-center gap-3 p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors text-slate-600 dark:text-slate-400"
              >
                <MapPin className="w-5 h-5 opacity-50" />
                <span className="text-sm font-black">تحديث موقع المحل</span>
              </button>

              <div className="h-px bg-white/10 dark:bg-slate-800/50 my-2" />

              {/* V1.7.0: Store AI Assistant in Sidebar */}
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
                  <span className="text-sm font-black">مستشار النمو (AI)</span>
                  <span className="text-[9px] font-bold opacity-60">تحليل المبيعات والأداء</span>
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

export default StoreDrawer;
