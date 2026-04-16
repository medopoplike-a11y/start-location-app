"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { subscribeToOrders, subscribeToProfiles, subscribeToWallets, subscribeToSettlements } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";

export const useSync = (userId?: string, onUpdate?: (payload?: any) => void, isAdmin: boolean = false) => {
  const [lastSync, setLastSync] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * V0.9.88: INDUSTRIAL GRADE DEBOUNCED SYNC
   * Prevents UI freezing by grouping rapid DB changes into single updates.
   */
  const triggerUpdate = useCallback((payload?: any) => {
    if (!isMountedRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsSyncing(true);
      if (onUpdateRef.current) onUpdateRef.current(payload);
      setLastSync(new Date());
      
      // Artificial delay for visual feedback, but doesn't block UI
      setTimeout(() => {
        if (isMountedRef.current) setIsSyncing(false);
      }, 800);\ 
      syncTimeoutRef.current = null;
    }, 400); 
  }, []);

  /**
   * SELF-HEALING: Cleanup all zombie channels before re-subscribing
   */
  const cleanupChannels = useCallback(async () => {
    if (channelsRef.current.length > 0) {
      console.log(`useSync: Cleaning up ${channelsRef.current.length} channels...`);
      await Promise.all(channelsRef.current.map(ch => supabase.removeChannel(ch)));
      channelsRef.current = [];
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!userId || !isMountedRef.current) return;
    
    await cleanupChannels();
    
    console.log("useSync: Initializing master subscription sequence...");
    
    const newChannels: RealtimeChannel[] = [];

    // 1. Orders Channel
    const orderChannel = subscribeToOrders(isAdmin ? undefined : userId, (payload) => {
      console.log("useSync: Order update received", payload.eventType);
      triggerUpdate({ source: 'orders', event: payload.eventType });
    });
    newChannels.push(orderChannel);

    // 2. Wallets Channel
    const walletChannel = subscribeToWallets(userId, () => {
      console.log("useSync: Wallet update received");
      triggerUpdate({ source: 'wallets' });
    });
    newChannels.push(walletChannel);

    // 3. Settlements Channel
    const settlementChannel = subscribeToSettlements(userId, () => {
      console.log("useSync: Settlement update received");
      triggerUpdate({ source: 'settlements' });
    });
    newChannels.push(settlementChannel);

    // 4. Admin Only: Profiles Channel
    if (isAdmin) {
      const profileChannel = subscribeToProfiles((payload) => {
        triggerUpdate({ source: 'profiles', event: payload.eventType });
      });
      newChannels.push(profileChannel);
    }

    channelsRef.current = newChannels;
    triggerUpdate({ source: 'initial_subscribe' });
  }, [userId, isAdmin, triggerUpdate, cleanupChannels]);

  useEffect(() => {
    isMountedRef.current = true;
    subscribe();

    // V0.9.88: SELF-HEALING HEARTBEAT
    // Every 5 minutes, force a full data refresh to ensure UI is perfectly in sync
    // even if real-time messages were dropped during network switches.
    const heartbeat = setInterval(() => {
      console.log("useSync: Heartbeat triggered full refresh");
      triggerUpdate({ source: 'heartbeat' });
    }, 5 * 60 * 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(heartbeat);
      cleanupChannels();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [userId, subscribe, cleanupChannels]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("useSync: App visible, triggering self-healing...");
        triggerUpdate({ source: 'visibility_change' });
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => triggerUpdate({ source: 'focus' }));

    let appStateListener: any;
    let networkListener: any;
    
    const setupCapacitor = async () => {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { App } = await import("@capacitor/app");
        const { Network } = await import("@capacitor/network");

        appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            console.log("useSync: App active, restoring system state...");
            try {
              // Force session refresh to prevent auth expiry
              await supabase.auth.refreshSession();
              
              // Ensure real-time socket is alive
              if (!supabase.realtime.isConnected()) {
                supabase.realtime.connect();
              }

              // Full re-subscribe to clear any potential zombie channels from background
              await subscribe();
              triggerUpdate({ source: 'app_resume' });
            } catch (e) {
              console.error("useSync: Restore error", e);
            }
          }
        });

        networkListener = await Network.addListener('networkStatusChange', (status) => {
          if (status.connected) {
            console.log("useSync: Network restored, re-syncing...");
            triggerUpdate({ source: 'network_restore' });
          }
        });
      }
    };

    setupCapacitor();

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      if (appStateListener) appStateListener.remove();
      if (networkListener) networkListener.remove();
    };
  }, [triggerUpdate, subscribe]);

  return { lastSync, isSyncing, triggerUpdate };
};
