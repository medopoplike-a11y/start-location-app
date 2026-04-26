"use client";

import { Star } from "lucide-react";

interface RatingBadgeProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}

export default function RatingBadge({ rating, count, size = "sm", className = "" }: RatingBadgeProps) {
  if (rating === 0) return null;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`flex items-center gap-1 bg-amber-400/10 border border-amber-400/20 rounded-lg px-2 py-0.5 shadow-sm`}>
        <Star 
          size={size === "sm" ? 12 : 16} 
          className="fill-amber-400 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]" 
        />
        <span className={`font-black text-amber-600 dark:text-amber-400 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
          {rating.toFixed(1)}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
          ({count})
        </span>
      )}
    </div>
  );
}
