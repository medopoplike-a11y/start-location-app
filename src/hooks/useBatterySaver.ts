'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

interface BatterySaverConfig {
  enabled: boolean;
  distanceFilter: number;
  updateInterval: number;
  pauseTrackingAfter: number; // in minutes
}

const DEFAULT_CONFIG: BatterySaverConfig = {
  enabled: false,
  distanceFilter: 50, // meters (normal mode)
  updateInterval: 60, // seconds
  pauseTrackingAfter: 60 // 1 hour
};

export function useBatterySaver() {
  const [config, setConfigState] = useState<BatterySaverConfig>(DEFAULT_CONFIG);
  const [isInBatteryMode, setIsInBatteryMode] = useState(false);
  const [lastDriverActivity, setLastDriverActivity] = useState<number>(Date.now());
  const isPausedRef = useRef(false);

  // Load config from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('batterySaverConfig');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfigState({ ...DEFAULT_CONFIG, ...parsed });
        } catch {
          setConfigState(DEFAULT_CONFIG);
        }
      }
    }
  }, []);

  // Save config to localStorage when it changes
  const setConfig = useCallback((newConfig: Partial<BatterySaverConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfigState(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('batterySaverConfig', JSON.stringify(updated));
    }
  }, [config]);

  // Toggle battery saver mode
  const toggleBatterySaver = useCallback(() => {
    const newEnabled = !config.enabled;
    setConfig({ enabled: newEnabled });
    
    if (newEnabled) {
      console.log('🔋 [BatterySaver] Battery saver mode enabled');
      applyBatteryOptimizations();
    } else {
      console.log('⚡ [BatterySaver] Battery saver mode disabled');
      resetToNormalMode();
    }
    
    setIsInBatteryMode(newEnabled);
  }, [config.enabled, setConfig]);

  // Record driver activity (e.g., when they accept an order or update location)
  const recordActivity = useCallback(() => {
    setLastDriverActivity(Date.now());
    isPausedRef.current = false;
  }, []);

  // Apply battery optimizations
  const applyBatteryOptimizations = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Increase distance filter to reduce GPS updates
      if (window.BackgroundGeolocation) {
        await window.BackgroundGeolocation.setConfig({
          distanceFilter: 100, // 100 meters instead of 50
          desiredAccuracy: 100, // Less accurate but more efficient
          interval: 60000, // 1 minute
          fastestInterval: 30000, // 30 seconds minimum
        });
      }

      console.log('🔋 [BatterySaver] Optimizations applied');
    } catch (e) {
      console.warn('[BatterySaver] Failed to apply optimizations', e);
    }
  }, []);

  // Reset to normal mode
  const resetToNormalMode = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      if (window.BackgroundGeolocation) {
        await window.BackgroundGeolocation.setConfig({
          distanceFilter: config.distanceFilter,
          desiredAccuracy: 10, // High accuracy
          interval: 10000, // 10 seconds
          fastestInterval: 5000, // 5 seconds minimum
        });
      }

      console.log('⚡ [BatterySaver] Normal mode restored');
    } catch (e) {
      console.warn('[BatterySaver] Failed to reset to normal mode', e);
    }
  }, [config.distanceFilter]);

  // Auto-pause tracking after inactivity
  useEffect(() => {
    if (!config.enabled) return;

    const checkActivity = setInterval(() => {
      const inactiveTime = (Date.now() - lastDriverActivity) / 1000 / 60; // minutes
      
      if (inactiveTime > config.pauseTrackingAfter && !isPausedRef.current) {
        isPausedRef.current = true;
        console.log('🔋 [BatterySaver] Pausing tracking due to inactivity');
        
        if (Capacitor.isNativePlatform() && window.BackgroundGeolocation) {
          window.BackgroundGeolocation.stop();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkActivity);
  }, [config.enabled, config.pauseTrackingAfter, lastDriverActivity]);

  // Resume tracking when app comes to foreground
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const resumeListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && isPausedRef.current && config.enabled) {
        isPausedRef.current = false;
        recordActivity();
        console.log('🔋 [BatterySaver] Resuming tracking');
        
        if (window.BackgroundGeolocation) {
          window.BackgroundGeolocation.start();
        }
      }
    });

    return () => {
      resumeListener.then(l => l.remove());
    };
  }, [config.enabled, recordActivity]);

  return {
    config,
    setConfig,
    isInBatteryMode,
    toggleBatterySaver,
    recordActivity,
    isPaused: isPausedRef.current,
  };
}