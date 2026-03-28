"use client";

import { ArrowRight } from "lucide-react";

interface SettingsData {
  name: string;
  phone: string;
  area: string;
}

interface VendorSettingsViewProps {
  settingsData: SettingsData;
  savingSettings: boolean;
  onBack: () => void;
  onSettingsDataChange: (data: SettingsData) => void;
  onSave: () => void;
}

export default function VendorSettingsView({ settingsData, savingSettings, onBack, onSettingsDataChange, onSave }: VendorSettingsViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6"><button onClick={onBack} className="bg-white p-2 rounded-xl shadow-sm text-gray-400"><ArrowRight className="w-5 h-5" /></button><h2 className="text-2xl font-bold text-gray-900">إعدادات الحساب</h2></div>
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-6 shadow-sm">
        <div><label className="text-xs font-bold text-gray-400 block mb-2">اسم المحل</label><input type="text" value={settingsData.name} onChange={(e) => onSettingsDataChange({ ...settingsData, name: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold text-gray-800" /></div>
        <div><label className="text-xs font-bold text-gray-400 block mb-2">رقم الهاتف</label><input type="tel" value={settingsData.phone} onChange={(e) => onSettingsDataChange({ ...settingsData, phone: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-brand-orange font-bold text-gray-800" /></div>
        <button onClick={onSave} disabled={savingSettings} className="w-full bg-brand-orange text-white py-5 rounded-2xl font-bold shadow-lg disabled:opacity-50">{savingSettings ? "جاري الحفظ..." : "حفظ التغييرات"}</button>
      </div>
    </div>
  );
}
