"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Truck, Wallet, LogOut } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface DriverDrawerProps {
  showDrawer: boolean;
  onClose: () => void;
  onSelectOrders: () => void;
  onSelectWallet: () => void;
  onSignOut: () => void;
}

export default function DriverDrawer({
  showDrawer,
  onClose,
  onSelectOrders,
  onSelectWallet,
  onSignOut,
}: DriverDrawerProps) {
  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style });
      }
    } catch (e) {}
  };

  return (
    <AnimatePresence>
      {showDrawer && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed top-0 right-0 bottom-0 w-72 bg-white z-[101] shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange"><Truck className="w-6 h-6" /></div><div><p className="font-bold text-gray-900 text-sm">قائمة السائق</p></div></div><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="flex-1 p-4 space-y-2">
              <button onClick={() => { triggerHaptic(); onSelectOrders(); }} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl transition-colors"><Truck className="w-5 h-5 text-slate-400" /><span className="text-sm font-bold text-slate-700">الطلبات والمهام</span></button>
              <button onClick={() => { triggerHaptic(); onSelectWallet(); }} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl transition-colors"><Wallet className="w-5 h-5 text-slate-400" /><span className="text-sm font-bold text-slate-700">المحفظة والأرباح</span></button>
            </div>
            <div className="p-4 border-t border-slate-100"><button onClick={() => {
              triggerHaptic(ImpactStyle.Medium);
              onSignOut();
            }} className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors"><LogOut className="w-5 h-5" /><span className="text-sm font-bold">تسجيل الخروج</span></button></div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
