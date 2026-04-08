"use client";

import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, MapPin, X, Loader2, AlertTriangle, Plus, Trash2, User } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";
import type { Order } from "../types";

interface CustomerData {
  id: string; // Add stable ID
  name: string;
  phone: string;
  address: string;
  orderValue: string;
  deliveryFee: string;
  invoiceUrl?: string;
  isUploading?: boolean;
}

interface FormState {
  customer: string; // Keep for backward compatibility/single customer
  phone: string;
  address: string;
  orderValue: string;
  deliveryFee: string;
  notes: string;
  prepTime: string;
  customerCoords: { lat: number; lng: number } | null;
  customers: CustomerData[];
}

interface OrderFormModalProps {
  show: boolean;
  editingOrder: Order | null;
  formData: FormState;
  invoiceUrl: string | null; // Keep for general/legacy
  uploadingInvoice: boolean;
  isSaving?: boolean;
  hasVendorLocation?: boolean;
  onClose: () => void;
  onFormDataChange: (next: FormState) => void;
  onPickCustomerLocation: () => void;
  onCameraCapture?: (customerIndex?: number) => void;
  onSave: () => void;
  onlineDriversCount?: number;
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
  onlineDriversCount = 0,
}: OrderFormModalProps) {
  useBackButton(onClose, show);

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style }).catch(() => {});
      }
    } catch (e) {}
  };

  const addCustomer = () => {
    if (formData.customers.length >= 5) return;
    const newCustomers = [...formData.customers, { 
      id: Math.random().toString(36).substring(2, 9),
      name: "", phone: "", address: "", orderValue: "", deliveryFee: "30", invoiceUrl: "", isUploading: false 
    }];
    onFormDataChange({ ...formData, customers: newCustomers });
  };

  const removeCustomer = (index: number) => {
    const newCustomers = formData.customers.filter((_, i) => i !== index);
    onFormDataChange({ ...formData, customers: newCustomers });
  };

  const updateCustomer = (index: number, field: keyof CustomerData, value: any) => {
    const newCustomers = [...formData.customers];
    newCustomers[index] = { ...newCustomers[index], [field]: value };
    onFormDataChange({ ...formData, customers: newCustomers });
  };

  // Stability Fix: Ensure at least one customer exists if the array is empty
  // and we are showing the form.
  const activeCustomers = formData.customers.length > 0 ? formData.customers : [{ 
    name: formData.customer || "", 
    phone: formData.phone || "", 
    address: formData.address || "", 
    orderValue: formData.orderValue || "", 
    deliveryFee: formData.deliveryFee || "30",
    invoiceUrl: invoiceUrl || "",
    isUploading: uploadingInvoice
  }];

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-end">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md mx-auto rounded-t-[40px] border-t border-gray-100 p-6 space-y-6 max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900">{editingOrder ? "تعديل السكة" : "إنشاء سكة جديدة (متعددة العملاء)"}</h2>
              <button onClick={onClose} className="bg-gray-100 p-2 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-6">
              {!hasVendorLocation && !editingOrder && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-700">لم يتم تحديد موقع المحل بعد. يُرجى تحديث الموقع من إعدادات المحل قبل إنشاء الطلبات.</p>
                </div>
              )}

              {/* Customers List */}
              <div className="space-y-8">
                {activeCustomers.map((cust, idx) => (
                  <div key={cust.id || `cust-${idx}`} className="relative p-5 rounded-[32px] bg-gray-50 border border-gray-100 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-[11px] font-black">
                        <User size={14} />
                        العميل {idx + 1}
                      </div>
                      {activeCustomers.length > 1 && (
                        <button onClick={() => removeCustomer(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded-xl transition-colors">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <input 
                        type="text" 
                        value={cust.name} 
                        onChange={(e) => updateCustomer(idx, 'name', e.target.value)} 
                        className="w-full bg-white p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-sm shadow-sm" 
                        placeholder="اسم العميل" 
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="tel" 
                          value={cust.phone} 
                          onChange={(e) => updateCustomer(idx, 'phone', e.target.value)} 
                          className="w-full bg-white p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-sm shadow-sm" 
                          placeholder="رقم الهاتف" 
                        />
                        <input 
                          type="text" 
                          value={cust.address} 
                          onChange={(e) => updateCustomer(idx, 'address', e.target.value)} 
                          className="w-full bg-white p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-sm shadow-sm" 
                          placeholder="العنوان بالتفصيل" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">قيمة الأوردر</label>
                          <input 
                            type="number" 
                            value={cust.orderValue} 
                            onChange={(e) => updateCustomer(idx, 'orderValue', e.target.value)} 
                            className="w-full bg-white p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-sm shadow-sm" 
                            placeholder="0.00" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">سعر التوصيل</label>
                          <input 
                            type="number" 
                            value={cust.deliveryFee} 
                            onChange={(e) => updateCustomer(idx, 'deliveryFee', e.target.value)} 
                            className="w-full bg-white p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-sm shadow-sm" 
                            placeholder="30" 
                          />
                        </div>
                      </div>

                      {/* Per-Customer Invoice Button */}
                      <div className="pt-2">
                        <button
                          onClick={() => onCameraCapture?.(idx)}
                          disabled={isSaving || cust.isUploading}
                          className={`w-full p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${
                            cust.invoiceUrl 
                              ? "bg-green-50 border-green-200 text-green-600" 
                              : "bg-white border-orange-100 text-orange-500 hover:border-orange-200"
                          }`}
                        >
                          <Camera size={20} className={!cust.invoiceUrl && !cust.isUploading ? "animate-bounce" : ""} />
                          <span className="text-[10px] font-black">
                            {cust.isUploading ? "جاري الرفع..." : cust.invoiceUrl ? "تم رفع فاتورة العميل ✓" : "تصوير فاتورة هذا العميل"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {activeCustomers.length < 5 && (
                  <button 
                    onClick={addCustomer}
                    className="w-full py-5 rounded-[28px] border-2 border-dashed border-gray-200 text-gray-400 font-black text-sm flex items-center justify-center gap-3 hover:border-orange-200 hover:text-orange-500 hover:bg-orange-50/30 transition-all active:scale-95"
                  >
                    <Plus size={20} />
                    إضافة عميل آخر للسكة (حتى 5 عملاء)
                  </button>
                )}
              </div>

              {/* General Order Info */}
              <div className="bg-orange-50/50 p-5 rounded-[32px] border border-orange-100 space-y-5 shadow-sm shadow-orange-50/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-orange-600 mb-1.5 block uppercase mr-2">وقت التحضير (دقيقة)</label>
                    <input type="number" disabled={isSaving} value={formData.prepTime} onChange={(e) => onFormDataChange({ ...formData, prepTime: e.target.value })} className="w-full bg-white p-4 rounded-2xl border border-orange-100 text-gray-900 outline-none focus:ring-2 ring-orange-300 font-bold text-sm shadow-sm" placeholder="15" min="1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-orange-600 mb-1.5 block uppercase mr-2">ملاحظات عامة</label>
                    <input type="text" disabled={isSaving} value={formData.notes} onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })} className="w-full bg-white p-4 rounded-2xl border border-orange-100 text-gray-900 outline-none focus:ring-2 ring-orange-300 font-bold text-sm shadow-sm" placeholder="أي ملاحظات للسكة..." />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => { triggerHaptic(); onPickCustomerLocation(); }}
                    disabled={isSaving} 
                    className={`flex-1 p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-60 ${formData.customerCoords ? "bg-green-500 text-white shadow-green-100" : "bg-white text-gray-600 border border-gray-100"}`}
                  >
                    <MapPin size={18} />{formData.customerCoords ? "✓ الموقع محدد" : "تحديد موقع السكة"}
                  </button>
                  {/* General Invoice (Legacy/Fallback) */}
                  {!activeCustomers.some(c => c.invoiceUrl) && (
                    <div onClick={() => onCameraCapture?.()} className="flex-1">
                      <label className={`w-full h-full p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-black cursor-pointer border-2 border-dashed transition-all active:scale-95 shadow-sm ${isSaving ? "opacity-60 cursor-not-allowed" : ""} ${invoiceUrl ? "bg-green-50 text-green-600 border-green-200" : "bg-white text-orange-500 border-orange-200"}`}>
                        <Camera className={`w-4 h-4 ${!invoiceUrl && !uploadingInvoice ? "animate-bounce" : ""}`} />
                        <span className="text-[9px]">{uploadingInvoice ? "جاري الرفع..." : invoiceUrl ? "الفاتورة العامة ✓" : "فاتورة عامة"}</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-slate-900 p-6 rounded-[32px] text-white space-y-3 shadow-xl shadow-slate-200">
                <div className="flex justify-between items-center text-xs font-bold opacity-60">
                  <span>عدد العملاء في السكة:</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-lg">{activeCustomers.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold opacity-60">
                  <span>إجمالي رسوم التأمين (1ج لكل عميل):</span>
                  <span>{activeCustomers.length * 1} ج.م</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-orange-400">إجمالي التوصيل المحصل:</span>
                  <span className="text-2xl font-black">{activeCustomers.reduce((acc, c) => acc + (Number(c.deliveryFee) || 0), 0)} <span className="text-xs font-bold opacity-50">ج.م</span></span>
                </div>
              </div>

              <button 
                onClick={onSave} 
                disabled={activeCustomers.some(c => !c.name || !c.orderValue) || uploadingInvoice || isSaving || activeCustomers.length === 0} 
                className="w-full bg-orange-500 text-white py-5 rounded-[32px] font-black text-lg shadow-xl shadow-orange-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isSaving ? <><Loader2 className="w-6 h-6 animate-spin" /> جاري الإرسال...</> : (editingOrder ? "حفظ تعديلات السكة" : "إرسال السكة للطيارين")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
