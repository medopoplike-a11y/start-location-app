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
    // V0.9.68: Optimized debounce (300ms instead of 50ms) to prevent UI thrashing 
    // during many simultaneous updates
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      setIsSyncing(true);
      if (onUpdateRef.current) onUpdateRef.current(payload);
      setLastSync(new Date());
      setTimeout(() => setIsSyncing(false), 500); 
      syncTimeoutRef.current = null;
    }, 300); 
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

    // Capacitor App State & Network
    let appStateListener: any;
    let networkListener: any;
    
    const setupCapacitor = async () => {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { App } = await import("@capacitor/app");
        const { Network } = await import("@capacitor/network");

        appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            console.log("useSync: App became active, triggering ULTIMATE RESUME SYNC (V0.9.87)...");
            
            // 1. Force Refresh Session (V0.9.74)
            // getSession() might return stale data after long backgrounding
            try {
              const { data, error } = await supabase.auth.refreshSession();
              if (error) {
                console.warn("useSync: Session refresh failed, falling back to getSession", error);
                await supabase.auth.getSession();
              }
              
              // 2. Self-Healing Realtime: Check and Reconnect if necessary
              if (!supabase.realtime.isConnected()) {
                console.log("useSync: Realtime disconnected, reconnecting...");
                supabase.realtime.connect();
              }

              // 3. Force Re-subscribe to all channels to clear zombie connections
              await subscribe();
              
              // 4. Trigger UI Update
              triggerUpdate({ source: 'foreground_resume' });
            } catch (e) {
              console.error("useSync: Foreground resume fatal error", e);
            }
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
    let locationLogsSub: RealtimeChannel | undefined;
    let syncChannel: RealtimeChannel | undefined;

    const unsubscribe = () => {
      console.log("useSync: Unsubscribing all channels...");
      if (ordersSub) supabase.removeChannel(ordersSub);
      if (profilesSub) supabase.removeChannel(profilesSub);
      if (walletSub) supabase.removeChannel(walletSub);
      if (settlementsSub) supabase.removeChannel(settlementsSub);
      if (locationLogsSub) supabase.removeChannel(locationLogsSub);
      if (syncChannel) supabase.removeChannel(syncChannel);
    };

    const subscribe = async () => {
      // 1. Initial cleanup
      unsubscribe();
      
      console.log("useSync: Initializing subscriptions for userId:", userId);
      
      // Get user role to decide on subscription strategy
      let userRole: string | null = null;
      if (userId) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
        userRole = profile?.role || null;
      }

      // 1. Postgres Changes Subscriptions with intelligent filtering
      const filterId = isAdmin ? undefined : userId;
      const role: 'driver' | 'vendor' | 'admin' = isAdmin ? 'admin' : (userRole as any || 'admin');
      
      ordersSub = subscribeToOrders(triggerUpdate, filterId, role);
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

        // 3. Admin-only: Listen to ALL location logs for ultra-accurate movement
        locationLogsSub = supabase
          .channel('admin_location_stream')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'location_logs' }, triggerUpdate)
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

    // Initial subscription
    subscribe();

    // Removed the manual setupLifecycle (unsubscribe/resubscribe on background/foreground)
    // which was duplicated and causing performance issues.

    // Heartbeat to keep connection alive
    const interval = setInterval(() => {
      // V0.9.59: Only heartbeat if session is valid
      supabase.auth.getSession().then(({ data }) => {
        if (data.session && syncChannel && syncChannel.state === 'joined') {
          syncChannel.send({
            type: 'broadcast',
            event: 'heartbeat',
            payload: { timestamp: new Date().toISOString() }
          });
        }
      });
    }, 15000); // 15 seconds heartbeat for stability

    return () => {
      clearInterval(interval);
      unsubscribe();
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
