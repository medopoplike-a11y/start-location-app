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
}

export default function DashboardView({ activityLog, stats, onlineDrivers, vendors }: DashboardViewProps) {
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
          
          <div className="flex-1 bg-white/60 backdrop-blur-xl border border-slate-100 rounded-[32px] p-4 shadow-sm overflow-hidden relative min-h-[300px]">
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
                      className="group bg-white/40 p-3 rounded-2xl border border-white/60 hover:border-sky-100 hover:bg-white/80 transition-all cursor-default"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-sky-500 group-hover:scale-125 transition-transform" />
                        <div className="flex-1 space-y-1">
                          <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{log.text}</p>
                          <div className="flex items-center gap-1.5">
                            <Bell className="w-2.5 h-2.5 text-slate-300" />
                            <span className="text-[9px] font-black text-slate-400 uppercase">{log.time}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
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
            drivers={onlineDrivers}
            vendors={vendors.flatMap((v) => (v.location?.lat != null && v.location?.lng != null) ? [{ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng }] : [])}
            zoom={13}
            className="h-full w-full"
          />
          {/* Map Overlay for extra premium feel */}
          <div className="absolute bottom-6 left-6 z-[10] flex flex-col gap-2">
             <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-white shadow-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100"><Truck className="w-4 h-4 text-sky-500" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">أسرع توصيل</p>
                  <p className="text-[10px] font-black text-slate-800 tracking-tighter">حي المعادي</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
