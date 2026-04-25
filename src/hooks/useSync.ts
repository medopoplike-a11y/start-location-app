"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { subscribeToOrders } from "@/lib/api/orders";
import { subscribeToProfiles } from "@/lib/api/profiles";
import { subscribeToWallets, subscribeToSettlements } from "@/lib/api/wallets";
import { supabase, forceReconnectRealtime } from "@/lib/supabaseClient";
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
  const heartbeatChannelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const isSubscribingRef = useRef(false);
  const lastMessageTimeRef = useRef(Date.now());

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupChannels = useCallback(async () => {
    // V18.0.0: Clean up heartbeat channel first
    if (heartbeatChannelRef.current) {
      try {
        await supabase.removeChannel(heartbeatChannelRef.current);
        heartbeatChannelRef.current = null;
      } catch (e) {
        console.error("useSync: Error removing heartbeat channel", e);
      }
    }

    if (channelsRef.current.length > 0) {
      const count = channelsRef.current.length;
      console.log(`useSync: Cleaning up ${count} channels...`);
      
      // V17.9.8: Use Promise.all to ensure cleanup is handled as cleanly as possible
      const cleanupPromises = channelsRef.current.map(async (channel) => {
        try {
          await supabase.removeChannel(channel);
        } catch (e) {
          console.error("useSync: Error removing channel", e);
        }
      });
      
      await Promise.all(cleanupPromises);
      channelsRef.current = [];
    }
  }, []);

  /**
   * DEBOUNCED SYNC — 50ms debounce for ultra-snappy real-time feel while still
   * grouping burst updates into a single render.
   */
  const triggerUpdate = useCallback((payload?: any) => {
    if (!isMountedRef.current) return;
    
    // V19.0.6: Track last message time to detect ghost connections
    lastMessageTimeRef.current = Date.now();
    
    // V17.1.0: Allow forcing an update even for 'initial_subscribe'
    if (payload?.source === 'initial_subscribe' && !payload?.force) return;

    // V17.4.9: Critical updates are processed INSTANTLY without any debounce.
    if (payload?.source === 'system_sync' || payload?.source === 'new_order' || payload?.source === 'order_update' || payload?.source === 'location_update') {
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
      // V17.9.7: Reduced feedback delay for snappier feel
      setTimeout(() => { if (isMountedRef.current) setIsSyncing(false); }, 150);
      syncTimeoutRef.current = null;
    }, 40); // V17.9.7: Reduced from 50ms to 40ms for aggregate latency reduction
  }, []);

  const subscribe = useCallback(async () => {
    if (!userId || isSubscribingRef.current) return;
    
    // V18.0.1: Add a cooldown to subscribe to prevent rapid re-subscription loops
    const now = Date.now();
    const lastSub = (window as any).__lastSubscribeTime || 0;
    if (now - lastSub < 2000) {
      console.log("useSync: Subscribe in cooldown, skipping loop");
      return;
    }
    (window as any).__lastSubscribeTime = now;
    
    isSubscribingRef.current = true;
    try {
      await cleanupChannels();

      console.log("useSync: Establishing real-time streams for:", userId);

      // V17.7.2: Enhanced Reconnection Logic
      // Ensure socket is actually connected before subscribing
      if (!supabase.realtime.isConnected()) {
        console.log("useSync: Socket disconnected, attempting recovery...");
        supabase.realtime.connect();
        // Wait a bit for connection
        await new Promise(r => setTimeout(r, 1000));
      }

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
    const systemSyncChannel = supabase.channel('system_sync', {
      config: {
        broadcast: { self: false },
        presence: { key: userId },
      }
    });

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
      .subscribe((status) => {
        // V19.0.5: Premium Jittered Backoff Recovery
        if (status === 'SUBSCRIBED') {
          console.log("useSync: System sync channel active");
          (window as any).__systemSyncRetryCount = 0;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          // Skip retry if we are explicitly offline
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            console.log("useSync: System is offline, pausing recovery.");
            return;
          }

          const retryCount = ((window as any).__systemSyncRetryCount || 0) + 1;
          (window as any).__systemSyncRetryCount = retryCount;
          
          // Exponential backoff with jitter: (2^retry * 1000) + random(1000)
          const jitter = Math.random() * 1000;
          const delay = Math.min(Math.pow(2, retryCount) * 1000 + jitter, 60000); 
          
          console.warn(`useSync: Channel ${status}, PREMIUM retry #${retryCount} in ${Math.round(delay)}ms`);
          
          setTimeout(() => {
            if (isMountedRef.current && navigator.onLine) subscribe();
          }, delay);
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
    
    // V17.1.0: Force an immediate UI update after subscription to ensure 
    // the page fetches data even if no real-time event has occurred yet.
    triggerUpdate({ source: 'initial_subscribe', force: true });
    } finally {
      isSubscribingRef.current = false;
    }
  }, [userId, role, isAdmin, triggerUpdate, cleanupChannels]);

  // ─── Initial subscription + heartbeat + resume recovery ───────────────────
  useEffect(() => {
    isMountedRef.current = true;
    subscribe();

    // V17.9.4: Listen for app-resume-sync event from AuthProvider
    const handleResumeSync = () => {
      console.log("[useSyncV17.9.4] App resume sync triggered");
      onUpdate?.({ source: 'app_resume_start' });
    };

    // V17.9.9: Listen for global socket recovery event
    const handleSocketRecovered = () => {
      console.log("[useSyncV17.9.9] Socket recovered globally, re-subscribing...");
      if (isMountedRef.current) subscribe();
    };

    window.addEventListener('app-resume-sync', handleResumeSync);
    window.addEventListener('supabase-realtime-recovered', handleSocketRecovered);

    // V17.9.9: Persistent heartbeat channel to avoid resource leaks
    const heartbeat = setInterval(() => {
      // V19.0.5: Network Intelligence - Only run heartbeat if online and visible
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const now = Date.now();

      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isOnline) {
        // V19.0.6: Ghost Connection Detection
        // If no message received for 5 minutes, trigger a soft background refresh
        const silenceDuration = now - lastMessageTimeRef.current;
        if (silenceDuration > 5 * 60 * 1000) {
          console.log(`useSync: Ghost connection detected (${Math.round(silenceDuration/1000)}s silence), refreshing...`);
          triggerUpdate({ source: 'ghost_refresh', force: true });
        }

        // V19.0.6: Active Session Guard
        // Refresh session every 2 hours to ensure long-shift stability
        const lastSessionRefresh = (window as any).__lastSessionRefresh || 0;
        if (now - lastSessionRefresh > 2 * 60 * 60 * 1000) {
          (window as any).__lastSessionRefresh = now;
          console.log("useSync: Proactive session refresh for long-shift stability");
          supabase.auth.refreshSession().catch(() => {});
        }

        const isConnected = supabase.realtime.isConnected();
        
        if (isConnected) {
          // V18.0.1: Only ping if we have an active heartbeat channel
          if (heartbeatChannelRef.current) {
            heartbeatChannelRef.current.send({
              type: 'broadcast',
              event: 'ping',
              payload: { ts: Date.now(), userId }
            }).catch(() => {
              heartbeatChannelRef.current = null;
            });
          } else {
            // Create heartbeat channel only once, don't force reconnect if missing
            heartbeatChannelRef.current = supabase.channel(`heartbeat:${userId || 'anon'}`);
            heartbeatChannelRef.current.subscribe();
          }
        } else if (userId) {
          // V18.0.1: Be more conservative with force reconnect
          const now = Date.now();
          const lastReconnect = (window as any).__lastForceReconnect || 0;
          if (now - lastReconnect > 60000) { // 60s cooldown
            console.warn("[useSyncV19.0.5] Heartbeat detected dead socket, forcing reconnect");
            (window as any).__lastForceReconnect = now;
            forceReconnectRealtime();
          }
        }
      }
    }, 30 * 1000);

    // V19.0.5: Global Network State Listeners
    const handleOnline = () => {
      console.log("useSync: System back online, re-syncing...");
      subscribe();
    };
    const handleOffline = () => {
      console.warn("useSync: System offline, standing by.");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMountedRef.current = false;
      clearInterval(heartbeat);
      window.removeEventListener('app-resume-sync', handleResumeSync);
      window.removeEventListener('supabase-realtime-recovered', handleSocketRecovered);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanupChannels();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [userId, subscribe, cleanupChannels, triggerUpdate, onUpdate]);

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

      // V17.7.0: Smarter Sync Thresholds
      // Short background ( < 30s): Just verify socket, no full refresh needed
      // Medium background (30s - 5m): Soft sync (refresh session + reconnect if needed)
      // Long background ( > 5m): Hard sync (radical reset)
      const isHardSync = backgroundDuration > HARD_SYNC_THRESHOLD;
      const isSoftSync = backgroundDuration > 30 * 1000;
      
      console.log(`useSync: App Resume (${source}) — duration: ${Math.round(backgroundDuration/1000)}s, hardSync: ${isHardSync}`);
      
      // 1. Immediate UI refresh (Non-blocking)
      setIsSyncing(true);
      
      triggerUpdate({ 
        source: 'app_resume_start',
        isHardSync,
        backgroundDuration,
        preferCache: true 
      });

      // 2. Perform healing
      (async () => {
        try {
          if (isSoftSync || isHardSync) {
            const { refreshAppSession } = await import('@/lib/native-utils');
            await Promise.race([
              refreshAppSession(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000))
            ]).catch(() => {});
          }

          // V17.9.4: Radical Socket Recovery
          // Always reconnect socket on resume if it's dead or if it's a hard sync
          const isSocketDead = !supabase.realtime.isConnected();
          if (isHardSync || isSocketDead) {
            await forceReconnectRealtime();
          }

          // Always re-subscribe on resume to ensure we haven't missed channel updates
          await subscribe();
          
        } catch (e) {
          console.error("useSync: Resume healing failed", e);
        } finally {
          setIsSyncing(false);
          triggerUpdate({ 
            source: 'app_resume_complete', 
            isHardSync,
            preferCache: false 
          });
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
