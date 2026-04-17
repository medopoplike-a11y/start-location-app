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

  const normalizeNumerals = (val: string) => {
    return val.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
              .replace(/[۰-۹]/g, d => "۰۱۲۳٤۵۶۷۸۹".indexOf(d).toString());
  };

  const updateCustomer = (index: number, field: keyof CustomerData, value: any) => {
    const newCustomers = [...formData.customers];
    let processedValue = value;
    if (field === 'orderValue' || field === 'deliveryFee' || field === 'prepTime' || field === 'phone') {
      processedValue = normalizeNumerals(String(value));
    }
    newCustomers[index] = { ...newCustomers[index], [field]: processedValue };
    onFormDataChange({ ...formData, customers: newCustomers });
  };

  const activeCustomers = formData.customers;
  const totalOrderValue = activeCustomers.reduce((acc, c) => acc + (Number(normalizeNumerals(String(c.orderValue))) || 0), 0);
  const totalDeliveryFee = activeCustomers.reduce((acc, c) => acc + (Number(normalizeNumerals(String(c.deliveryFee))) || 0), 0);
  const totalInsurance = activeCustomers.length * 1;


  return (
    <div className="flex flex-col min-h-screen bg-[#f3f4f6] dark:bg-slate-950" dir="rtl">
      {/* Fixed Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-gray-50 dark:bg-slate-800 rounded-xl text-gray-600 dark:text-slate-400 active:scale-95 transition-all">
            <ArrowRight size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">{editingOrder ? "تعديل السكة" : "سكة جديدة"}</h2>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Multi-Stop Delivery Form</p>
          </div>
        </div>
        {!editingOrder && (
          <div className="bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-[10px] font-black">
            {activeCustomers.length} / 5 عملاء
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-6 pb-32">
        {!hasVendorLocation && !editingOrder && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">لم يتم تحديد موقع المحل بعد. يُرجى تحديث الموقع من إعدادات المحل قبل إنشاء الطلبات لضمان دقة التتبع.</p>
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
                className={`relative rounded-[32px] border transition-all duration-300 overflow-hidden ${
                  isExpanded 
                    ? "bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-900 shadow-xl p-6" 
                    : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-4 shadow-sm"
                }`}
              >
                {/* Card Header */}
                <div 
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="flex justify-between items-center cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                      isExpanded ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400"
                    }`}>
                      {isFilled && !isExpanded ? <CheckCircle2 size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <p className={`text-sm font-black ${isExpanded ? "text-orange-600 dark:text-orange-400" : "text-gray-900 dark:text-white"}`}>
                        {cust.name || `بيانات العميل ${idx + 1}`}
                      </p>
                      {!isExpanded && (
                        <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 mt-0.5">
                          {cust.orderValue ? `${cust.orderValue} ج.م · ${cust.address || 'العنوان غير محدد'}` : "اضغط لإكمال البيانات"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeCustomers.length > 1 && isExpanded && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeCustomer(idx); }} 
                        className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    <div className="text-gray-300 dark:text-slate-700">
                      {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
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
                      className="space-y-5 mt-8"
                    >
                      <div className="space-y-4">
                        <div className="group">
                          <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 mr-2 mb-1 block uppercase">اسم العميل بالكامل</label>
                          <input 
                            type="text" 
                            dir="rtl"
                            value={cust.name} 
                            onChange={(e) => updateCustomer(idx, 'name', e.target.value)} 
                            className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-500 font-bold text-sm transition-all text-right" 
                            placeholder="مثال: محمد أحمد" 
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="group">
                            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 mr-2 mb-1 block uppercase">رقم الهاتف</label>
                            <input 
                              type="tel" 
                              dir="ltr"
                              value={cust.phone} 
                              onChange={(e) => updateCustomer(idx, 'phone', e.target.value)} 
                              className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-500 font-bold text-sm transition-all text-left" 
                              placeholder="01xxxxxxxxx" 
                            />
                          </div>
                          <div className="group">
                            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 mr-2 mb-1 block uppercase">العنوان التفصيلي</label>
                            <input 
                              type="text" 
                              dir="rtl"
                              value={cust.address} 
                              onChange={(e) => updateCustomer(idx, 'address', e.target.value)} 
                              className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-500 font-bold text-sm transition-all text-right" 
                              placeholder="الشارع، الدور، الشقة" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 mr-1 uppercase tracking-tighter">قيمة الأوردر</label>
                            <input 
                              type="text" 
                              inputMode="decimal"
                              value={cust.orderValue} 
                              onChange={(e) => updateCustomer(idx, 'orderValue', e.target.value)} 
                              className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 ring-orange-500 font-black text-sm shadow-sm" 
                              placeholder="0.00" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 mr-1 uppercase tracking-tighter">سعر التوصيل</label>
                            <input 
                              type="text" 
                              inputMode="decimal"
                              value={cust.deliveryFee} 
                              onChange={(e) => updateCustomer(idx, 'deliveryFee', e.target.value)} 
                              className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-orange-500 font-black text-sm shadow-sm" 
                              placeholder="30" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-orange-600 mr-1 uppercase tracking-tighter">وقت التحضير</label>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              value={cust.prepTime} 
                              onChange={(e) => updateCustomer(idx, 'prepTime', e.target.value)} 
                              className="w-full bg-orange-50/50 p-4 rounded-2xl border border-orange-100 text-orange-700 outline-none focus:ring-2 ring-orange-300 font-black text-sm shadow-sm" 
                              placeholder="15" 
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          {cust.invoiceUrl && (
                            <div className="mb-2 relative rounded-xl overflow-hidden border border-gray-100 aspect-[3/4] max-h-48 bg-white shadow-sm group/preview mx-auto w-32">
                              <img 
                                src={cust.invoiceUrl} 
                                className="w-full h-full object-contain cursor-pointer" 
                                alt="Invoice Preview" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPreviewImage?.(cust.invoiceUrl!);
                                }}
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <Eye size={16} className="text-white" />
                              </div>
                              <div className="absolute top-1.5 right-1.5 bg-green-500 text-white p-0.5 rounded-full shadow-md">
                                <CheckCircle2 size={10} />
                              </div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => onCameraCapture?.(idx)}
                            disabled={isSaving || cust.isUploading}
                            className={`w-full p-3 rounded-xl border border-dashed transition-all flex items-center justify-center gap-2 ${
                              cust.invoiceUrl 
                                ? "bg-green-50 border-green-200 text-green-600" 
                                : "bg-gray-50 border-gray-200 text-gray-400 hover:border-orange-200 hover:text-orange-500"
                            }`}
                          >
                            <Camera size={16} className={!cust.invoiceUrl && !cust.isUploading ? "animate-pulse" : ""} />
                            <span className="text-[10px] font-black">
                              {cust.isUploading ? "جاري الرفع..." : cust.invoiceUrl ? "تحديث الفاتورة" : "تصوير الفاتورة"}
                            </span>
                          </button>
                        </div>
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
              className="w-full py-5 rounded-[32px] border-2 border-dashed border-gray-300 text-gray-500 font-black text-sm flex items-center justify-center gap-3 hover:border-orange-400 hover:text-orange-600 hover:bg-white transition-all active:scale-95 shadow-sm bg-white/50"
            >
              <Plus size={20} />
              إضافة عميل آخر للسكة (حتى 5 عملاء)
            </button>
          )}
        </div>

        {/* General Settings Section */}
        <div className="bg-white p-6 rounded-[40px] border border-gray-100 space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-900">إعدادات السكة العامة</p>
              <p className="text-[10px] font-bold text-gray-400">Notes & Location</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-black text-gray-400 mr-2 mb-1 block uppercase">ملاحظات عامة للطيار</label>
              <input 
                type="text" 
                dir="rtl"
                disabled={isSaving} 
                value={formData.notes} 
                onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })} 
                className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 outline-none focus:ring-2 ring-indigo-300 font-bold text-sm text-right" 
                placeholder="مثال: يرجى الاتصال عند الوصول" 
              />
            </div>

            <button 
              onClick={() => { triggerHaptic(); onPickCustomerLocation(); }}
              disabled={isSaving} 
              className={`w-full p-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-60 shadow-md ${
                formData.customerCoords 
                  ? "bg-emerald-500 text-white shadow-emerald-100" 
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              <MapPin size={20} />
              {formData.customerCoords ? "تم تحديد الموقع بنجاح ✓" : "تحديد موقع السكة الجغرافي"}
            </button>
          </div>
        </div>

        {/* Financial Summary Dashboard */}
        <div className="bg-gray-900 p-8 rounded-[48px] text-white space-y-6 shadow-2xl shadow-slate-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-3xl" />
          
          <div className="flex justify-between items-center text-xs font-bold opacity-50 relative z-10">
            <span>ملخص السكة المالي</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">{activeCustomers.length} عملاء</span>
          </div>

          <div className="grid grid-cols-2 gap-6 relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">قيمة الأوردرات</p>
              <p className="text-2xl font-black text-white">
                {totalOrderValue}
                <span className="text-xs font-bold opacity-40 mr-1">ج.م</span>
              </p>
            </div>
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">إجمالي التوصيل</p>
              <p className="text-2xl font-black text-orange-500">
                {totalDeliveryFee}
                <span className="text-xs font-bold opacity-40 mr-1">ج.م</span>
              </p>
            </div>
          </div>

          <div className="h-px bg-white/10 relative z-10" />

          <div className="flex justify-between items-center relative z-10">
            <p className="text-[10px] font-bold text-slate-400">إجمالي رسوم التأمين المستحقة:</p>
            <p className="text-sm font-black text-white">{totalInsurance} ج.م</p>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#f3f4f6] via-[#f3f4f6] to-transparent z-30">
        <button 
          onClick={onSave} 
          disabled={activeCustomers.some(c => !c.name || !c.orderValue) || uploadingInvoice || isSaving || activeCustomers.length === 0} 
          className="w-full max-w-md mx-auto bg-orange-500 text-white py-5 rounded-[32px] font-black text-lg shadow-2xl shadow-orange-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 border-4 border-white"
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