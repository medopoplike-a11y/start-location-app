"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface DriverDrawerProps {
  showDrawer: boolean;
  onClose: () => void;
  onSelectOrders: () => void;
  onSelectWallet: () => void;
  onSelectHistory: () => void;
  onSignOut: () => void;
}

export default function DriverDrawer({ showDrawer, onClose, onSelectOrders, onSelectWallet, onSelectHistory, onSignOut }: DriverDrawerProps) {
  return (
    <AnimatePresence>
      {showDrawer && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed top-0 right-0 bottom-0 w-72 bg-white z-[101] shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold">القائمة</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
            <div className="flex-1 p-4 space-y-2">
              <button onClick={onSelectOrders} className="w-full text-right p-4 rounded-xl hover:bg-gray-50 font-bold">الطلبات</button>
              <button onClick={onSelectWallet} className="w-full text-right p-4 rounded-xl hover:bg-gray-50 font-bold">المحفظة</button>
              <button onClick={onSelectHistory} className="w-full text-right p-4 rounded-xl hover:bg-gray-50 font-bold">السجل</button>
              <button onClick={onSignOut} className="w-full text-right p-4 rounded-xl hover:bg-red-50 text-red-500 font-bold">تسجيل الخروج</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
