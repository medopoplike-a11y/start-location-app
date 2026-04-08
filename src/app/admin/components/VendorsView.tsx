"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Store, MapPin, MapPinOff, RotateCcw, Plus, CheckCircle, X, Settings } from "lucide-react";
import type { VendorCard } from "../types";

interface VendorsViewProps {
  vendors: VendorCard[];
  onAddVendor: () => void;
  onUpdateVendorCommission?: (vendorId: string, type: 'percentage' | 'fixed', value: number) => Promise<void>;
  onResetUser: (userId: string, userName: string) => void;
}

export default function VendorsView({ vendors, onAddVendor, onUpdateVendorCommission, onResetUser }: VendorsViewProps) {
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [tempCommission, setTempCommission] = useState<{ type: 'percentage' | 'fixed', value: number }>({ type: 'percentage', value: 0 });

  const handleUpdateCommission = async (vendorId: string) => {
    if (!onUpdateVendorCommission) return;
    await onUpdateVendorCommission(vendorId, tempCommission.type, tempCommission.value);
    setEditingCommissionId(null);
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">إدارة المحلات</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {vendors.length} محل · {withLocation.length} محدد الموقع
          </p>
        </div>
        <button onClick={onAddVendor} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white text-sm font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
          <Plus className="w-4 h-4" />
          إضافة محل
        </button>
      </div>

      {vendors.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-[32px] p-16 text-center">
          <Store className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-bold">لا يوجد محلات بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map((v, i) => {
            const hasLocation = !!(v.location?.lat && v.location?.lng);
            return (
              <motion.div
                key={v.id_full}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-sm space-y-4 hover:border-slate-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                      <Store className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{v.name}</p>
                      <div className={`flex items-center gap-1.5 mt-0.5 ${hasLocation ? "text-emerald-500" : "text-red-400"}`}>
                        {hasLocation ? <MapPin className="w-3 h-3" /> : <MapPinOff className="w-3 h-3" />}
                        <span className="text-[10px] font-black">{hasLocation ? "موقع محدد" : "لا يوجد موقع"}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">#{v.id}</span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase">المديونية الحالية</p>
                    <p className="text-sm font-black text-slate-800">{v.balance.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ج.م</span></p>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">نظام العمولة</p>
                      {editingCommissionId === v.id_full ? (
                        <div className="flex gap-1">
                          <button onClick={() => setTempCommission({...tempCommission, type: 'percentage'})} className={`px-2 py-0.5 rounded-lg text-[8px] font-black ${tempCommission.type === 'percentage' ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"}`}>%</button>
                          <button onClick={() => setTempCommission({...tempCommission, type: 'fixed'})} className={`px-2 py-0.5 rounded-lg text-[8px] font-black ${tempCommission.type === 'fixed' ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"}`}>ج.م</button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                          {v.commission_type === 'fixed' ? `${v.commission_value || 0} ج.م` : `${v.commission_value || 0}%`}
                        </span>
                      )}
                    </div>
                    
                    {editingCommissionId === v.id_full ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="number" 
                          value={tempCommission.value} 
                          onChange={(e) => setTempCommission({...tempCommission, value: Number(e.target.value)})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black outline-none"
                        />
                        <button onClick={() => handleUpdateCommission(v.id_full)} className="p-1.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => setEditingCommissionId(null)} className="p-1.5 bg-slate-200 text-slate-500 rounded-xl"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingCommissionId(v.id_full);
                          setTempCommission({ type: v.commission_type || 'percentage', value: v.commission_value || 0 });
                        }}
                        className="text-[9px] font-black text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-1"
                      >
                        <Settings className="w-3 h-3" />
                        تعديل نظام العمولة
                      </button>
                    )}
                  </div>
                </div>

                <button onClick={() => onResetUser(v.id_full, v.name)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all">
                  <RotateCcw className="w-3.5 h-3.5" />
                  تصفير البيانات
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
