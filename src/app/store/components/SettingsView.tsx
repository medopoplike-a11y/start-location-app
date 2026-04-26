"use client";

import { ArrowRight, Loader2, MapPin, CheckCircle2 } from "lucide-react";

interface SettingsData {
  name: string;
  phone: string;
  area: string;
  email?: string;
  password?: string;
}

interface StoreSettingsViewProps {
  settingsData: SettingsData;
  savingSettings: boolean;
  vendorLocation?: { lat: number; lng: number } | null;
  updatingLocation?: boolean;
  onBack: () => void;
  onSettingsDataChange: (data: SettingsData) => void;
  onSave: () => void;
  onUpdateLocation?: () => void;
}

export default function StoreSettingsView({
  settingsData,
  savingSettings,
  vendorLocation,
  updatingLocation = false,
  onBack,
  onSettingsDataChange,
  onSave,
  onUpdateLocation,
}: StoreSettingsViewProps) {
  const hasLocation = !!(vendorLocation?.lat && vendorLocation?.lng);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} disabled={savingSettings} className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm text-gray-400 dark:text-slate-500 disabled:opacity-60">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">إعدادات الحساب</h2>
      </div>

      {/* Location Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-gray-100 dark:border-slate-800 space-y-4 shadow-sm">
        <h3 className="text-sm font-black text-gray-700 dark:text-slate-300 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-500" />
          موقع المحل
        </h3>

        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${hasLocation ? "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30" : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30"}`}>
          {hasLocation ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <MapPin className="w-5 h-5 text-amber-500 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={`text-xs font-black ${hasLocation ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
              {hasLocation ? "تم تحديد موقع المحل" : "لم يتم تحديد موقع المحل بعد"}
            </p>
            {hasLocation && (
              <p className="text-[10px] text-green-500 dark:text-green-600 font-bold mt-0.5">
                {vendorLocation!.lat.toFixed(4)} , {vendorLocation!.lng.toFixed(4)}
              </p>
            )}
            {!hasLocation && (
              <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold mt-0.5">
                الموقع مطلوب لحساب رسوم التوصيل تلقائياً
              </p>
            )}
          </div>
        </div>

        {onUpdateLocation && (
          <button
            onClick={onUpdateLocation}
            disabled={updatingLocation || savingSettings}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm border-2 border-dashed border-orange-500/40 text-orange-500 hover:bg-orange-500/5 dark:hover:bg-orange-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updatingLocation ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جاري تحديد الموقع...</>
            ) : (
              <><MapPin className="w-4 h-4" /> {hasLocation ? "تحديث موقع المحل" : "تحديد موقع المحل الآن"}</>
            )}
          </button>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-gray-100 dark:border-slate-800 space-y-6 shadow-sm">
        <h3 className="text-sm font-black text-gray-700 dark:text-slate-300">بيانات الحساب</h3>
        <div>
          <label className="text-xs font-bold text-gray-400 dark:text-slate-500 block mb-2">اسم المحل</label>
          <input
            type="text"
            disabled={savingSettings}
            value={settingsData.name}
            onChange={(e) => onSettingsDataChange({ ...settingsData, name: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500 font-bold text-gray-800 dark:text-slate-200 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 dark:text-slate-500 block mb-2">رقم الهاتف</label>
          <input
            type="tel"
            disabled={savingSettings}
            value={settingsData.phone}
            onChange={(e) => onSettingsDataChange({ ...settingsData, phone: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500 font-bold text-gray-800 dark:text-slate-200 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 dark:text-slate-500 block mb-2">البريد الإلكتروني</label>
          <input
            type="email"
            disabled={savingSettings}
            value={settingsData.email || ""}
            onChange={(e) => onSettingsDataChange({ ...settingsData, email: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500 font-bold text-gray-800 dark:text-slate-200 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 dark:text-slate-500 block mb-2">كلمة مرور جديدة (اتركها فارغة إذا لا تريد التغيير)</label>
          <input
            type="password"
            disabled={savingSettings}
            value={settingsData.password || ""}
            onChange={(e) => onSettingsDataChange({ ...settingsData, password: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500 font-bold text-gray-800 dark:text-slate-200 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 dark:text-slate-500 block mb-2">المنطقة</label>
          <input
            type="text"
            disabled={savingSettings}
            value={settingsData.area}
            onChange={(e) => onSettingsDataChange({ ...settingsData, area: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500 font-bold text-gray-800 dark:text-slate-200 disabled:opacity-60"
          />
        </div>
        <button
          onClick={onSave}
          disabled={savingSettings || !settingsData.name}
          className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {savingSettings ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> جاري الحفظ...</>
          ) : (
            "حفظ التغييرات"
          )}
        </button>
      </div>
    </div>
  );
}
