"use client";

import type { VendorCard } from "../types";

interface VendorsViewProps {
  vendors: VendorCard[];
  onAddVendor: () => void;
  onResetUser: (userId: string, userName: string) => void;
}

export default function VendorsView({ vendors, onAddVendor, onResetUser }: VendorsViewProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">إدارة المحلات</h3>
        <button onClick={onAddVendor} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold">إضافة محل</button>
      </div>
      {vendors.map((v) => (
        <div key={v.id_full} className="p-3 rounded-xl border border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-800">{v.name}</p>
            <p className="text-xs text-gray-500">رصيد: {v.balance.toLocaleString()} ج.م</p>
          </div>
          <button onClick={() => onResetUser(v.id_full, v.name)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
            تصفير
          </button>
        </div>
      ))}
    </div>
  );
}
