"use client";

import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, MapPin, X, Loader2, AlertTriangle, Plus, Trash2, User, ChevronDown, ChevronUp, CheckCircle2, ArrowRight, Eye } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";
import { useState, useEffect } from "react";
import type { Order } from "../types";

interface CustomerData {
  id: string;
  name: string;
  phone: string;
  address: string;
  orderValue: string;
  deliveryFee: string;
  prepTime: string;
  invoiceUrl?: string;
  localPreview?: string;
  isUploading?: boolean;
}

interface FormState {
  customer: string;
  phone: string;
  address: string;
  orderValue: string;
  deliveryFee: string;
  notes: string;
  prepTime: string;
  customerCoords: { lat: number; lng: number } | null;
  customers: CustomerData[];
}

interface OrderFormViewProps {
  editingOrder: Order | null;
  formData: FormState;
  invoiceUrl: string | null;
  uploadingInvoice: boolean;
  isSaving?: boolean;
  hasVendorLocation?: boolean;
  onBack: () => void;
  onFormDataChange: (next: FormState) => void;
  onPickCustomerLocation: () => void;
  onCameraCapture?: (customerIndex?: number) => void;
  onSave: () => void;
  onPreviewImage?: (url: string) => void;
}

export default function OrderFormView({ 
  hasVendorLocation = true,
  editingOrder,
  formData,
  invoiceUrl,
  uploadingInvoice,
  isSaving = false,
  onBack,
  onFormDataChange,
  onPickCustomerLocation,
  onCameraCapture,
  onSave,
  onPreviewImage,
}: OrderFormViewProps) {
  useBackButton(onBack, true);
  
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    if (formData.customers.length > 0 && expandedIndex === null) {
      const timer = setTimeout(() => {
        setExpandedIndex(formData.customers.length - 1);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [formData.customers.length, expandedIndex]);

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
    setExpandedIndex(newCustomers.length - 1);
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

  const radicalNormalize = (val: string, numericOnly = false) => {
    if (!val) return "";
    // V1.3.1: Radical Normalization (The "Safe" Way)
    // 1. Convert all Arabic/Persian digits to English digits for INTERNAL logic
    let result = String(val).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
                    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());
    
    if (numericOnly) {
      // 2. Keep only digits and one period
      result = result.replace(/[^0-9.]/g, '');
      const parts = result.split('.');
      if (parts.length > 2) result = parts[0] + '.' + parts.slice(1).join('');
    }
    return result;
  };

  const updateCustomer = (index: number, field: keyof CustomerData, value: any) => {
    const newCustomers = [...formData.customers];
    // V1.3.1: Universal Acceptance - Display exactly what the user types (Arabic or English)
    // but the system will normalize it "behind the scenes" when saving.
    let displayValue = value;
    
    if (field === 'orderValue' || field === 'deliveryFee' || field === 'prepTime') {
      displayValue = String(value).replace(/[^0-9.٠-٩۰-۹]/g, '');
      const parts = displayValue.split('.');
      if (parts.length > 2) displayValue = parts[0] + '.' + parts.slice(1).join('');
    } else if (field === 'phone') {
      displayValue = String(value).replace(/[^0-9٠-٩۰-۹]/g, '');
    }
    
    newCustomers[index] = { ...newCustomers[index], [field]: displayValue };
    onFormDataChange({ ...formData, customers: newCustomers });
  };

  const activeCustomers = formData.customers;
  const totalOrderValue = activeCustomers.reduce((acc, c) => acc + (Number(radicalNormalize(String(c.orderValue), true)) || 0), 0);
  const totalDeliveryFee = activeCustomers.reduce((acc, c) => acc + (Number(radicalNormalize(String(c.deliveryFee), true)) || 0), 0);
  const totalInsurance = activeCustomers.length * 1;


  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-slate-950" dir="rtl">
      {/* Fixed Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack} 
            className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 active:scale-95 transition-all shadow-sm"
          >
            <ArrowRight size={22} />
          </motion.button>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{editingOrder ? "تعديل السكة" : "سكة جديدة"}</h2>
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Multi-Stop Delivery Form</p>
          </div>
        </div>
        {!editingOrder && (
          <div className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg shadow-orange-200 dark:shadow-none border border-orange-400/20">
            {activeCustomers.length} / 5 عملاء
          </div>
        )}
      </div>

      <div className="flex-1 p-5 space-y-6 pb-40">
        {!hasVendorLocation && !editingOrder && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4 bg-amber-50/80 dark:bg-amber-950/20 backdrop-blur-sm border border-amber-200 dark:border-amber-900/30 rounded-3xl p-5 shadow-sm"
          >
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-400 leading-relaxed">لم يتم تحديد موقع المحل بعد. يُرجى تحديث الموقع من إعدادات المحل قبل إنشاء الطلبات لضمان دقة التتبع وسرعة وصول الكباتن.</p>
          </motion.div>
        )}

        {/* Customers List */}
        <div className="space-y-5">
          {activeCustomers.map((cust, idx) => {
            const isExpanded = expandedIndex === idx;
            const isFilled = cust.name.trim().length > 0 && cust.orderValue.trim().length > 0 && cust.address.trim().length > 0;

            return (
              <motion.div 
                key={cust.id} 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative rounded-[40px] border transition-all duration-500 overflow-hidden ${
                  isExpanded 
                    ? "bg-white dark:bg-slate-900 border-orange-200/50 dark:border-orange-900/50 shadow-2xl shadow-slate-200/50 dark:shadow-none p-7" 
                    : "bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-slate-900"
                }`}
              >
                {/* Card Header */}
                <div 
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="flex justify-between items-center cursor-pointer"
                >
                  <div className="flex items-center gap-5">
                    <motion.div 
                      whileHover={{ rotate: 5 }}
                      className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-all duration-500 ${
                        isExpanded ? "bg-orange-500 text-white shadow-xl shadow-orange-200 dark:shadow-none" : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700"
                      }`}
                    >
                      {isFilled && !isExpanded ? <CheckCircle2 size={22} className="text-emerald-500" /> : <User size={22} />}
                    </motion.div>
                    <div>
                      <p className={`text-sm font-black tracking-tight ${isExpanded ? "text-slate-900 dark:text-white text-base" : "text-slate-700 dark:text-slate-200"}`}>
                        {cust.name || `بيانات العميل ${idx + 1}`}
                      </p>
                      {!isExpanded && (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                            {cust.orderValue ? `${cust.orderValue} ج.م` : "اضغط لإكمال البيانات"}
                          </p>
                          {cust.address && (
                            <>
                              <span className="w-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
                              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[150px]">{cust.address}</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {activeCustomers.length > 1 && isExpanded && (
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); removeCustomer(idx); }} 
                        className="w-10 h-10 flex items-center justify-center text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    )}
                    <div className={`transition-transform duration-500 ${isExpanded ? "rotate-180 text-orange-500" : "text-slate-300 dark:text-slate-700"}`}>
                      <ChevronDown size={24} />
                    </div>
                  </div>
                </div>
                
                {/* Card Body */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "circOut" }}
                      className="space-y-6 mt-8"
                    >
                      <div className="space-y-5">
                        <div className="group">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 mr-2 mb-2 block uppercase tracking-widest">اسم العميل بالكامل</label>
                          <input 
                            type="text" 
                            dir="rtl"
                            value={cust.name} 
                            onChange={(e) => updateCustomer(idx, 'name', e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-slate-950 p-4.5 rounded-[22px] border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 ring-orange-500/50 focus:bg-white dark:focus:bg-slate-900 font-bold text-sm transition-all text-right shadow-inner" 
                            placeholder="مثال: محمد أحمد" 
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="group">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 mr-2 mb-2 block uppercase tracking-widest">رقم الهاتف</label>
                            <input 
                              type="tel" 
                              dir="ltr"
                              value={cust.phone} 
                              onChange={(e) => updateCustomer(idx, 'phone', e.target.value)} 
                              className="w-full bg-slate-50 dark:bg-slate-950 p-4.5 rounded-[22px] border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 ring-orange-500/50 focus:bg-white dark:focus:bg-slate-900 font-bold text-sm transition-all text-left shadow-inner" 
                              placeholder="01xxxxxxxxx" 
                            />
                          </div>
                          <div className="group">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 mr-2 mb-2 block uppercase tracking-widest">العنوان التفصيلي</label>
                            <input 
                              type="text" 
                              dir="rtl"
                              value={cust.address} 
                              onChange={(e) => updateCustomer(idx, 'address', e.target.value)} 
                              className="w-full bg-slate-50 dark:bg-slate-950 p-4.5 rounded-[22px] border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 ring-orange-500/50 focus:bg-white dark:focus:bg-slate-900 font-bold text-sm transition-all text-right shadow-inner" 
                              placeholder="الشارع، الدور، الشقة" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 mr-1 uppercase tracking-widest">قيمة الأوردر</label>
                            <input 
                              type="text" 
                              inputMode="decimal"
                              dir="rtl"
                              value={cust.orderValue} 
                              onChange={(e) => updateCustomer(idx, 'orderValue', e.target.value)} 
                              className="w-full bg-white dark:bg-slate-950 p-4.5 rounded-[22px] border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 ring-orange-500/50 font-black text-sm shadow-sm text-right" 
                              placeholder="٠.٠٠" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 mr-1 uppercase tracking-widest">سعر التوصيل</label>
                            <input 
                              type="text" 
                              inputMode="decimal"
                              dir="rtl"
                              value={cust.deliveryFee} 
                              onChange={(e) => updateCustomer(idx, 'deliveryFee', e.target.value)} 
                              className="w-full bg-white dark:bg-slate-950 p-4.5 rounded-[22px] border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 ring-orange-500/50 font-black text-sm shadow-sm text-right" 
                              placeholder="٣٠" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-orange-600 dark:text-orange-400 mr-1 uppercase tracking-widest">وقت التحضير</label>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              dir="rtl"
                              value={cust.prepTime} 
                              onChange={(e) => updateCustomer(idx, 'prepTime', e.target.value)} 
                              className="w-full bg-orange-50/50 dark:bg-orange-950/20 p-4.5 rounded-[22px] border border-orange-100 dark:border-orange-900/30 text-orange-700 dark:text-orange-400 outline-none focus:ring-2 ring-orange-300/50 font-black text-sm shadow-sm text-right" 
                              placeholder="15" 
                            />
                          </div>
                        </div>

                        <div className="pt-3">
                          {(cust.invoiceUrl || cust.localPreview) && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="mb-4 relative rounded-[28px] overflow-hidden border border-slate-100 dark:border-slate-800 aspect-[3/4] max-h-56 bg-slate-50 dark:bg-slate-950 shadow-xl shadow-slate-200/50 dark:shadow-none group/preview mx-auto w-40 flex items-center justify-center p-2"
                            >
                              <img 
                                src={cust.localPreview || cust.invoiceUrl} 
                                className="w-full h-full object-contain cursor-pointer relative z-10 rounded-2xl" 
                                alt="" 
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (!target.src.includes('retry=1')) {
                                    target.src = `${target.src}${target.src.includes('?') ? '&' : '?'}retry=1`;
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPreviewImage?.(cust.localPreview || cust.invoiceUrl!);
                                }}
                              />
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 z-0">
                                <Camera size={32} className="opacity-10" />
                              </div>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-20">
                                <Eye size={24} className="text-white" />
                              </div>
                              <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full shadow-lg z-30">
                                <CheckCircle2 size={14} />
                              </div>
                            </motion.div>
                          )}
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onCameraCapture?.(idx)}
                            disabled={isSaving || cust.isUploading}
                            className={`w-full py-4.5 rounded-[22px] border border-dashed transition-all flex items-center justify-center gap-3 shadow-sm ${
                              cust.invoiceUrl 
                                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-orange-300 hover:bg-white hover:text-orange-500 dark:hover:bg-slate-900"
                            }`}
                          >
                            <div className={`p-2 rounded-xl ${cust.invoiceUrl ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-white dark:bg-slate-900"}`}>
                              <Camera size={18} className={!cust.invoiceUrl && !cust.isUploading ? "animate-pulse" : ""} />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest">
                              {cust.isUploading ? "جاري الرفع..." : cust.invoiceUrl ? "تحديث الفاتورة" : "تصوير الفاتورة"}
                            </span>
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {activeCustomers.length < 5 && (
            <motion.button 
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={addCustomer}
              className="w-full py-6 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black text-sm flex items-center justify-center gap-4 hover:border-orange-400/50 dark:hover:border-orange-900/50 hover:text-orange-500 hover:bg-white dark:hover:bg-slate-900/50 transition-all duration-300 shadow-sm bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm"
            >
              <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm">
                <Plus size={22} />
              </div>
              إضافة عميل آخر للسكة (حتى 5 عملاء)
            </motion.button>
          )}
        </div>

        {/* General Settings Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-gray-100 dark:border-slate-800 space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center text-indigo-500 dark:text-indigo-400">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-900 dark:text-white">إعدادات السكة العامة</p>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Notes & Location</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 mr-2 mb-1 block uppercase">ملاحظات عامة للطيار</label>
              <input 
                type="text" 
                dir="rtl"
                disabled={isSaving} 
                value={formData.notes} 
                onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })} 
                className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-indigo-300 font-bold text-sm text-right" 
                placeholder="مثال: يرجى الاتصال عند الوصول" 
              />
            </div>

            <button 
              onClick={() => { triggerHaptic(); onPickCustomerLocation(); }}
              disabled={isSaving} 
              className={`w-full p-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-60 shadow-md ${
                formData.customerCoords 
                  ? "bg-emerald-500 text-white shadow-emerald-100 dark:shadow-none" 
                  : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-800"
              }`}
            >
              <MapPin size={20} />
              {formData.customerCoords ? "تم تحديد الموقع بنجاح ✓" : "تحديد موقع السكة الجغرافي"}
            </button>
          </div>
        </div>

        {/* Financial Summary Dashboard */}
        <div className="bg-gray-900 dark:bg-slate-900 p-8 rounded-[48px] text-white space-y-6 shadow-2xl shadow-slate-300 dark:shadow-none relative overflow-hidden border border-gray-800 dark:border-slate-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-3xl" />
          
          <div className="flex justify-between items-center text-xs font-bold opacity-50 relative z-10">
            <span className="text-slate-400">ملخص السكة المالي</span>
            <span className="bg-white/10 dark:bg-slate-800/50 px-3 py-1 rounded-full text-slate-300">{activeCustomers.length} عملاء</span>
          </div>

          <div className="grid grid-cols-2 gap-6 relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">قيمة الأوردرات</p>
              <p className="text-2xl font-black text-white">
                {totalOrderValue}
                <span className="text-xs font-bold opacity-40 mr-1">ج.م</span>
              </p>
            </div>
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-black text-orange-400 dark:text-orange-500 uppercase tracking-widest">إجمالي التوصيل</p>
              <p className="text-2xl font-black text-orange-500 dark:text-orange-400">
                {totalDeliveryFee}
                <span className="text-xs font-bold opacity-40 mr-1">ج.م</span>
              </p>
            </div>
          </div>

          <div className="h-px bg-white/10 dark:bg-slate-800 relative z-10" />

          <div className="flex justify-between items-center relative z-10">
            <p className="text-[10px] font-bold text-slate-500">إجمالي رسوم التأمين المستحقة:</p>
            <p className="text-sm font-black text-white">{totalInsurance} ج.م</p>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#f3f4f6] dark:from-slate-950 via-[#f3f4f6] dark:via-slate-950 to-transparent z-30">
        <button 
          onClick={onSave} 
          disabled={activeCustomers.some(c => c.name.trim().length === 0 || c.orderValue.trim().length === 0) || uploadingInvoice || isSaving || activeCustomers.length === 0} 
          className="w-full max-w-md mx-auto bg-orange-500 text-white py-5 rounded-[32px] font-black text-lg shadow-2xl shadow-orange-200 dark:shadow-orange-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 border-4 border-white dark:border-slate-800"
        >
          {isSaving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> جاري الحفظ والإرسال...</>
          ) : (
            "تأكيد وحفظ السكة"
          )}
        </button>
      </div>
    </div>
  );
}