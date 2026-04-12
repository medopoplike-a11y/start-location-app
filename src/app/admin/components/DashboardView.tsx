"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { PremiumCard } from "@/components/PremiumCard";
import { Bell, Map as MapIcon, Activity, Truck } from "lucide-react";
import type { ActivityLogItem, OnlineDriver, VendorCard, LiveOrderItem, AdminOrder } from "../types";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-50 animate-pulse flex items-center justify-center text-slate-400 font-black">جاري تحميل الخريطة...</div>
});

interface StatItem {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend: string;
  trendType: "positive" | "neutral";
  subtitle: string;
  color?: string;
}

interface DashboardViewProps {
  activityLog: ActivityLogItem[];
  stats: StatItem[];
  onlineDrivers: OnlineDriver[];
  vendors: VendorCard[];
  liveOrders: LiveOrderItem[];
  allOrders: AdminOrder[];
  systemHealth: {
    activeOrdersCount: number;
    onlineDriversCount: number;
    ratio: number;
    status: "optimal" | "busy" | "congested";
  };
}

export default function DashboardView({ activityLog, stats, onlineDrivers, vendors, liveOrders, allOrders, systemHealth }: DashboardViewProps) {
  return (
    <div className="space-y-8">
      {/* Upper Section: Stats & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Real-time Activity Feed */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              النشاط المباشر
            </h3>
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
          </div>
          
          <div className="flex-1 drawer-glass rounded-[32px] p-5 shadow-sm overflow-hidden relative min-h-[350px] border-none">
            <div className="absolute top-0 right-0 bottom-0 w-1 bg-blue-500/30" />
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {activityLog.length > 0 ? (
                  activityLog.map((log) => (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, y: -10 }} 
                      className="group bg-white/40 dark:bg-white/5 p-4 rounded-2xl border border-white/20 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all cursor-default shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 group-hover:scale-150 transition-transform shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <div className="flex-1 space-y-2">
                          <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 leading-relaxed tracking-tight">{log.text}</p>
                          <div className="flex items-center gap-2 opacity-60">
                            <Bell className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{log.time}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-300 dark:text-slate-700">
                    <Activity className="w-10 h-10 opacity-20 mb-4" />
                    <p className="text-[11px] font-black italic">لا يوجد نشاط حالي</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* System Health Widget */}
          <div className={`xl:col-span-3 drawer-glass rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between gap-8 transition-all border-none ${
            systemHealth.status === 'congested' ? "shadow-red-500/10" :
            systemHealth.status === 'busy' ? "shadow-amber-500/10" : "shadow-emerald-500/10"
          }`}>
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl ${
                systemHealth.status === 'congested' ? "bg-red-500 shadow-red-500/20" :
                systemHealth.status === 'busy' ? "bg-amber-500 shadow-amber-500/20" : "bg-emerald-500 shadow-emerald-200 shadow-xl dark:shadow-none"
              }`}>
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight italic">حالة تشغيل النظام</h4>
                <p className={`text-[11px] font-black uppercase tracking-widest ${
                  systemHealth.status === 'congested' ? "text-red-600 dark:text-red-400" :
                  systemHealth.status === 'busy' ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {systemHealth.status === 'congested' ? "ازدحام شديد — يرجى تفعيل وضع Surge" :
                   systemHealth.status === 'busy' ? "ضغط عمل مرتفع — يرجى المراقبة" : "النظام يعمل بكفاءة مثالية"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-10 bg-black/5 dark:bg-white/5 p-5 rounded-[28px] border border-black/5 dark:border-white/5">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 tracking-widest">طلبات نشطة</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{systemHealth.activeOrdersCount}</p>
              </div>
              <div className="w-px h-10 bg-black/10 dark:bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 tracking-widest">طيارين متاحين</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{systemHealth.onlineDriversCount}</p>
              </div>
              <div className="w-px h-10 bg-black/10 dark:bg-white/10" />
              <div className={`text-center px-6 py-2 rounded-2xl shadow-sm ${
                systemHealth.ratio > 2 ? "bg-red-500/10" : systemHealth.ratio > 1 ? "bg-amber-500/10" : "bg-emerald-500/10"
              }`}>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-0.5 tracking-widest">النسبة</p>
                <p className={`text-lg font-black ${
                  systemHealth.ratio > 2 ? "text-red-600 dark:text-red-400" : systemHealth.ratio > 1 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {systemHealth.ratio.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="drawer-glass rounded-[32px] p-6 border-none shadow-sm">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                أفضل الطيارين تقييماً
              </h4>
              <div className="space-y-3">
                {onlineDrivers.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3).map((d, i) => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/20 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400">#{i+1}</span>
                      <p className="text-[11px] font-black text-slate-700 dark:text-slate-300">{d.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">{(d.rating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="drawer-glass rounded-[32px] p-6 border-none shadow-sm">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-500" />
                أفضل المحلات تقييماً
              </h4>
              <div className="space-y-3">
                {vendors.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3).map((v, i) => (
                  <div key={v.id_full} className="flex items-center justify-between p-3 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/20 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400">#{i+1}</span>
                      <p className="text-[11px] font-black text-slate-700 dark:text-slate-300">{v.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">{(v.rating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {stats.map((stat, idx) => (
            <PremiumCard 
              key={idx} 
              title={stat.title} 
              value={stat.value} 
              icon={stat.icon} 
              trend={stat.trend} 
              trendType={stat.trendType} 
              subtitle={stat.subtitle} 
              delay={idx * 0.05} 
            />
          ))}
        </div>
      </div>

      {/* Lower Section: Live Map */}
      <div className="drawer-glass rounded-[40px] shadow-sm overflow-hidden group border-none">
        <div className="p-8 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-white/20 dark:bg-white/5">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <MapIcon className="w-6 h-6 text-blue-500 group-hover:rotate-12 transition-transform" />
              خريطة العمليات المباشرة
            </h3>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">تتبع لحظي للمناديب والمحلات النشطة</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{onlineDrivers.length} طيار متصل</span>
            </div>
          </div>
        </div>
        
        <div className="h-[500px] relative">
          <LiveMap
            drivers={onlineDrivers.map(d => ({
              ...d,
              status: allOrders.some(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit')) ? 'busy' : 'available',
              details: allOrders.find(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit'))?.vendor_full_name ? `جاري العمل على طلب من ${allOrders.find(o => o.driver_id === d.id && (o.status === 'assigned' || o.status === 'in_transit'))?.vendor_full_name}` : undefined
            }))}
            vendors={vendors.flatMap((v) => (v.location?.lat != null && v.location?.lng != null) ? [{ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng, details: `طلبات اليوم: ${v.orders}` }] : [])}
            orders={allOrders.filter(o => (o.status === 'pending' || o.status === 'assigned') && vendors.find(v => v.id_full === o.vendor_id)?.location).map(o => {
              const v = vendors.find(v => v.id_full === o.vendor_id)!;
              return {
                id: o.id,
                name: o.vendor_full_name || "محل",
                lat: v.location!.lat!,
                lng: v.location!.lng!,
                status: o.status === 'pending' ? 'جاري البحث عن طيار' : 'تم التعيين - بانتظار التحصيل',
                details: `قيمة الطلب: ${o.financials?.order_value} ج.م`
              };
            })}
            zoom={13}
            className="h-full w-full"
          />
          {/* Map Overlay for extra premium feel */}
          <div className="absolute bottom-8 left-8 z-[10] flex flex-col gap-3">
             <div className="drawer-glass p-4 rounded-2xl shadow-2xl flex items-center gap-4 border-none">
                <div className="w-10 h-10 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-600/10">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">المنطقة الرئيسية</p>
                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 tracking-tight">مدينة الشروق</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
