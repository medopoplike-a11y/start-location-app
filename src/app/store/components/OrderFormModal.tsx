"use client";

import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, MapPin, X, Loader2, AlertTriangle, Plus, Trash2, User, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";
import { useState, useEffect } from "react";
import type { Order } from "../types";

interface CustomerData {
  id: string; // Add stable ID
  name: string;
  phone: string;
  address: string;
  orderValue: string;
  deliveryFee: string;
  prepTime: string; // Moved here
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
  
  // Track which customer card is expanded
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  // Auto-expand last customer when added
  useEffect(() => {
    if (formData.customers.length > 0) {
      setExpandedIndex(formData.customers.length - 1);
    }
  }, [formData.customers.length === 0]); // Only when it goes from 0 to something

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.impact({ style }).catch(() => {});
      }
    } catch (e) {}
  };

  const addCustomer = () => {
    if (formData.customers.length >= 5) return;
    const newId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newCustomers = [...formData.customers, { 
      id: newId,
      name: "", phone: "", address: "", orderValue: "", deliveryFee: "30", prepTime: "15", invoiceUrl: "", isUploading: false 
    }];
    onFormDataChange({ ...formData, customers: newCustomers });
    setExpandedIndex(newCustomers.length - 1); // Expand the new one
  };

  const removeCustomer = (index: number) => {
    const newCustomers = formData.customers.filter((_, i) => i !== index);
    onFormDataChange({ ...formData, customers: newCustomers });
    if (expandedIndex === index) {
      setExpandedIndex(newCustomers.length > 0 ? newCustomers.length - 1 : 0);
    } else if (expandedIndex && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const updateCustomer = (index: number, field: keyof CustomerData, value: any) => {
    const newCustomers = [...formData.customers];
    newCustomers[index] = { ...newCustomers[index], [field]: value };
    onFormDataChange({ ...formData, customers: newCustomers });
  };

  // Stability Fix: Use a memoized-like approach for display
  const activeCustomers = formData.customers.length > 0 ? formData.customers : [];

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-end">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md mx-auto rounded-t-[40px] border-t border-gray-100 p-6 space-y-6 max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10 py-2 -mx-2 px-2 rounded-xl">
              <h2 className="text-xl font-black text-gray-900">{editingOrder ? "تعديل السكة" : "إنشاء سكة جديدة"}</h2>
              <button onClick={onClose} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:bg-gray-200 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-6">
              {!hasVendorLocation && !editingOrder && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-700">لم يتم تحديد موقع المحل بعد. يُرجى تحديث الموقع من إعدادات المحل قبل إنشاء الطلبات.</p>
                </div>
              )}

              {/* Customers List */}
              <div className="space-y-4">
                {activeCustomers.map((cust, idx) => {
                  const isExpanded = expandedIndex === idx;
                  const isFilled = cust.name && cust.orderValue && cust.address;

                  return (
                    <motion.div 
                      key={cust.id} 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`relative rounded-[32px] border transition-all duration-300 overflow-hidden ${
                        isExpanded 
                          ? "bg-white border-orange-200 shadow-lg p-5" 
                          : "bg-gray-50 border-gray-100 p-4"
                      }`}
                    >
                      {/* Card Header (Clickable to Expand) */}
                      <div 
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        className="flex justify-between items-center cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                            isExpanded ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-600"
                          }`}>
                            {isFilled && !isExpanded ? <CheckCircle2 size={16} /> : <User size={16} />}
                          </div>
                          <div>
                            <p className={`text-xs font-black ${isExpanded ? "text-orange-600" : "text-gray-900"}`}>
                              {cust.name || `العميل ${idx + 1}`}
                            </p>
                            {!isExpanded && (
                              <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                {cust.orderValue ? `${cust.orderValue} ج.م` : "لم يتم إدخال البيانات"}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeCustomers.length > 1 && isExpanded && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeCustomer(idx); }} 
                              className="text-red-500 p-2 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <div className="text-gray-400">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </div>
                      
                      {/* Card Body (Visible only when expanded) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 mt-6"
                          >
                            <input 
                              type="text" 
                              value={cust.name} 
                              onChange={(e) => updateCustomer(idx, 'name', e.target.value)} 
                              className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-sm shadow-sm" 
                              placeholder="اسم العميل" 
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <input 
                                type="tel" 
                                value={cust.phone} 
                                onChange={(e) => updateCustomer(idx, 'phone', e.target.value)} 
                                className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-sm shadow-sm" 
                                placeholder="رقم الهاتف" 
                              />
                              <input 
                                type="text" 
                                value={cust.address} 
                                onChange={(e) => updateCustomer(idx, 'address', e.target.value)} 
                                className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-bold text-sm shadow-sm" 
                                placeholder="العنوان بالتفصيل" 
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 mr-1 uppercase tracking-tighter">الأوردر</label>
                                <input 
                                  type="number" 
                                  value={cust.orderValue} 
                                  onChange={(e) => updateCustomer(idx, 'orderValue', e.target.value)} 
                                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-black text-xs shadow-sm" 
                                  placeholder="0.00" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 mr-1 uppercase tracking-tighter">التوصيل</label>
                                <input 
                                  type="number" 
                                  value={cust.deliveryFee} 
                                  onChange={(e) => updateCustomer(idx, 'deliveryFee', e.target.value)} 
                                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-brand-orange font-black text-xs shadow-sm" 
                                  placeholder="30" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-orange-600 mr-1 uppercase tracking-tighter">تحضير (د)</label>
                                <input 
                                  type="number" 
                                  value={cust.prepTime} 
                                  onChange={(e) => updateCustomer(idx, 'prepTime', e.target.value)} 
                                  className="w-full bg-orange-50/50 p-3 rounded-xl border border-orange-100 text-orange-700 outline-none focus:ring-2 ring-orange-300 font-black text-xs shadow-sm" 
                                  placeholder="15" 
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
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {activeCustomers.length < 5 && (
                  <button 
                    onClick={addCustomer}
                    className="w-full py-4 rounded-[28px] border-2 border-dashed border-gray-200 text-gray-400 font-black text-xs flex items-center justify-center gap-3 hover:border-orange-200 hover:text-orange-500 hover:bg-orange-50/30 transition-all active:scale-95 mt-2"
                  >
                    <Plus size={18} />
                    إضافة عميل آخر للسكة (حتى 5 عملاء)
                  </button>
                )}
              </div>

              {/* Sikka Settings (Compact) */}
              <div className="bg-orange-50/50 p-5 rounded-[32px] border border-orange-100 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                  <p className="text-[10px] font-black text-orange-700 uppercase tracking-tighter">إعدادات السكة العامة</p>
                </div>
                
                <input 
                  type="text" 
                  disabled={isSaving} 
                  value={formData.notes} 
                  onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })} 
                  className="w-full bg-white p-4 rounded-2xl border border-orange-100 text-gray-900 outline-none focus:ring-2 ring-orange-300 font-bold text-sm shadow-sm" 
                  placeholder="أي ملاحظات عامة للسكة..." 
                />

                <button 
                  onClick={() => { triggerHaptic(); onPickCustomerLocation(); }}
                  disabled={isSaving} 
                  className={`w-full p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-60 ${formData.customerCoords ? "bg-green-500 text-white shadow-green-100" : "bg-white text-gray-600 border border-gray-100"}`}
                >
                  <MapPin size={18} />{formData.customerCoords ? "✓ موقع السكة محدد" : "تحديد موقع السكة الجغرافي"}
                </button>
              </div>

              {/* Financial Summary */}
              <div className="bg-slate-900 p-6 rounded-[32px] text-white space-y-3 shadow-xl shadow-slate-200">
                <div className="flex justify-between items-center text-[10px] font-bold opacity-60">
                  <span>عدد العملاء في السكة:</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-lg">{activeCustomers.length}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold opacity-60">
                  <span>إجمالي رسوم التأمين (1ج لكل عميل):</span>
                  <span>{activeCustomers.length * 1} ج.م</span>
                </div>
                
                <div className="h-px bg-white/10 my-2" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">إجمالي قيمة الأوردرات</p>
                    <p className="text-lg font-black text-white">{activeCustomers.reduce((acc, c) => acc + (Number(c.orderValue) || 0), 0)} <span className="text-[10px] font-bold opacity-40">ج.م</span></p>
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-black text-orange-400 uppercase tracking-tighter">إجمالي التوصيل</p>
                    <p className="text-lg font-black text-orange-500">{activeCustomers.reduce((acc, c) => acc + (Number(c.deliveryFee) || 0), 0)} <span className="text-[10px] font-bold opacity-40">ج.م</span></p>
                  </div>
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
