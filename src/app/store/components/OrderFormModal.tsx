"use client";

import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, MapPin, X, Loader2, AlertTriangle } from "lucide-react";
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
  isSaving?: boolean;
  hasVendorLocation?: boolean;
  onClose: () => void;
  onFormDataChange: (next: FormState) => void;
  onPickCustomerLocation: () => void;
  onCameraCapture: () => void;
  onSave: () => void;
}

export default function OrderFormModal({ hasVendorLocation = true,
  show,
  editingOrder,
  formData,
  invoiceUrl,
  uploadingInvoice,
  isSaving = false,
  onClose,
  onFormDataChange,
  onPickCustomerLocation,
  onCameraCapture,
  onSave,
}: OrderFormModalProps) {
  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style }).catch(() => {});
      }
    } catch (e) {}
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-end">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md mx-auto rounded-t-[40px] border-t border-gray-100 p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-900">{editingOrder ? "تعديل الطلب" : "طلب طيار جديد"}</h2><button onClick={onClose} className="bg-gray-100 p-2 rounded-full text-gray-400"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              {!hasVendorLocation && !editingOrder && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-700">لم يتم تحديد موقع المحل بعد. يُرجى تحديث الموقع من إعدادات المحل قبل إنشاء الطلبات.</p>
                </div>
              )}
              <input 
                type="text" 
                dir="rtl"
                disabled={isSaving} 
                value={formData.customer} 
                onChange={(e) => onFormDataChange({ ...formData, customer: e.target.value })} 
                className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-orange-500 font-bold disabled:opacity-60 text-right" 
                placeholder="اسم العميل" 
              />
              <input 
                type="tel" 
                dir="ltr"
                disabled={isSaving} 
                value={formData.phone} 
                onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })} 
                className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-orange-500 font-bold disabled:opacity-60 text-left" 
                placeholder="رقم الهاتف" 
              />
              <input 
                type="text" 
                dir="rtl"
                disabled={isSaving} 
                value={formData.address} 
                onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })} 
                className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-orange-500 font-bold disabled:opacity-60 text-right" 
                placeholder="العنوان بالتفصيل" 
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  inputMode="decimal"
                  disabled={isSaving} 
                  value={formData.orderValue} 
                  onChange={(e) => onFormDataChange({ ...formData, orderValue: e.target.value.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()).replace(/[۰-۹]/g, d => "۰۱۲۳٤۵۶۷٨۹".indexOf(d).toString()) })} 
                  className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-orange-500 font-bold disabled:opacity-60" 
                  placeholder="قيمة الأوردر" 
                />
                <input 
                  type="text" 
                  inputMode="decimal"
                  disabled={isSaving} 
                  value={formData.deliveryFee} 
                  onChange={(e) => onFormDataChange({ ...formData, deliveryFee: e.target.value.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()).replace(/[۰-۹]/g, d => "۰۱۲۳٤۵۶٧٨۹".indexOf(d).toString()) })} 
                  className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-orange-500 font-bold disabled:opacity-60" 
                  placeholder="سعر التوصيل" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">وقت التحضير (دقيقة)</label>
                  <input type="number" disabled={isSaving} value={formData.prepTime} onChange={(e) => onFormDataChange({ ...formData, prepTime: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-orange-300 font-bold disabled:opacity-60" placeholder="15" min="1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">ملاحظات</label>
                  <input type="text" disabled={isSaving} value={formData.notes} onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-orange-300 font-bold disabled:opacity-60" placeholder="ملاحظات إضافية..." />
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    triggerHaptic();
                    onPickCustomerLocation();
                  }}
                  disabled={isSaving} 
                  className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${formData.customerCoords ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  <MapPin size={20} />{formData.customerCoords ? "✓ موقع العميل محدد" : "تحديد موقع العميل"}
                </button>
                <button 
                  onClick={() => {
                    triggerHaptic();
                    onCameraCapture();
                  }}
                  disabled={isSaving || uploadingInvoice}
                  className={`flex-1 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold border-2 border-dashed transition-all active:scale-95 ${
                    isSaving || uploadingInvoice ? "opacity-60 cursor-not-allowed" : ""
                  } ${
                    invoiceUrl ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200"
                  }`}
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">
                    {uploadingInvoice ? "جاري الرفع..." : invoiceUrl ? "تحديث الفاتورة" : "تصوير الفاتورة"}
                  </span>
                </button>
              </div>
              <button onClick={onSave} disabled={!formData.customer || !formData.orderValue || uploadingInvoice || isSaving} className="w-full bg-orange-500 text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-orange-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> {editingOrder ? "جاري الحفظ..." : "جاري الإرسال..."}</> : (editingOrder ? "حفظ التعديلات" : "إرسال الطلب الآن")}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
