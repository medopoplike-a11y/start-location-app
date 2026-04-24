"use client";

import React from "react";

// Futuristic 3D Glass Logo Component
export function StartLogo({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 130" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
        <linearGradient id="grad-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
        
        <filter id="futuristic-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g>
        {/* Modern Fluid Pin Shape */}
        {/* Layer 1 - Outer Blue */}
        <path 
          d="M50 5C30.67 5 15 20.67 15 40C15 55 50 120 50 120C50 120 85 55 85 40C85 20.67 69.33 5 50 5Z" 
          fill="url(#grad-blue)" 
        />
        
        {/* Layer 2 - Inner Red Accent */}
        <path 
          d="M50 20C38.95 20 30 28.95 30 40C30 48 50 85 50 85C50 85 70 48 70 40C70 28.95 61.05 20 50 20Z" 
          fill="url(#grad-red)" 
        />

        {/* Layer 3 - Core Yellow Point */}
        <path 
          d="M50 35C47.24 35 45 37.24 45 40C45 42 50 55 50 55C50 55 55 42 55 40C55 37.24 52.76 35 50 35Z" 
          fill="url(#grad-yellow)" 
        />

        {/* Center Point - White Glow */}
        <circle cx="50" cy="40" r="5" fill="white" />
      </g>
    </svg>
  );
}
