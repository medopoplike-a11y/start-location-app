"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { subscribeToOrders, subscribeToProfiles, subscribeToWallets, subscribeToSettlements } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { cleanupBroadcastChannel } from "@/lib/native-utils";

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
   * DEBOUNCED SYNC — 100ms debounce for snappy real-time feel while still
   * grouping burst updates (e.g. driver location flood) into a single render.
   */
  const triggerUpdate = useCallback((payload?: any) => {
    if (!isMountedRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsSyncing(true);
      if (onUpdateRef.current) onUpdateRef.current(payload);
      setLastSync(new Date());
      setTimeout(() => { if (isMountedRef.current) setIsSyncing(false); }, 500);
      syncTimeoutRef.current = null;
    }, 100);
  }, []);

  /**
   * SELF-HEALING: Cleanup all zombie channels before re-subscribing.
   * Only removes channels owned by this hook — never destroys the singleton
   * driver broadcast channel managed by native-utils.ts.
   */
  const cleanupChannels = useCallback(async () => {
    if (channelsRef.current.length > 0) {
      console.log(`useSync: Terminating ${channelsRef.current.length} active channels...`);
      for (const ch of channelsRef.current) {
        try { await supabase.removeChannel(ch); } catch (_) {}
      }
      channelsRef.current = [];
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!userId || !isMountedRef.current) return;

    await cleanupChannels();

    console.log("useSync: Establishing real-time streams...");

    const newChannels: RealtimeChannel[] = [];

    // ─── 1. Orders channel ────────────────────────────────────────────────────
    // FIX: subscribeToOrders(callback, filterId?) — callback MUST be the first arg.
    // Previous code had arguments swapped which silently broke all real-time order
    // updates for vendors, drivers, and admins.
    const orderChannel = subscribeToOrders(
      (payload: any) => {
        triggerUpdate({ source: 'orders', event: payload?.eventType, payload });
      },
      isAdmin ? undefined : userId   // filterId: undefined = all orders (admin), userId = own orders
    );
    // NOTE: subscribeToOrders already calls .subscribe() internally.
    // Do NOT call .subscribe() again — that would cause a duplicate subscription.
    newChannels.push(orderChannel);

    // ─── 2. Profiles channel ──────────────────────────────────────────────────
    const profileChannel = subscribeToProfiles((payload) => {
      const changedProfile = payload.new || payload.payload?.new;
      const changedId = changedProfile?.id;

      // Admin: route driver location broadcasts separately for the live map
      if (isAdmin && payload.eventType === 'UPDATE' && changedProfile?.location) {
        triggerUpdate({
          source: 'location_update',
          payload: {
            id: changedId,
            name: changedProfile.full_name, // V1.2.6: Pass name on profile update
            location: changedProfile.location,
            is_online: changedProfile.is_online,
            full_name: changedProfile.full_name,
            last_location_update: changedProfile.last_location_update || new Date().toISOString()
          }
        });
        return;
      }

      // Non-admin driver: only care about their own profile
      // Non-admin vendor: care about own profile AND all driver profiles
      //   so that is_online / is_locked changes trigger a data refresh.
      const isOwnProfile = changedId === userId;
      const isDriverProfile = payload.source === 'broadcast'
        ? true // broadcast already filtered by subscribeToProfiles
        : changedProfile?.role === 'driver' || isOwnProfile;

      if (!isAdmin && !isOwnProfile && !isDriverProfile) return;

      // Skip pure high-frequency location pings from drivers (no is_online change)
      // to avoid flooding the vendor/driver UI with unnecessary re-renders.
      const oldProfile = payload.old;
      const isLocationOnlyUpdate =
        changedProfile?.location &&
        oldProfile?.is_online === changedProfile?.is_online &&
        oldProfile?.is_locked === changedProfile?.is_locked;
      if (!isAdmin && !isOwnProfile && isLocationOnlyUpdate) return;

      triggerUpdate({ source: 'profiles', event: payload.eventType, table: 'profiles', payload });
    });
    newChannels.push(profileChannel);

    // ─── 3. Wallet & Settlements ──────────────────────────────────────────────
    const walletChannel = subscribeToWallets(userId, () => {
      triggerUpdate({ source: 'wallets' });
    });
    newChannels.push(walletChannel);

    const settlementChannel = subscribeToSettlements(userId, () => {
      triggerUpdate({ source: 'settlements' });
    });
    newChannels.push(settlementChannel);

    // ─── 4. System broadcast — instant cross-interface sync ───────────────────
    // updateOrderStatus() broadcasts to 'system_sync' whenever an order status
    // changes. All interfaces listen here for zero-lag cross-device sync.
    const systemSyncChannel = supabase.channel('system_sync');
    systemSyncChannel
      .on('broadcast', { event: 'sync-update' }, (msg) => {
        triggerUpdate({ source: 'system_sync', payload: msg.payload });
      })
      .on('broadcast', { event: 'app_wake_up' }, () => {
        // V1.8.0: Radical wake-up detected. Force full re-subscribe to all channels.
        console.log("useSync: RADICAL WAKE-UP event received. Re-subscribing...");
        subscribe(); 
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn("useSync: system_sync channel error, will retry via heartbeat");
        }
      });
    newChannels.push(systemSyncChannel);

    // ─── 5. Admin-only: driver location broadcasts ────────────────────────────
    if (isAdmin) {
      const driverLocChannel = supabase.channel('global:driver-locations');
      driverLocChannel
        .on('broadcast', { event: 'location_update' }, (msg) => {
          if (!msg.payload?.id) return;
          triggerUpdate({
            source: 'location_update',
            payload: {
              id: msg.payload.id,
              name: msg.payload.name, // V1.2.6: Pass name to registry
              location: msg.payload.location,
              is_online: true,
              last_location_update: new Date().toISOString(),
              ts: msg.payload.ts || Date.now()
            }
          });
        })
        .subscribe((status) => {
          console.log(`useSync: driver-locations → ${status}`);
        });
      newChannels.push(driverLocChannel);
    }

    channelsRef.current = newChannels;
    triggerUpdate({ source: 'initial_subscribe' });
  }, [userId, isAdmin, triggerUpdate, cleanupChannels]);

  // ─── Initial subscription + heartbeat ─────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    subscribe();

    // Heartbeat every 90 seconds — forces a data refresh to recover from any
    // dropped real-time messages (network switch, background throttle, etc.)
    const heartbeat = setInterval(() => {
      console.log("useSync: Heartbeat — forcing full refresh");
      triggerUpdate({ source: 'heartbeat' });
    }, 90 * 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(heartbeat);
      cleanupChannels();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [userId, subscribe, cleanupChannels]);

  // ─── Visibility / App-state listeners ─────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("useSync: App visible — Radical self-healing...");
        setIsSyncing(true);
        try {
          // 1. Re-authenticate session
          await supabase.auth.refreshSession();
          // 2. Re-subscribe to all channels
          await subscribe();
          // 3. Force update UI
          triggerUpdate({ source: 'app_resume' });
        } catch (e) {
          console.error("useSync: Visibility healing failed", e);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    const handleFocus = () => triggerUpdate({ source: 'focus' });

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    let appStateListener: any;
    let networkListener: any;

    const setupCapacitor = async () => {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { App } = await import("@capacitor/app");
        const { Network } = await import("@capacitor/network");

        appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            console.log("useSync: App foregrounded — restoring state...");

            // 1. Immediate UI refresh so user sees content instantly
            triggerUpdate({ source: 'app_resume' });

            try {
              // 2. Reconnect everything in parallel for speed
              await Promise.all([
                supabase.auth.refreshSession().catch(e => console.warn("useSync: Session refresh failed", e)),
                cleanupBroadcastChannel(),
                (async () => {
                  if (!supabase.realtime.isConnected()) supabase.realtime.connect();
                })(),
              ]);

              // 3. Re-subscribe with fresh channels
              await subscribe();
              triggerUpdate({ source: 'app_resume_complete' });
            } catch (e) {
              console.error("useSync: Restore error", e);
            }
          }
        });

        networkListener = await Network.addListener('networkStatusChange', async (status) => {
          if (status.connected) {
            console.log("useSync: Network restored — re-syncing...");
            await subscribe();
            triggerUpdate({ source: 'network_restore' });
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
  }, [triggerUpdate, subscribe, cleanupChannels]);

  return { lastSync, isSyncing, triggerUpdate };
};
