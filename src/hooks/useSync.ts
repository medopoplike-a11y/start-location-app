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

  const cleanupChannels = useCallback(() => {
    if (channelsRef.current.length > 0) {
      console.log(`useSync: Cleaning up ${channelsRef.current.length} channels...`);
      channelsRef.current.forEach((channel) => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          console.error("useSync: Error removing channel", e);
        }
      });
      channelsRef.current = [];
    }
  }, []);

  /**
   * DEBOUNCED SYNC — 100ms debounce for snappy real-time feel while still
   * grouping burst updates (e.g. driver location flood) into a single render.
   */
  const triggerUpdate = useCallback((payload?: any) => {
    if (!isMountedRef.current) return;
    
    // V17.1.0: Allow forcing an update even for 'initial_subscribe'
    if (payload?.source === 'initial_subscribe' && !payload?.force) return;

    // V17.4.9: If it's a critical broadcast update, pass it through immediately
    // without waiting for the debounce to finish, to ensure zero-latency feel.
    if (payload?.source === 'system_sync' || payload?.source === 'new_order' || payload?.source === 'order_update') {
      if (onUpdateRef.current) onUpdateRef.current(payload);
      setLastSync(new Date());
      return;
    }

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

  const subscribe = useCallback(() => {
    if (!userId) return;
    cleanupChannels();

    console.log("useSync: Establishing real-time streams for:", userId);

    const newChannels: RealtimeChannel[] = [];

    // ─── 1. Orders channel ────────────────────────────────────────────────────
    // V17.4.9: Enhanced callback to pass the actual record for partial updates
    const orderChannel = subscribeToOrders(
      (payload: any) => {
        triggerUpdate({ 
          source: 'orders', 
          event: payload?.eventType, 
          payload,
          order: payload.new || payload.payload?.new // Pass the new record data
        });
      },
      isAdmin ? undefined : userId,
      role,
    );
    newChannels.push(orderChannel);

    // ─── 2. Profiles channel ──────────────────────────────────────────────────
    // V17.4.7: Server-side filter — non-admins only listen to their OWN profile.
    const profileChannel = subscribeToProfiles((payload) => {
      const changedProfile = payload.new || payload.payload?.new;
      const changedId = changedProfile?.id;

      // Admin: route driver location broadcasts separately for the live map
      if (isAdmin && payload.eventType === 'UPDATE' && changedProfile?.location) {
        triggerUpdate({
          source: 'location_update',
          payload: {
            id: changedId,
            name: changedProfile.full_name,
            location: changedProfile.location,
            is_online: changedProfile.is_online,
            full_name: changedProfile.full_name,
            last_location_update: changedProfile.last_location_update || new Date().toISOString()
          }
        });
        return;
      }

      const isOwnProfile = changedId === userId;
      const isDriverProfile = payload.source === 'broadcast'
        ? true 
        : changedProfile?.role === 'driver' || isOwnProfile;

      if (!isAdmin && !isOwnProfile && !isDriverProfile) return;

      // Skip pure high-frequency location pings from drivers (no is_online change)
      const oldProfile = payload.old;
      const isLocationOnlyUpdate =
        changedProfile?.location &&
        oldProfile?.is_online === changedProfile?.is_online &&
        oldProfile?.is_locked === changedProfile?.is_locked;
      if (!isAdmin && !isOwnProfile && isLocationOnlyUpdate) return;

      triggerUpdate({ 
        source: 'profiles', 
        event: payload.eventType, 
        table: 'profiles', 
        payload,
        profile: changedProfile // Pass the profile data
      });
    }, { role, userId });
    newChannels.push(profileChannel);

    // ─── 3. Wallet & Settlements ──────────────────────────────────────────────
    const walletChannel = subscribeToWallets(userId, (payload) => {
      triggerUpdate({ source: 'wallets', payload });
    });
    newChannels.push(walletChannel);

    const settlementChannel = subscribeToSettlements(userId, (payload) => {
      triggerUpdate({ source: 'settlements', payload });
    });
    newChannels.push(settlementChannel);

    // ─── 4. System sync — instant cross-interface coordination ───────────────────
    const systemSyncChannel = supabase.channel('system_sync');
    systemSyncChannel
      .on('broadcast', { event: 'sync-update' }, (msg) => {
        // V17.4.9: Handle structured broadcast updates (new_order, order_update)
        triggerUpdate({ 
          source: msg.payload?.source || 'system_sync', 
          payload: msg.payload,
          order: msg.payload?.order,
          orderId: msg.payload?.orderId
        });
      })
      .on('broadcast', { event: 'system_alert' }, (msg) => {
        console.log("useSync: GLOBAL ALERT received:", msg.payload?.message);
        triggerUpdate({ source: 'broadcast', payload: { type: 'system_alert', ...msg.payload } });
      })
      .on('broadcast', { event: 'maintenance_mode' }, (msg) => {
        console.log("useSync: MAINTENANCE MODE update:", msg.payload?.active);
        triggerUpdate({ source: 'broadcast', payload: { type: 'maintenance', ...msg.payload } });
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
    const backgroundTimeRef = { current: 0 };
    // V17.5.0: Hard Sync Threshold - 5 minutes.
    // If the app was backgrounded for longer than this, we treat it as a cold boot
    // and force a complete data refresh to avoid stale UI state.
    const HARD_SYNC_THRESHOLD = 5 * 60 * 1000; 
    const RESUME_COOLDOWN = 8000;

    // V17.6.1: Full Socket Teardown & OS Port Release
    const handleResume = async (source: string) => {
      const now = Date.now();
      const backgroundDuration = backgroundTimeRef.current > 0 ? now - backgroundTimeRef.current : 0;
      backgroundTimeRef.current = 0; // Reset

      if (now - lastResumeTime < RESUME_COOLDOWN) return;
      lastResumeTime = now;

      const isHardSync = backgroundDuration > HARD_SYNC_THRESHOLD;
      console.log(`useSync: App Resume (${source}) — duration: ${Math.round(backgroundDuration/1000)}s, hardSync: ${isHardSync}`);
      
      // 1. Immediate UI refresh (Non-blocking)
      setIsSyncing(true);
      
      // V17.6.1: Emit 'cache_first_refresh' to pages to show local data immediately
      triggerUpdate({ 
        source: 'app_resume_start',
        isHardSync,
        backgroundDuration,
        preferCache: true // Hint to use SQLite first
      });

      // 2. Perform healing in background
      (async () => {
        try {
          const { refreshAppSession } = await import('@/lib/native-utils');
          
          // V17.6.1: Parallelized healing with safety timeouts
          const sessionPromise = refreshAppSession();
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Session refresh timed out")), 5000));
          
          await Promise.race([sessionPromise, timeoutPromise]).catch(e => console.warn("useSync: Session refresh slow/failed", e));

          // V17.6.1: Forceful Channel & Socket Teardown
          console.log("useSync: Performing radical socket reset...");
          cleanupChannels();
          
          // If the socket reports connected but we've been gone for 5 mins, it's a ghost connection
          if (supabase.realtime.isConnected() && isHardSync) {
            supabase.realtime.disconnect();
          }

          if (!supabase.realtime.isConnected()) {
            await new Promise(r => setTimeout(r, 500));
            supabase.realtime.connect();
          }

          // Re-subscribe and trigger full remote fetch
          await subscribe();
          
          triggerUpdate({ 
            source: 'app_resume_complete', 
            isHardSync,
            preferCache: false // Now we want fresh remote data
          });
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
      } else {
        backgroundTimeRef.current = Date.now();
      }
    };

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
          } else {
            backgroundTimeRef.current = Date.now();
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
