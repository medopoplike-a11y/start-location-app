"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { PremiumCard } from "@/components/PremiumCard";
import { Bell, Map as MapIcon, Activity, Truck } from "lucide-react";
import type { ActivityLogItem, OnlineDriver, VendorCard } from "../types";

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
          
          <div className="flex-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-[32px] p-4 shadow-sm overflow-hidden relative min-h-[300px]">
            <div className="absolute top-0 right-0 bottom-0 w-1 bg-sky-500/20" />
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {activityLog.length > 0 ? (
                  activityLog.map((log) => (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, y: -10 }} 
                      className="group bg-white/40 dark:bg-slate-800/40 p-3 rounded-2xl border border-white/60 dark:border-slate-700/60 hover:border-sky-100 dark:hover:border-sky-900 hover:bg-white/80 dark:hover:bg-slate-800 transition-all cursor-default"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-sky-500 group-hover:scale-125 transition-transform" />
                        <div className="flex-1 space-y-1">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{log.text}</p>
                          <div className="flex items-center gap-1.5">
                            <Bell className="w-2.5 h-2.5 text-slate-300 dark:text-slate-600" />
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">{log.time}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-700">
                    <Activity className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-[10px] font-bold">لا يوجد نشاط حالي</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* System Health Widget */}
          <div className={`xl:col-span-3 bg-white dark:bg-slate-900 border-2 rounded-[32px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${
            systemHealth.status === 'congested' ? "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 shadow-red-50 dark:shadow-none shadow-lg" :
            systemHealth.status === 'busy' ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20" : "border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20"
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center ${
                systemHealth.status === 'congested' ? "bg-red-500 shadow-red-200 shadow-xl dark:shadow-none" :
                systemHealth.status === 'busy' ? "bg-amber-500 shadow-amber-200 shadow-xl dark:shadow-none" : "bg-emerald-500 shadow-emerald-200 shadow-xl dark:shadow-none"
              }`}>
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">حالة تشغيل النظام</h4>
                <p className={`text-[11px] font-bold ${
                  systemHealth.status === 'congested' ? "text-red-600 dark:text-red-400" :
                  systemHealth.status === 'busy' ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {systemHealth.status === 'congested' ? "ازدحام شديد — يرجى تفعيل وضع Surge" :
                   systemHealth.status === 'busy' ? "ضغط عمل مرتفع — يرجى المراقبة" : "النظام يعمل بكفاءة مثالية"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-8 bg-white/60 dark:bg-slate-800/60 p-4 rounded-3xl border border-white/80 dark:border-slate-700/80">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">طلبات نشطة</p>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{systemHealth.activeOrdersCount}</p>
              </div>
              <div className="w-px h-8 bg-slate-100 dark:bg-slate-700" />
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">طيارين متاحين</p>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{systemHealth.onlineDriversCount}</p>
              </div>
              <div className="w-px h-8 bg-slate-100 dark:bg-slate-700" />
              <div className={`text-center px-4 py-1.5 rounded-2xl ${
                systemHealth.ratio > 2 ? "bg-red-100 dark:bg-red-900/30" : systemHealth.ratio > 1 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
              }`}>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-0.5">النسبة</p>
                <p className={`text-sm font-black ${
                  systemHealth.ratio > 2 ? "text-red-600 dark:text-red-400" : systemHealth.ratio > 1 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {systemHealth.ratio.toFixed(1)}
                </p>
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
      <div className="bg-white/60 backdrop-blur-xl rounded-[40px] border border-slate-100 shadow-sm overflow-hidden group">
        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-white/40">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-3">
              <MapIcon className="w-5 h-5 text-sky-500 group-hover:rotate-12 transition-transform" />
              خريطة العمليات المباشرة
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">تتبع لحظي للمناديب والمحلات النشطة</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 uppercase">{onlineDrivers.length} طيار متصل</span>
            </div>
          </div>
        </div>
        
        <div className="h-[450px] relative">
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
          <div className="absolute bottom-6 left-6 z-[10] flex flex-col gap-2">
             <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-white shadow-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100"><Truck className="w-4 h-4 text-sky-500" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">المنطقة الرئيسية</p>
                  <p className="text-[10px] font-black text-slate-800 tracking-tighter">مدينة الشروق</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
