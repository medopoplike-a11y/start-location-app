"use client";

import type { DriverCard } from "../types";

interface DriversViewProps {
  drivers: DriverCard[];
  onAddDriver: () => void;
  onToggleShiftLock: (driverId: string, currentStatus: boolean) => void;
  onResetUser: (userId: string, userName: string) => void;
}

export default function DriversView({ drivers, onAddDriver, onToggleShiftLock, onResetUser }: DriversViewProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">إدارة المناديب</h3>
        <button onClick={onAddDriver} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold">إضافة مندوب</button>
      </div>
      {drivers.map((d) => (
        <div key={d.id_full} className="p-3 rounded-xl border border-gray-100 flex flex-wrap gap-2 items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">{d.name}</p>
            <p className="text-xs text-gray-500">{d.status}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onToggleShiftLock(d.id_full, d.isShiftLocked)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold">
              {d.isShiftLocked ? "فتح الشيفت" : "قفل الشيفت"}
            </button>
            <button onClick={() => onResetUser(d.id_full, d.name)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
              تصفير
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
