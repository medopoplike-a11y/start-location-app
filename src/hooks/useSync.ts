"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { subscribeToOrders, subscribeToProfiles, subscribeToWallets, subscribeToSettlements } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";

export const useSync = (userId?: string, onUpdate?: (payload?: any) => void, isAdmin: boolean = false) => {
  const [lastSync, setLastSync] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [presenceData, setPresenceData] = useState<Record<string, any>>({});
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerUpdate = useCallback((payload?: any) => {
    // Faster debounce for real-time feel (50ms instead of 100ms)
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      setIsSyncing(true);
      if (onUpdateRef.current) onUpdateRef.current(payload);
      setLastSync(new Date());
      setTimeout(() => setIsSyncing(false), 300); // Shorter feedback
      syncTimeoutRef.current = null;
    }, 50); 
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
    let ordersSub: RealtimeChannel | undefined;
    let profilesSub: RealtimeChannel | undefined;
    let walletSub: RealtimeChannel | undefined;
    let settlementsSub: RealtimeChannel | undefined;
    let syncChannel: RealtimeChannel | undefined;

    const subscribe = async () => {
      // Get user role to decide on subscription strategy
      let userRole: string | null = null;
      if (userId) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
        userRole = profile?.role || null;
      }

      // 1. Postgres Changes Subscriptions with intelligent filtering
      // For drivers, we don't want to filter by vendorId because they need to see ALL pending orders
      // and orders assigned to them. RLS will handle the security.
      const orderFilterId = (isAdmin || userRole === 'driver') ? undefined : userId;
      
      ordersSub = subscribeToOrders(triggerUpdate, orderFilterId);
      profilesSub = subscribeToProfiles(triggerUpdate, isAdmin ? undefined : userId);
      
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

      // 2. Presence & Broadcast
      syncChannel = supabase.channel('system_sync', {
        config: { presence: { key: userId || 'anonymous' } }
      });

      syncChannel
        .on('presence', { event: 'sync' }, () => {
          setPresenceData(syncChannel?.presenceState() || {});
        })
        .on('broadcast', { event: 'force_refresh' }, ({ payload }) => {
          if (payload.target === 'all' || payload.target === userId) {
            triggerUpdate();
          }
        })
        .on('broadcast', { event: 'sync-update' }, ({ payload }) => {
          console.log('useSync: Broadcast sync-update received', payload);
          triggerUpdate(payload);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && userId) {
            await syncChannel?.track({
              user_id: userId,
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    const unsubscribe = () => {
      if (ordersSub) supabase.removeChannel(ordersSub);
      if (profilesSub) supabase.removeChannel(profilesSub);
      if (walletSub) supabase.removeChannel(walletSub);
      if (settlementsSub) supabase.removeChannel(settlementsSub);
      if (syncChannel) supabase.removeChannel(syncChannel);
    };

    // Initial subscription
    subscribe();

    // Battery Saving: Unsubscribe when in background, Resubscribe in foreground
    let appStateListener: any;
    const setupLifecycle = async () => {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { App } = await import("@capacitor/app");
        appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            console.log("useSync: App active, resubscribing and forcing full sync...");
            unsubscribe(); // Clean up first
            subscribe();
            triggerUpdate({ force: true }); // Sync immediately on return
          } else {
            console.log("useSync: App background, unsubscribing to save battery...");
            unsubscribe();
          }
        });
      }
    };
    setupLifecycle();

    return () => {
      unsubscribe();
      if (appStateListener) appStateListener.remove();
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
