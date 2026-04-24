"use client";

import React from "react";
import { motion } from "framer-motion";

interface LocationMarkerProps {
  className?: string;
  size?: number;
  color?: string;
  pulse?: boolean;
}

const LocationMarker: React.FC<LocationMarkerProps> = ({ 
  className = "", 
  size = 32, // Increased default size
  color = "#3B82F6", 
  pulse = true 
}) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {pulse && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0.5 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="absolute rounded-full"
          style={{ 
            width: size, 
            height: size, 
            backgroundColor: color 
          }}
        />
      )}
      
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 filter drop-shadow-xl"
      >
        {/* New Fluid/Modern Pin Shape */}
        {/* Layer 1 - Outer Blue */}
        <path 
          d="M50 5C30.67 5 15 20.67 15 40C15 55 50 120 50 120C50 120 85 55 85 40C85 20.67 69.33 5 50 5Z" 
          fill={color}
          className="drop-shadow-md"
        />
        {/* Layer 2 - Inner Red Accent */}
        <path 
          d="M50 20C38.95 20 30 28.95 30 40C30 48 50 85 50 85C50 85 70 48 70 40C70 28.95 61.05 20 50 20Z" 
          fill="#EF4444" 
        />
        {/* Layer 3 - Core Yellow Point */}
        <path 
          d="M50 35C47.24 35 45 37.24 45 40C45 42 50 55 50 55C50 55 55 42 55 40C55 37.24 52.76 35 50 35Z" 
          fill="#FACC15" 
        />
        {/* Center - Glowing White Core */}
        <circle cx="50" cy="40" r="4" fill="white" className="animate-pulse" />
      </svg>
      
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-1 bg-black/20 rounded-full blur-[2px]"
        style={{ transform: "translate(-50%, 10px) scaleX(2.5)" }}
      />
    </div>
  );
};

export default LocationMarker;
