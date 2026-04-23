"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { subscribeToOrders } from "@/lib/api/orders";
import { subscribeToProfiles } from "@/lib/api/profiles";
import { subscribeToWallets, subscribeToSettlements } from "@/lib/api/wallets";
import { supabase } from "@/lib/supabaseClient";
import { cleanupBroadcastChannel } from "@/lib/native-utils";

export const useSync = (
  userId?: string,
  onUpdate?: (payload?: any) => void,
  // V17.4.6: Accept the actual role so order subscriptions are properly scoped.
  // Backwards-compat: a boolean `true` is treated as 'admin' to avoid breaking
  // any callers that may still pass `isAdmin`.
  roleOrIsAdmin: 'admin' | 'vendor' | 'driver' | boolean = 'admin',
) => {
  const role: 'admin' | 'vendor' | 'driver' =
    typeof roleOrIsAdmin === 'boolean'
      ? (roleOrIsAdmin ? 'admin' : 'admin')
      : roleOrIsAdmin;
  const isAdmin = role === 'admin';
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
    
    // V17.1.0: Allow forcing an update even for 'initial_subscribe'
    if (payload?.source === 'initial_subscribe' && !payload?.force) return;

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

    // V16.1.0: Radical debounce for re-subscriptions
    const now = Date.now();
    const lastSubTime = (window as any)._LAST_SUB_TIME || 0;
    if (now - lastSubTime < 5000 && (window as any)._LAST_SYNC_USER_ID === userId) {
      console.log("useSync: Skipping rapid re-subscription (throttle)");
      return;
    }
    (window as any)._LAST_SUB_TIME = now;

    await cleanupChannels();
    (window as any)._LAST_SYNC_USER_ID = userId;

    console.log("useSync: Establishing real-time streams for:", userId);

    const newChannels: RealtimeChannel[] = [];

    // ─── 1. Orders channel ────────────────────────────────────────────────────
    // FIX: subscribeToOrders(callback, filterId?) — callback MUST be the first arg.
    // Previous code had arguments swapped which silently broke all real-time order
    // updates for vendors, drivers, and admins.
    // V17.4.6: Pass the actual role so subscribeToOrders applies the correct
    // postgres filter (vendor_id=eq.X for vendors, driver_id=eq.X for drivers).
    // Without this, every vendor/driver was receiving ALL order changes in the
    // system, causing massive cross-talk between unrelated user interfaces.
    const orderChannel = subscribeToOrders(
      (payload: any) => {
        triggerUpdate({ source: 'orders', event: payload?.eventType, payload });
      },
      isAdmin ? undefined : userId,
      role,
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

    // ─── 4. System sync — instant cross-interface coordination ───────────────────
    const systemSyncChannel = supabase.channel('system_sync');
    systemSyncChannel
      .on('broadcast', { event: 'sync-update' }, (msg) => {
        triggerUpdate({ source: 'system_sync', payload: msg.payload });
      })
      .on('broadcast', { event: 'system_alert' }, (msg) => {
        // V17.2.7: Unified Global Alerts
        console.log("useSync: GLOBAL ALERT received:", msg.payload?.message);
        triggerUpdate({ source: 'broadcast', payload: { type: 'system_alert', ...msg.payload } });
      })
      .on('broadcast', { event: 'maintenance_mode' }, (msg) => {
        // V17.2.7: Unified Maintenance Mode
        console.log("useSync: MAINTENANCE MODE update:", msg.payload?.active);
        triggerUpdate({ source: 'broadcast', payload: { type: 'maintenance', ...msg.payload } });
      })
      .on('broadcast', { event: 'app_wake_up' }, () => {
        console.log("useSync: RADICAL WAKE-UP event received. Re-subscribing...");
        subscribe(); 
      })
      .subscribe();
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
    
    // V17.1.0: Force an immediate UI update after subscription to ensure 
    // the page fetches data even if no real-time event has occurred yet.
    triggerUpdate({ source: 'initial_subscribe', force: true });
  }, [userId, role, isAdmin, triggerUpdate, cleanupChannels]);

  // ─── Initial subscription + heartbeat ─────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    subscribe();

    // V17.4.0: Silent heartbeat every 120s.
    // - Doubled interval (60s → 120s) to halve background load.
    // - No more forced UI refresh every minute (caused needless re-renders + flicker).
    // - Only re-connect on disconnect; do NOT tear down all 5 channels unless we
    //   were actually disconnected for 2 consecutive checks (debounce).
    let consecutiveDownChecks = 0;
    const heartbeat = setInterval(() => {
      const live = supabase.realtime.isConnected();
      if (live) {
        consecutiveDownChecks = 0;
        return; // healthy → do nothing, no re-render, no log spam
      }
      consecutiveDownChecks += 1;
      console.warn(`useSync: Heartbeat detected disconnect (#${consecutiveDownChecks})`);
      // First detection: try a soft reconnect only.
      try { supabase.realtime.connect(); } catch (_) {}
      // Only do a full re-subscribe after 2 consecutive failures (≥2 minutes down).
      if (consecutiveDownChecks >= 2) {
        console.warn("useSync: Persistent disconnect — full re-subscribe");
        subscribe();
        consecutiveDownChecks = 0;
      }
    }, 120 * 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(heartbeat);
      cleanupChannels();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [userId, subscribe, cleanupChannels, triggerUpdate]);

  // ─── Visibility / App-state listeners ─────────────────────────────────────
  useEffect(() => {
    let lastResumeTime = 0;
    // V17.4.0: Increased from 2s → 8s. Prevents the resume logic from firing
    // multiple times when a user quickly switches between apps or when the OS
    // sends overlapping visibility/focus/appState/network events.
    const RESUME_COOLDOWN = 8000;

    const handleResume = async (source: string) => {
      const now = Date.now();
      if (now - lastResumeTime < RESUME_COOLDOWN) return;
      lastResumeTime = now;

      console.log(`useSync: App Resume (${source}) — Self-healing...`);
      
      // 1. Immediate UI refresh (Non-blocking)
      setIsSyncing(true);
      triggerUpdate({ source: 'app_resume_start' });

      // 2. Perform healing in background without blocking the UI thread
      (async () => {
        try {
          const { refreshAppSession } = await import('@/lib/native-utils');
          
          // Parallelize connection restoration
          await Promise.all([
            refreshAppSession().catch(e => console.warn("useSync: Session refresh failed", e)),
            (async () => {
              if (!supabase.realtime.isConnected()) {
                supabase.realtime.connect();
              }
            })()
          ]);
          
          // Re-subscribe to all channels
          await subscribe();
          triggerUpdate({ source: 'app_resume_complete' });
        } catch (e) {
          console.error("useSync: Resume healing failed", e);
        } finally {
          setIsSyncing(false);
        }
      })();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResume('visibility');
      }
    };

    // V17.4.0: Removed the `focus` listener entirely.
    // It was firing a triggerUpdate on every window/tab focus change, causing
    // unnecessary refetches whenever the user tapped on the app. The
    // `visibilitychange` listener already covers the meaningful case
    // (app coming back to foreground), and Capacitor's appStateChange covers native.
    window.addEventListener('visibilitychange', handleVisibilityChange);

    let appStateListener: any;
    let networkListener: any;

    const setupCapacitor = async () => {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { App } = await import("@capacitor/app");
        const { Network } = await import("@capacitor/network");

        appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            handleResume('appState');
          }
        });

        networkListener = await Network.addListener('networkStatusChange', (status) => {
          if (status.connected) {
            console.log("useSync: Network restored — re-syncing...");
            handleResume('network');
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
  }, [triggerUpdate, subscribe, cleanupChannels]);

  return { lastSync, isSyncing, triggerUpdate };
};
