"use client";

import type { FormEvent } from "react";

interface AppConfigState {
  latest_version: string;
  min_version: string;
  download_url: string;
  bundle_url: string;
  force_update: boolean;
  update_message: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  driver_commission: number;
  vendor_commission: number;
  vendor_fee: number;
  safe_ride_fee: number;
}

interface AppConfigViewProps {
  appConfig: AppConfigState;
  actionLoading: boolean;
  setAppConfig: (updater: AppConfigState) => void;
  onSubmit: (e: FormEvent) => void;
}

export default function AppConfigView({ appConfig, actionLoading, setAppConfig, onSubmit }: AppConfigViewProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
      <h3 className="font-bold text-gray-900 mb-4">إعدادات التحديث والنظام</h3>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-2">
          <span className="text-xs text-gray-500">أحدث نسخة متاحة</span>
          <input
            value={appConfig.latest_version}
            onChange={(e) => setAppConfig({ ...appConfig, latest_version: e.target.value })}
            className="bg-gray-50 p-3 rounded-xl border border-gray-100"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs text-gray-500">الحد الأدنى للإصدار</span>
          <input
            value={appConfig.min_version}
            onChange={(e) => setAppConfig({ ...appConfig, min_version: e.target.value })}
            className="bg-gray-50 p-3 rounded-xl border border-gray-100"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs text-gray-500">رابط ملف التحديث ZIP</span>
          <input
            value={appConfig.bundle_url}
            onChange={(e) => setAppConfig({ ...appConfig, bundle_url: e.target.value })}
            className="bg-gray-50 p-3 rounded-xl border border-gray-100"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs text-gray-500">رسالة التحديث للمستخدم</span>
          <textarea
            value={appConfig.update_message}
            onChange={(e) => setAppConfig({ ...appConfig, update_message: e.target.value })}
            className="bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[96px]"
          />
        </label>

        <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50">
          <input
            type="checkbox"
            checked={appConfig.force_update}
            onChange={(e) => setAppConfig({ ...appConfig, force_update: e.target.checked })}
            className="h-4 w-4 text-blue-600"
          />
          <span className="text-sm text-gray-700">فرض التحديث الإجباري</span>
        </label>

        <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50">
          <input
            type="checkbox"
            checked={appConfig.maintenance_mode}
            onChange={(e) => setAppConfig({ ...appConfig, maintenance_mode: e.target.checked })}
            className="h-4 w-4 text-blue-600"
          />
          <span className="text-sm text-gray-700">وضع الصيانة</span>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs text-gray-500">رسالة وضع الصيانة</span>
          <textarea
            value={appConfig.maintenance_message}
            onChange={(e) => setAppConfig({ ...appConfig, maintenance_message: e.target.value })}
            className="bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[96px]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs text-gray-500">عمولة السائق</span>
          <input
            value={appConfig.driver_commission}
            onChange={(e) => setAppConfig({ ...appConfig, driver_commission: Number(e.target.value) || 0 })}
            className="bg-gray-50 p-3 rounded-xl border border-gray-100"
            type="number"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs text-gray-500">عمولة التاجر</span>
          <input
            value={appConfig.vendor_commission}
            onChange={(e) => setAppConfig({ ...appConfig, vendor_commission: Number(e.target.value) || 0 })}
            className="bg-gray-50 p-3 rounded-xl border border-gray-100"
            type="number"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs text-gray-500">رسوم البائع</span>
          <input
            value={appConfig.vendor_fee}
            onChange={(e) => setAppConfig({ ...appConfig, vendor_fee: Number(e.target.value) || 0 })}
            className="bg-gray-50 p-3 rounded-xl border border-gray-100"
            type="number"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs text-gray-500">رسوم الرحلة الآمنة</span>
          <input
            value={appConfig.safe_ride_fee}
            onChange={(e) => setAppConfig({ ...appConfig, safe_ride_fee: Number(e.target.value) || 0 })}
            className="bg-gray-50 p-3 rounded-xl border border-gray-100"
            type="number"
          />
        </label>

        <button type="submit" disabled={actionLoading} className="md:col-span-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold">
          {actionLoading ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </form>
    </div>
  );
}
