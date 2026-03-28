"use client";

import type { FormEvent } from "react";

interface AppConfigState {
  latest_version: string;
  min_version: string;
  download_url: string;
  bundle_url: string;
  force_update: boolean;
  update_message: string;
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
      <h3 className="font-bold text-gray-900 mb-4">إعدادات التحديث والعمولات</h3>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input value={appConfig.latest_version} onChange={(e) => setAppConfig({ ...appConfig, latest_version: e.target.value })} className="bg-gray-50 p-3 rounded-xl border border-gray-100" placeholder="latest version" />
        <input value={appConfig.min_version} onChange={(e) => setAppConfig({ ...appConfig, min_version: e.target.value })} className="bg-gray-50 p-3 rounded-xl border border-gray-100" placeholder="min version" />
        <input value={appConfig.driver_commission} onChange={(e) => setAppConfig({ ...appConfig, driver_commission: Number(e.target.value) || 0 })} className="bg-gray-50 p-3 rounded-xl border border-gray-100" placeholder="driver commission" />
        <input value={appConfig.vendor_commission} onChange={(e) => setAppConfig({ ...appConfig, vendor_commission: Number(e.target.value) || 0 })} className="bg-gray-50 p-3 rounded-xl border border-gray-100" placeholder="vendor commission" />
        <button type="submit" disabled={actionLoading} className="md:col-span-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold">
          {actionLoading ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </form>
    </div>
  );
}
