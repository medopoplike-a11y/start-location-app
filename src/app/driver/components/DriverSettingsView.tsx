"use client";

import { ArrowRight, Loader2, CheckCircle2, Mail, Phone, Lock, User } from "lucide-react";

interface SettingsData {
  name: string;
  phone: string;
  email: string;
  password?: string;
}

interface DriverSettingsViewProps {
  settingsData: SettingsData;
  savingSettings: boolean;
  onBack: () => void;
  onSettingsDataChange: (data: SettingsData) => void;
  onSave: () => void;
}

export default function DriverSettingsView({
  settingsData,
  savingSettings,
  onBack,
  onSettingsDataChange,
  onSave,
}: DriverSettingsViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} disabled={savingSettings} className="bg-white p-2 rounded-xl shadow-sm text-gray-400 disabled:opacity-60">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">إعدادات الحساب</h2>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-6 shadow-sm">
        <h3 className="text-sm font-black text-gray-700">بيانات الملف الشخصي</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 block mb-2">الاسم بالكامل</label>
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                disabled={savingSettings}
                value={settingsData.name}
                onChange={(e) => onSettingsDataChange({ ...settingsData, name: e.target.value })}
                className="w-full bg-gray-50 pr-12 pl-4 py-4 rounded-2xl border-none outline-none focus:ring-2 ring-emerald-500 font-bold text-gray-800 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 block mb-2">رقم الهاتف</label>
            <div className="relative">
              <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                disabled={savingSettings}
                value={settingsData.phone}
                onChange={(e) => onSettingsDataChange({ ...settingsData, phone: e.target.value })}
                className="w-full bg-gray-50 pr-12 pl-4 py-4 rounded-2xl border-none outline-none focus:ring-2 ring-emerald-500 font-bold text-gray-800 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 block mb-2">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                disabled={savingSettings}
                value={settingsData.email}
                onChange={(e) => onSettingsDataChange({ ...settingsData, email: e.target.value })}
                className="w-full bg-gray-50 pr-12 pl-4 py-4 rounded-2xl border-none outline-none focus:ring-2 ring-emerald-500 font-bold text-gray-800 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 block mb-2">كلمة مرور جديدة (اتركها فارغة إذا لا تريد التغيير)</label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                disabled={savingSettings}
                value={settingsData.password || ""}
                onChange={(e) => onSettingsDataChange({ ...settingsData, password: e.target.value })}
                className="w-full bg-gray-50 pr-12 pl-4 py-4 rounded-2xl border-none outline-none focus:ring-2 ring-emerald-500 font-bold text-gray-800 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={savingSettings || !settingsData.name || !settingsData.email}
          className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-bold shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {savingSettings ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> جاري الحفظ...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> حفظ التغييرات</>
          )}
        </button>
      </div>
    </div>
  );
}
