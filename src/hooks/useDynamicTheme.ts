"use client";

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export const useDynamicTheme = () => {
  const { setTheme, theme, resolvedTheme } = useTheme();

  useEffect(() => {
    // V19.3.0: Dynamic theme based on time of day
    const updateThemeBasedOnTime = () => {
      const hour = new Date().getHours();
      // Night theme from 6 PM to 6 AM
      const isNight = hour >= 18 || hour < 6;
      
      // Only auto-switch if user hasn't manually set a preference or if system is set
      if (theme === 'system') {
        setTheme(isNight ? 'dark' : 'light');
      }
    };

    updateThemeBasedOnTime();
    
    // Check every hour
    const interval = setInterval(updateThemeBasedOnTime, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [theme, setTheme]);

  return { currentTheme: resolvedTheme };
};