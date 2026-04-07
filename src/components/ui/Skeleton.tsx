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
