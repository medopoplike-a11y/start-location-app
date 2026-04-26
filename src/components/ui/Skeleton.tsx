"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = "" }: SkeletonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={`bg-slate-200 rounded-md ${className}`}
    />
  );
};

export const CardSkeleton = ({ className = "" }: SkeletonProps) => (
  <div className={`bg-white/70 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-4 ${className}`}>
    <div className="flex justify-between items-start">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="w-14 h-14 rounded-2xl" />
    </div>
  </div>
);

export const OrderSkeleton = () => (
  <div className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
      <Skeleton className="h-8 w-16 rounded-2xl" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <Skeleton className="h-12 rounded-[22px]" />
      <Skeleton className="h-12 rounded-[22px]" />
    </div>
    <Skeleton className="h-12 w-full rounded-2xl" />
  </div>
);

export const AdminSkeleton = () => (
  <div className="space-y-6 animate-pulse p-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
    <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-slate-50 pb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-2xl" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-50">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <CardSkeleton className="bg-blue-50/50 border-blue-100/50" />
      <CardSkeleton className="bg-emerald-50/50 border-emerald-100/50" />
      <CardSkeleton className="bg-amber-50/50 border-amber-100/50" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-start">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="h-64 bg-slate-50 rounded-[32px] flex items-center justify-center">
          <Skeleton className="w-full h-full rounded-[32px]" />
        </div>
      </div>
    </div>
  </div>
);
