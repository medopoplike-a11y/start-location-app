"use client";

interface SettingsViewProps {
  actionLoading: boolean;
  onGlobalReset: () => void;
}

export default function SettingsView({ actionLoading, onGlobalReset }: SettingsViewProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm space-y-4">
      <h3 className="font-bold text-gray-900">إعدادات متقدمة</h3>
      <button onClick={onGlobalReset} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">
        تصفير شامل للنظام
      </button>
    </div>
  );
}
