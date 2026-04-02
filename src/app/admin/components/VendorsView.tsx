"use client";

import { motion } from "framer-motion";
import { Store, MapPin, MapPinOff, RotateCcw, Plus } from "lucide-react";
import type { VendorCard } from "../types";

interface VendorsViewProps {
  vendors: VendorCard[];
  onAddVendor: () => void;
  onResetUser: (userId: string, userName: string) => void;
}

export default function VendorsView({ vendors, onAddVendor, onResetUser }: VendorsViewProps) {
  const withLocation = vendors.filter(v => v.location?.lat);
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

                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">المديونية / العمولة</p>
                  <p className="text-sm font-black text-slate-800">{v.balance.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ج.م</span></p>
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
