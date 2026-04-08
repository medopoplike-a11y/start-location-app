"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { subscribeToOrders, subscribeToProfiles, subscribeToWallets, subscribeToSettlements } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";

export const useSync = (userId?: string, onUpdate?: () => void, isAdmin: boolean = false) => {
  const [lastSync, setLastSync] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [presenceData, setPresenceData] = useState<Record<string, any>>({});
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerUpdate = useCallback(() => {
    // Debounce to prevent rapid multiple updates
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      setIsSyncing(true);
      if (onUpdateRef.current) onUpdateRef.current();
      setLastSync(new Date());
      setTimeout(() => setIsSyncing(false), 800);
      syncTimeoutRef.current = null;
    }, 300); // 300ms debounce
  }, []);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("useSync: App visible, triggering sync...");
        triggerUpdate();
      }
    };

    const handleFocus = () => {
      console.log("useSync: Window focus, triggering sync...");
      triggerUpdate();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Capacitor App State
    let appStateListener: any;
    let networkListener: any;
    
    const setupCapacitor = async () => {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { App } = await import("@capacitor/app");
        const { Network } = await import("@capacitor/network");

        appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            console.log("useSync: App became active (Capacitor), triggering sync...");
            triggerUpdate();
          }
        });

        networkListener = await Network.addListener('networkStatusChange', (status) => {
          if (status.connected) {
            console.log("useSync: Network connected, triggering sync...");
            triggerUpdate();
          }
        });
      }
    };
    setupCapacitor();

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (appStateListener) appStateListener.remove();
      if (networkListener) networkListener.remove();
    };
  }, [triggerUpdate]);

  useEffect(() => {
    // 1. Postgres Changes Subscriptions with intelligent filtering
    // Only subscribe to relevant orders for this user (or all if admin)
    const ordersSub: RealtimeChannel = subscribeToOrders(triggerUpdate, isAdmin ? undefined : userId);
    
    // For profiles, we only care about:
    // a. The user's own profile changes
    // b. Important global changes like online status (avoiding high-frequency location updates)
    const profilesSub: RealtimeChannel = subscribeToProfiles(triggerUpdate, isAdmin ? undefined : userId);
    
    let walletSub: RealtimeChannel | undefined;
    let settlementsSub: RealtimeChannel | undefined;
    
    if (isAdmin) {
      walletSub = supabase
        .channel('admin_all_wallets')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, triggerUpdate)
        .subscribe();
      
      settlementsSub = supabase
        .channel('admin_all_settlements')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, triggerUpdate)
        .subscribe();
    } else if (userId) {
      walletSub = subscribeToWallets(userId, triggerUpdate);
      settlementsSub = subscribeToSettlements(userId, triggerUpdate);
    }

    // 2. Presence & Broadcast for "X-Factor" Speed
    const syncChannel = supabase.channel('system_sync', {
      config: {
        presence: { key: userId || 'anonymous' }
      }
    });

    syncChannel
      .on('presence', { event: 'sync' }, () => {
        const state = syncChannel.presenceState();
        setPresenceData(state);
      })
      .on('broadcast', { event: 'force_refresh' }, ({ payload }) => {
        if (payload.target === 'all' || payload.target === userId) {
          triggerUpdate();
        }
      })
      /* 
      .on('broadcast', { event: 'system_alert' }, ({ payload }) => {
        if (payload.target === 'all' || payload.target === userId) {
          if (typeof window !== 'undefined' && (window as any).showSystemAlert) {
            (window as any).showSystemAlert(payload.message);
          }
        }
      })
      */
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && userId) {
          await syncChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(ordersSub);
      supabase.removeChannel(profilesSub);
      if (walletSub) supabase.removeChannel(walletSub);
      if (settlementsSub) supabase.removeChannel(settlementsSub);
      supabase.removeChannel(syncChannel);
    };
  }, [userId, isAdmin, triggerUpdate]);

  const broadcastRefresh = async (target: string = 'all') => {
    await supabase.channel('system_sync').send({
      type: 'broadcast',
      event: 'force_refresh',
      payload: { target, sender: userId }
    });
  };

  const broadcastAlert = async (message: string, target: string = 'all') => {
    // Disabled as per user request
    console.log('Broadcast Alert Suppressed:', message, target);
  };

  return { lastSync, isSyncing, triggerUpdate, presenceData, broadcastRefresh, broadcastAlert };
};
