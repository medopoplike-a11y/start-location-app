"use client";

import { Power, Menu } from "lucide-react";
import { SyncIndicator } from "@/components/SyncIndicator";

interface DriverHeaderProps {
  driverName: string;
  lastSyncTime: Date;
  isRefreshing: boolean;
  isActive: boolean;
  onOpenDrawer: () => void;
  onToggleActive: () => void;
}

export default function DriverHeader({
  driverName,
  lastSyncTime,
  isRefreshing,
  isActive,
  onOpenDrawer,
  onToggleActive,
}: DriverHeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-xl p-6 shadow-sm flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <button onClick={onOpenDrawer} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100">
          <Menu className="w-5 h-5 text-gray-900" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-sm font-black text-gray-900 leading-tight">Start Location</h1>
          <p className="text-[10px] font-bold text-gray-400">كابتن: {driverName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SyncIndicator lastSync={lastSyncTime} isSyncing={isRefreshing} />
        <button onClick={onToggleActive} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all ${isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
          <Power className="w-4 h-4" />
          <span className="font-black text-[10px]">{isActive ? "Online" : "Offline"}</span>
        </button>
      </div>
    </header>
  );
}
