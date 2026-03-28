"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { PremiumCard } from "@/components/PremiumCard";
import type { ActivityLogItem, OnlineDriver, VendorCard } from "../types";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

interface StatItem {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend: string;
  trendType: "positive" | "neutral";
  subtitle: string;
}

interface DashboardViewProps {
  activityLog: ActivityLogItem[];
  stats: StatItem[];
  onlineDrivers: OnlineDriver[];
  vendors: VendorCard[];
}

export default function DashboardView({ activityLog, stats, onlineDrivers, vendors }: DashboardViewProps) {
  return (
    <>
      {activityLog.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-[32px] p-4 flex flex-col gap-2 relative shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600" />
          <AnimatePresence mode="popLayout">
            {activityLog.map((log) => (
              <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-between items-center px-4 py-2 hover:bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-600" /><span className="text-xs font-bold text-gray-700">{log.text}</span></div>
                <span className="text-[10px] font-bold text-gray-400">{log.time}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, idx) => (
          <PremiumCard key={idx} title={stat.title} value={stat.value} icon={stat.icon} trend={stat.trend} trendType={stat.trendType} subtitle={stat.subtitle} delay={idx * 0.1} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden h-[400px]">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-gray-900">الخريطة الحية للمناديب</h3></div>
          <div className="flex-1 relative h-[330px]">
            <LiveMap
              drivers={onlineDrivers}
              vendors={vendors.flatMap((v) => (v.location?.lat != null && v.location?.lng != null) ? [{ id: v.id_full, name: v.name, lat: v.location.lat, lng: v.location.lng }] : [])}
              zoom={12}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>
    </>
  );
}
