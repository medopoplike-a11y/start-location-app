"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, MapPin, X } from "lucide-react";
import type { ChangeEvent } from "react";
import type { Order } from "../types";

interface FormState {
  customer: string;
  phone: string;
  address: string;
  orderValue: string;
  deliveryFee: string;
  notes: string;
  prepTime: string;
  customerCoords: { lat: number; lng: number } | null;
}

interface OrderFormModalProps {
  show: boolean;
  editingOrder: Order | null;
  formData: FormState;
  invoiceUrl: string | null;
  uploadingInvoice: boolean;
  onClose: () => void;
  onFormDataChange: (next: FormState) => void;
  onPickCustomerLocation: () => void;
  onInvoiceUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}

export default function OrderFormModal({
  show,
  editingOrder,
  formData,
  invoiceUrl,
  uploadingInvoice,
  onClose,
  onFormDataChange,
  onPickCustomerLocation,
  onInvoiceUpload,
  onSave,
}: OrderFormModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-end">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md mx-auto rounded-t-[40px] border-t border-gray-100 p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-900">{editingOrder ? "تعديل الطلب" : "طلب طيار جديد"}</h2><button onClick={onClose} className="bg-gray-100 p-2 rounded-full text-gray-400"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <input type="text" value={formData.customer} onChange={(e) => onFormDataChange({ ...formData, customer: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold" placeholder="اسم العميل" />
              <input type="tel" value={formData.phone} onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold" placeholder="رقم الهاتف" />
              <input type="text" value={formData.address} onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold" placeholder="العنوان بالتفصيل" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={formData.orderValue} onChange={(e) => onFormDataChange({ ...formData, orderValue: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold" placeholder="قيمة الأوردر" />
                <input type="number" value={formData.deliveryFee} onChange={(e) => onFormDataChange({ ...formData, deliveryFee: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold" placeholder="سعر التوصيل" />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={onPickCustomerLocation} className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${formData.customerCoords ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`}><MapPin size={20} />{formData.customerCoords ? "تم تحديد الموقع" : "تحديد موقع العميل"}</button>
                <label className={`flex-1 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold cursor-pointer border-2 border-dashed ${invoiceUrl ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}><input type="file" className="hidden" accept="image/*" onChange={onInvoiceUpload} /><Camera className="w-6 h-6" /><span className="text-xs">{invoiceUrl ? "تم الرفع" : "رفع الفاتورة"}</span></label>
              </div>
              <button onClick={onSave} disabled={!formData.customer || !formData.orderValue || uploadingInvoice} className="w-full bg-brand-orange text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-orange-200 active:scale-95 transition-all disabled:opacity-50">{editingOrder ? "حفظ التعديلات" : "إرسال الطلب الآن"}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
