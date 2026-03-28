"use client";

import { AnimatePresence, motion } from "framer-motion";

interface VendorAccountModalsProps {
  showPasswordModal: boolean;
  showSettlementModal: boolean;
  newPassword: string;
  confirmPassword: string;
  passwordError: string;
  changingPassword: boolean;
  settlementAmount: string;
  onClosePasswordModal: () => void;
  onCloseSettlementModal: () => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSettlementAmountChange: (value: string) => void;
  onChangePassword: () => void;
  onRequestSettlement: () => void;
}

export default function VendorAccountModals({
  showPasswordModal,
  showSettlementModal,
  newPassword,
  confirmPassword,
  passwordError,
  changingPassword,
  settlementAmount,
  onClosePasswordModal,
  onCloseSettlementModal,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSettlementAmountChange,
  onChangePassword,
  onRequestSettlement,
}: VendorAccountModalsProps) {
  return (
    <AnimatePresence>
      {(showPasswordModal || showSettlementModal) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-gray-100 relative">
            {showPasswordModal && (
              <>
                <button onClick={onClosePasswordModal} className="absolute top-6 left-6 text-gray-400 hover:text-gray-900 text-2xl">×</button>
                <h2 className="text-xl font-black mb-6 text-gray-900 text-right">تغيير كلمة السر</h2>
                <div className="space-y-4">
                  <input type="password" value={newPassword} onChange={(e) => onNewPasswordChange(e.target.value)} placeholder="كلمة السر الجديدة" className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-right" />
                  <input type="password" value={confirmPassword} onChange={(e) => onConfirmPasswordChange(e.target.value)} placeholder="تأكيد كلمة السر" className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-right" />
                  {passwordError && <p className="text-red-500 text-xs font-bold text-right">{passwordError}</p>}
                  <button onClick={onChangePassword} disabled={changingPassword} className="w-full bg-brand-orange text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200">{changingPassword ? "جاري التغيير..." : "حفظ التغييرات"}</button>
                </div>
              </>
            )}
            {showSettlementModal && (
              <>
                <button onClick={onCloseSettlementModal} className="absolute top-6 left-6 text-gray-400 hover:text-gray-900 text-2xl">×</button>
                <h2 className="text-xl font-black mb-6 text-gray-900 text-right">طلب تسوية مديونية</h2>
                <div className="space-y-4">
                  <div className="text-right">
                    <label className="text-xs font-bold text-gray-400 block mb-2">المبلغ المراد سداده</label>
                    <input type="number" value={settlementAmount} onChange={(e) => onSettlementAmountChange(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-right" placeholder="0.00" />
                  </div>
                  <button onClick={onRequestSettlement} className="w-full bg-brand-orange text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200">إرسال الطلب</button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
