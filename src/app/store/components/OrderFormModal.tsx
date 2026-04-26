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
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white dark:bg-slate-900 w-full max-w-md mx-auto rounded-t-[40px] border-t border-gray-100 dark:border-slate-800 p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingOrder ? "تعديل الطلب" : "طلب طيار جديد"}</h2><button onClick={onClose} className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full text-gray-400 dark:text-slate-500"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              {!hasVendorLocation && !editingOrder && (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-3 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">لم يتم تحديد موقع المحل بعد. يُرجى تحديث الموقع من إعدادات المحل قبل إنشاء الطلبات.</p>
                </div>
              )}
              <input 
                type="text" 
                dir="rtl"
                disabled={isSaving} 
                value={formData.customer} 
                onChange={(e) => onFormDataChange({ ...formData, customer: e.target.value })} 
                className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-500 font-bold disabled:opacity-60 text-right" 
                placeholder="اسم العميل" 
              />
              <input 
                type="tel" 
                dir="ltr"
                disabled={isSaving} 
                value={formData.phone} 
                onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })} 
                className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-500 font-bold disabled:opacity-60 text-left" 
                placeholder="رقم الهاتف" 
              />
              <input 
                type="text" 
                dir="rtl"
                disabled={isSaving} 
                value={formData.address} 
                onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })} 
                className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-500 font-bold disabled:opacity-60 text-right" 
                placeholder="العنوان بالتفصيل" 
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  inputMode="decimal"
                  dir="rtl"
                  disabled={isSaving} 
                  value={formData.orderValue} 
                  onChange={(e) => {
                    // V1.3.1: Radical Normalization - Allow typing Arabic numbers, only clean up symbols
                    const val = e.target.value.replace(/[^0-9.٠-٩۰-۹]/g, '');
                    const parts = val.split('.');
                    const processed = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val;
                    onFormDataChange({ ...formData, orderValue: processed });
                  }} 
                  className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-500 font-bold disabled:opacity-60 text-right" 
                  placeholder="قيمة الأوردر" 
                />
                <input 
                  type="text" 
                  inputMode="decimal"
                  dir="rtl"
                  disabled={isSaving} 
                  value={formData.deliveryFee} 
                  onChange={(e) => {
                    // V1.3.1: Radical Normalization - Allow typing Arabic numbers, only clean up symbols
                    const val = e.target.value.replace(/[^0-9.٠-٩۰-۹]/g, '');
                    const parts = val.split('.');
                    const processed = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val;
                    onFormDataChange({ ...formData, deliveryFee: processed });
                  }} 
                  className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-500 font-bold disabled:opacity-60 text-right" 
                  placeholder="سعر التوصيل" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">وقت التحضير (دقيقة)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    disabled={isSaving} 
                    value={formData.prepTime} 
                    onChange={(e) => {
                      // V1.3.1: Radical Normalization - Allow typing Arabic numbers, only clean up symbols
                      const val = e.target.value.replace(/[^0-9٠-٩۰-۹]/g, '');
                      onFormDataChange({ ...formData, prepTime: val });
                    }} 
                    className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-300 dark:ring-orange-900 font-bold disabled:opacity-60 text-right" 
                    placeholder="١٥" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">ملاحظات</label>
                  <input 
                    type="text" 
                    dir="rtl"
                    disabled={isSaving} 
                    value={formData.notes} 
                    onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })} 
                    className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-300 dark:ring-orange-900 font-bold disabled:opacity-60 text-right" 
                    placeholder="ملاحظات إضافية..." 
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    triggerHaptic();
                    onPickCustomerLocation();
                  }}
                  disabled={isSaving} 
                  className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${formData.customerCoords ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400"}`}
                >
                  <MapPin size={20} />{formData.customerCoords ? "✓ موقع العميل محدد" : "تحديد موقع العميل"}
                </button>
                <div className="flex-1 flex flex-col gap-2">
                  {invoiceUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-slate-800 aspect-square h-12 w-12 mx-auto bg-gray-50 dark:bg-slate-950 shadow-sm flex items-center justify-center">
                      <img 
                        src={invoiceUrl} 
                        className="w-full h-full object-cover cursor-pointer relative z-10" 
                        alt="" 
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes('retry=1')) {
                            target.src = `${target.src}${target.src.includes('?') ? '&' : '?'}retry=1`;
                          }
                        }}
                        onClick={() => window.open(invoiceUrl, '_blank')}
                      />
                      <Camera size={12} className="absolute inset-0 m-auto text-gray-300 dark:text-slate-700 opacity-20 z-0" />
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      triggerHaptic();
                      onCameraCapture();
                    }}
                    disabled={isSaving || uploadingInvoice}
                    className={`w-full p-4 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold border-2 border-dashed transition-all active:scale-95 ${
                      isSaving || uploadingInvoice ? "opacity-60 cursor-not-allowed" : ""
                    } ${
                      invoiceUrl ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30" : "bg-gray-50 dark:bg-slate-950 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-800"
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px]">
                      {uploadingInvoice ? "جاري..." : invoiceUrl ? "تحديث" : "تصوير"}
                    </span>
                  </button>
                </div>
              </div>
              <button 
                onClick={onSave} 
                disabled={formData.customer.trim().length === 0 || formData.orderValue.trim().length === 0 || uploadingInvoice || isSaving} 
                className="w-full bg-orange-500 text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-orange-200 dark:shadow-none active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> {editingOrder ? "جاري الحفظ..." : "جاري الإرسال..."}</> : (editingOrder ? "حفظ التعديلات" : "إرسال الطلب الآن")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
