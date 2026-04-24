"use client";

import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { Save, Smartphone, DollarSign, Package, Bell, Loader2, Zap } from "lucide-react";

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
  surge_pricing_active: boolean;
  surge_pricing_multiplier: number;
}

interface SettingsViewProps {
  appConfig: AppConfigState;
  actionLoading: boolean;
  setAppConfig: (config: AppConfigState) => void;
  onSubmit: (e: FormEvent) => void;
  onGlobalReset: () => void;
}

const SectionCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-6 shadow-sm space-y-5"
  >
    <h3 className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
      {icon}
      {title}
    </h3>
    {children}
  </motion.div>
);

const InputField = ({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string;
}) => (
  <label className="block space-y-1.5">
    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</span>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-200 dark:focus:border-blue-800 transition-all"
    />
  </label>
);

const ToggleField = ({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
    <div>
      <p className="text-sm font-black text-slate-800 dark:text-slate-200">{label}</p>
      {description && <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-all ${checked ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"}`}
    >
      <motion.div
        animate={{ x: checked ? 24 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  </div>
);

export default function SettingsView({ appConfig, actionLoading, setAppConfig, onSubmit }: SettingsViewProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">إعدادات التطبيق والنظام</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">جميع إعدادات التطبيق والعمولات في مكان واحد</p>
        </div>
        <button
          type="submit"
          disabled={actionLoading}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white text-sm font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {actionLoading ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>

      <SectionCard icon={<Smartphone className="w-4 h-4 text-blue-500" />} title="إعدادات التطبيق الأساسية">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="إصدار التطبيق الحالي"
            value={appConfig.latest_version}
            onChange={v => setAppConfig({ ...appConfig, latest_version: v })}
          />
          <InputField
            label="رابط حزمة التحديث (OTA Bundle)"
            value={appConfig.bundle_url}
            onChange={v => setAppConfig({ ...appConfig, bundle_url: v })}
          />
          <div className="md:col-span-2">
            <InputField
              label="رابط التحميل المباشر (APK)"
              value={appConfig.download_url}
              onChange={v => setAppConfig({ ...appConfig, download_url: v })}
            />
          </div>
        </div>
        <div className="pt-4 border-t border-slate-50">
          <ToggleField
            label="تحديث إجباري"
            description="إجبار المستخدمين على التحديث فوراً"
            checked={appConfig.force_update}
            onChange={v => setAppConfig({ ...appConfig, force_update: v })}
          />
        </div>
      </SectionCard>

      <SectionCard icon={<Bell className="w-4 h-4 text-red-500" />} title="وضع الصيانة">
        <ToggleField
          label="تفعيل وضع الصيانة"
          description="سيتم منع المستخدمين من الدخول أثناء الصيانة"
          checked={appConfig.maintenance_mode}
          onChange={v => setAppConfig({ ...appConfig, maintenance_mode: v })}
        />
        <label className="block space-y-1.5">
          <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">رسالة الصيانة</span>
          <textarea
            value={appConfig.maintenance_message}
            onChange={e => setAppConfig({ ...appConfig, maintenance_message: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 min-h-[80px] resize-none"
          />
        </label>
      </SectionCard>

      <SectionCard icon={<DollarSign className="w-4 h-4 text-emerald-500" />} title="إعدادات العمولات والرسوم">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase">عمولة الطيار %</p>
            <input
              type="number"
              value={appConfig.driver_commission}
              onChange={e => setAppConfig({ ...appConfig, driver_commission: Number(e.target.value) || 0 })}
              className="w-full bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/30 rounded-xl px-3 py-2 text-sm font-black text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-black text-orange-500 dark:text-orange-400 uppercase">عمولة المحل %</p>
            <input
              type="number"
              value={appConfig.vendor_commission}
              onChange={e => setAppConfig({ ...appConfig, vendor_commission: Number(e.target.value) || 0 })}
              className="w-full bg-white dark:bg-slate-900 border border-orange-100 dark:border-orange-900/30 rounded-xl px-3 py-2 text-sm font-black text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-black text-purple-500 dark:text-purple-400 uppercase">رسوم المحل ج.م</p>
            <input
              type="number"
              value={appConfig.vendor_fee}
              onChange={e => setAppConfig({ ...appConfig, vendor_fee: Number(e.target.value) || 0 })}
              className="w-full bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/30 rounded-xl px-3 py-2 text-sm font-black text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase">رسوم التأمين ج.م</p>
            <input
              type="number"
              value={appConfig.safe_ride_fee}
              onChange={e => setAppConfig({ ...appConfig, safe_ride_fee: Number(e.target.value) || 0 })}
              className="w-full bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/30 rounded-xl px-3 py-2 text-sm font-black text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6 mt-2">
          <div className="md:col-span-2">
            <h4 className="font-black text-orange-600 flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4" />
              نظام أسعار الذروة (Surge Pricing)
            </h4>
          </div>
          
          <ToggleField
            label="تفعيل زيادة الأسعار"
            description="تطبيق مضاعف السعر تلقائياً"
            checked={appConfig.surge_pricing_active}
            onChange={v => setAppConfig({ ...appConfig, surge_pricing_active: v })}
          />

          <InputField
            label="مضاعف السعر (مثلاً 1.5)"
            value={appConfig.surge_pricing_multiplier}
            onChange={v => setAppConfig({ ...appConfig, surge_pricing_multiplier: Number(v) || 1 })}
            type="number"
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 mb-3">ملخص العمولات الحالية</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            <div><p className="text-xl font-black text-blue-600 dark:text-blue-400">{appConfig.driver_commission}%</p><p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">طيار</p></div>
            <div><p className="text-xl font-black text-orange-600 dark:text-orange-400">{appConfig.vendor_commission}%</p><p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">محل</p></div>
            <div><p className="text-xl font-black text-purple-600 dark:text-purple-400">{appConfig.vendor_fee} ج.م</p><p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">رسوم محل</p></div>
            <div><p className="text-xl font-black text-rose-600 dark:text-rose-400">{appConfig.safe_ride_fee} ج.م</p><p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">تأمين</p></div>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Package className="w-4 h-4 text-indigo-500" />} title="معلومات التطبيق">
        <InputField
          label="رابط ملف APK للتحميل"
          value={appConfig.download_url}
          onChange={v => setAppConfig({ ...appConfig, download_url: v })}
          placeholder="/start-location-v0.2.0.apk"
        />
        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4">
          <p className="text-[11px] font-black text-indigo-500 dark:text-indigo-400 uppercase mb-2">النسخة الحالية</p>
          <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">v{appConfig.latest_version}</p>
          <p className="text-[10px] text-indigo-400 dark:text-indigo-500 font-bold mt-1">الحد الأدنى المطلوب: v{appConfig.min_version}</p>
        </div>
      </SectionCard>
    </form>
  );
}
