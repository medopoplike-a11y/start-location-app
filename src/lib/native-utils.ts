import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { supabase } from './supabaseClient';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { config } from './config';

// Constants for direct native API calls (V0.9.52)
const SUPABASE_URL = config.supabase.url;
const SUPABASE_KEY = config.supabase.anonKey;
const SESSION_KEY = 'start-location-v1-session';

/**
 * دالة للاستيقاظ وإعادة مزامنة الجلسة والقنوات الحية (V1.8.1)
 * تم دمجها مع useSync لضمان عدم حدوث تعارضات عند استيقاظ التطبيق
 */
export const refreshAppSession = async () => {
  try {
    console.log("App: RADICAL WAKE-UP starting...");
    
    // 1. Force refresh supabase session natively
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn("Session Refresh Error:", error);
    }

    // 2. Re-establish broadcast channel if dead
    await getBroadcastChannel();

    // V17.4.7: REMOVED `app_wake_up` broadcast.
    // useSync's visibility/appState handler already re-subscribes on resume,
    // and broadcasting `app_wake_up` on top of that caused a SECOND full
    // re-subscribe inside the same client (cascading channel rebuilds and
    // duplicated initial fetches → "stale data on return from background").

    return session;
  } catch (e) {
    console.warn("App Wake-up failed:", e);
    return null;
  }
};

/**
 * مستمع لحدث عودة التطبيق للواجهة (Resume)
 * V16.9.8: Simplified to avoid redundant session refreshes
 */
export const onAppResume = (callback: () => void) => {
  if (!isNative()) return () => {};
  
  const listener = App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      console.log("App: Foreground detected, notifying listeners...");
      callback();
    }
  });

  return () => {
    listener.then(l => l.remove());
  };
};

/**
 * دالة للاهتزاز البسيط عند النقر أو حدوث إجراء
 */
export const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style });
  } catch (e) {
    console.warn('Native: Haptics failed', e);
  }
};

/**
 * دالة لإظهار رسالة Native Toast
 */
export const showNativeToast = async (text: string) => {
  if (!isNative()) {
    console.log('Web Toast:', text);
    return;
  }
  try {
    await Toast.show({ text, duration: 'short', position: 'bottom' });
  } catch (e) {
    console.warn('Native: Toast failed', e);
  }
};

/**
 * دالة للتحقق مما إذا كان التطبيق يعمل كـ Native (Android/iOS)
 */
export const isNative = () => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

/**
 * دالة لحفظ البيانات في ذاكرة الهاتف الدائمة (Persistent Storage)
 */
export const setCache = async (key: string, value: any) => {
  try {
    const stringValue = JSON.stringify(value);
    if (isNative()) {
      await Preferences.set({ key, value: stringValue });
    } else {
      localStorage.setItem(key, stringValue);
    }
  } catch (e) {
    console.warn(`Cache: Failed to set ${key}`, e);
  }
};

/**
 * دالة لجلب البيانات من ذاكرة الهاتف
 * (تم تحسين الأداء لضمان الاستجابة الفورية)
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    let value: string | null = null;
    if (isNative()) {
      const result = await Preferences.get({ key });
      value = result.value;
    } else {
      value = localStorage.getItem(key);
    }
    return value ? JSON.parse(value) : null;
  } catch (e) {
    console.warn(`Cache: Failed to get ${key}`, e);
    return null;
  }
};

/**
 * دالة لطلب استثناء من تحسين البطارية (Battery Optimization Exemption)
 * هذا ضروري جداً للأندرويد لضمان عدم قتل التطبيق في الخلفية
 */
export const requestBatteryOptimizationExemption = async () => {
  if (!isNative()) return;
  
  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    
    if (info.platform === 'android') {
      // Direct intent to Battery Optimization settings
      // Note: This requires the user to manually find the app and set to "Don't optimize"
      // or "Unrestricted" depending on Android version.
      await showNativeToast("يرجى اختيار 'غير مقيد' (Unrestricted) للتطبيق لضمان عمله في الخلفية");
      setTimeout(() => {
        window.open('package:' + 'com.start.location', '_system'); // This might not work on all versions
        // Fallback to general battery settings if package direct fails
      }, 2000);
    }
  } catch (e) {
    console.warn('Native: Failed to request battery exemption', e);
  }
};

/**
 * دالة لطلب إذن الموقع عند الحاجة.
 */
export const requestLocationPermission = async () => {
  if (!isNative()) return;

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    return await Geolocation.requestPermissions();
  } catch (e) {
    console.warn('Native: Failed to request location permission', e);
  }
};

/**
 * دالة لطلب إذن الموقع في الخلفية عند بدء التتبع.
 */
export const requestBackgroundLocationPermission = async () => {
  if (!isNative()) return;

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    // For Android 10+, we MUST request backgroundLocation explicitly
    return await Geolocation.requestPermissions({ 
      permissions: ['location', 'coarseLocation', 'backgroundLocation'] 
    });
  } catch (e) {
    console.warn('Native: Failed to request background location permission', e);
  }
};

/**
 * دالة لطلب إذن الكاميرا والوسائط عند الحاجة.
 */
export const requestCameraPermissions = async () => {
  if (!isNative()) return;

  try {
    const { Camera } = await import('@capacitor/camera');
    return await Camera.requestPermissions();
  } catch (e) {
    console.warn('Native: Failed to request camera permissions', e);
  }
};

/**
 * دالة لطلب إذن التنبيهات عند الحاجة.
 */
export const requestPushNotificationPermissions = async () => {
  if (!isNative()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const pushStatus = await PushNotifications.requestPermissions();
    // Removed automatic registration to prevent native crash when Firebase is missing
    /*
    if (pushStatus.receive === 'granted') {
      await PushNotifications.register();
    }
    */
    return pushStatus;
  } catch (e) {
    console.warn('Native: Failed to request push notification permissions', e);
  }
};

/**
 * دالة طلب كافة الأذونات دفعة واحدة لا ينصح باستخدامها في بدء التطبيق.
 * يفضل استدعاء الأذونات حسب الوظيفة المطلوبة في واجهة المستخدم.
 */
export const requestAllPermissions = async () => {
  console.warn('Native: requestAllPermissions is deprecated. Request permissions on demand.');
  await requestLocationPermission();
  await requestCameraPermissions();
  await requestPushNotificationPermissions();
};

let lastCheckTime = 0;
let isChecking = false;
const CHECK_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown to prevent battery drain and server load

// ─── Singleton Broadcast Channel ───────────────────────────────────────────
// Re-using a single channel instance prevents the channel-leak bug where a new
// channel was created every 3-4 seconds, leaving hundreds of zombie connections.
let _broadcastChannel: ReturnType<typeof supabase.channel> | null = null;
let _broadcastReady = false;
let _broadcastReconnecting = false;

/**
 * Returns a live, SUBSCRIBED broadcast channel. If the existing channel is dead
 * (e.g. after a network drop or the socket disconnected in background) it is
 * torn down and rebuilt before returning, so callers always get a usable handle.
 */
const getBroadcastChannel = async (): Promise<ReturnType<typeof supabase.channel>> => {
  // If we have a channel that is already subscribed, return it immediately.
  if (_broadcastChannel && _broadcastReady) {
    return _broadcastChannel;
  }

  // Avoid concurrent reconnection attempts.
  if (_broadcastReconnecting) {
    // Wait briefly then return whatever we have.
    await new Promise(r => setTimeout(r, 500));
    return _broadcastChannel ?? supabase.channel('global:driver-locations');
  }

  _broadcastReconnecting = true;

  // Tear down the dead channel before creating a new one.
  if (_broadcastChannel) {
    try { await supabase.removeChannel(_broadcastChannel); } catch (_) {}
    _broadcastChannel = null;
    _broadcastReady = false;
  }

  _broadcastChannel = supabase.channel('global:driver-locations', {
    config: {
      broadcast: { self: true },
      presence: { key: 'online' }
    }
  });
  
  _broadcastChannel.subscribe((status) => {
      _broadcastReady = status === 'SUBSCRIBED';
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`Broadcast Channel Status: ${status}, rebuilding...`);
        _broadcastReady = false;
        _broadcastChannel = null;
      }
      _broadcastReconnecting = false;
    });

  return _broadcastChannel;
};

export const sendLocationBroadcast = async (
  userId: string,
  loc: { lat: number; lng: number; heading?: number; speed?: number; accuracy?: number },
  name?: string
) => {
  try {
    const ch = await getBroadcastChannel();
    if (_broadcastReady) {
      await ch.send({
        type: 'broadcast',
        event: 'location_update',
        payload: { id: userId, location: loc, name, ts: Date.now() }
      });
    }
  } catch (e) {
    // Silent – DB update is the authoritative source of truth
  }
};

export const cleanupBroadcastChannel = async () => {
  if (_broadcastChannel) {
    try { await supabase.removeChannel(_broadcastChannel); } catch (_) {}
    _broadcastChannel = null;
    _broadcastReady = false;
    _broadcastReconnecting = false;
  }
};

/**
 * Compares two semantic version strings numerically (e.g. "17.3.10" > "17.3.9").
 * Returns: 1 if a > b, -1 if a < b, 0 if equal.
 */
const compareVersions = (a: string, b: string): number => {
  const pa = a.replace(/^V/i, '').split('.').map(Number);
  const pb = b.replace(/^V/i, '').split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};

/**
 * V17.7.0: Full Stability Audit
 */
export const checkAppUpdate = async (currentVersion = '17.7.0', force = false) => {
  if (!isNative()) return { available: false, reason: 'NOT_NATIVE' };
  if (isChecking) return { available: false, reason: 'ALREADY_CHECKING' };

  const now = Date.now();
  if (!force && now - lastCheckTime < CHECK_COOLDOWN) {
    return { available: false, reason: 'COOLDOWN' };
  }
  
  isChecking = true;
  lastCheckTime = now;

  try {
    const { data: config, error: configError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (configError || !config) {
      return { available: false, reason: 'NO_CONFIG' };
    }

    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    
    const dbVersion = String(config.latest_version || '').trim();
    const bundleUrl = String(config.bundle_url || '').trim();

    const { value: appliedVersion } = await Preferences.get({ key: 'last_applied_ota_version' });
    
    console.log(`[Native-OTA] Local: ${appliedVersion} | DB: ${dbVersion}`);

    const normalizedDbVersion = dbVersion.replace(/^V/i, '').trim();
    const normalizedAppliedVersion = (appliedVersion || '').replace(/^V/i, '').trim();
    // V17.4.5: Now read from the build-injected NEXT_PUBLIC_APP_VERSION so we
    // never have to edit two places when bumping. Falls back to "0.0.0" if missing.
    const hardcodedVersion = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";

    // Already on this version
    if (compareVersions(normalizedDbVersion, hardcodedVersion) === 0 && !force) {
      return { available: false, version: dbVersion, reason: 'MATCHES_HARDCODED' };
    }

    // Already applied this OTA version
    if (normalizedAppliedVersion && compareVersions(normalizedAppliedVersion, normalizedDbVersion) === 0 && !force) {
      return { available: false, version: dbVersion, reason: 'SAME_VERSION' };
    }

    // DB version is older than our built-in code — prevent rollback
    if (compareVersions(normalizedDbVersion, hardcodedVersion) < 0 && !force) {
      console.warn(`[Native-OTA] DB version (${dbVersion}) is older than built-in (${hardcodedVersion}). Skipping.`);
      return { available: false, version: dbVersion, reason: 'PREVENT_ROLLBACK' };
    }

    if (!bundleUrl || !dbVersion) {
      console.warn('[Native-OTA] Missing bundle URL or version in config');
      return { available: false, reason: 'MISSING_CONFIG' };
    }

    console.log('[Native-OTA] Starting download:', bundleUrl);

    try {
      const bundle = await CapacitorUpdater.download({
        url: bundleUrl,
        version: dbVersion
      });
      
      console.log('[Native-OTA] Download complete. Bundle ready:', bundle.id);

      // Use next() instead of set() — critical difference:
      // set()  → switches bundle and restarts the app IMMEDIATELY (causes reload loop)
      // next() → marks bundle to be used on the NEXT cold start (no restart, no loop)
      await CapacitorUpdater.next({ id: bundle.id });
      await Preferences.set({ key: 'last_applied_ota_version', value: dbVersion });

      console.log('[Native-OTA] Bundle queued for next launch:', bundle.id);

      return {
        available: true,
        version: dbVersion,
        bundleId: bundle.id,
        downloaded: true,
        forceUpdate: !!config.force_update,
        updateMessage: String(config.update_message || 'تم تحميل تحديث جديد. سيُطبَّق عند فتح التطبيق القادم.')
      };
    } catch (downloadError: any) {
      console.error('[Native-OTA] Download failed:', downloadError);
      return { available: false, reason: 'DOWNLOAD_FAILED', error: downloadError.message };
    }
  } catch (e: any) {
    console.error('Native OTA: Fatal error:', e);
    return { available: false, reason: 'FATAL_ERROR', error: e.message };
  } finally {
    isChecking = false;
  }
};

/**
 * Helper: Get the freshest available access token.
 * Priority: live supabase session → Preferences cache → anon key (last resort).
 * This is critical for background tracking where the JS timer for auto-refresh
 * may be throttled by the OS, causing the token to silently expire.
 */
const getFreshAccessToken = async (): Promise<string> => {
  try {
    // 1. Try live session first (may auto-refresh if expired and network is available)
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  } catch (_) {}

  try {
    // 2. Force a refresh attempt
    const { data } = await supabase.auth.refreshSession();
    if (data.session?.access_token) return data.session.access_token;
  } catch (_) {}

  try {
    // 3. Fall back to searching for ANY supabase session in Preferences
    const { keys } = await Preferences.keys();
    // Look for keys like 'sb-xxxxx-auth-token' or the legacy custom key
    const authKey = keys.find(k => k.includes('auth-token') || k === SESSION_KEY);
    
    if (authKey) {
      const { value: sessionStr } = await Preferences.get({ key: authKey });
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.access_token) return session.access_token;
      }
    }
  } catch (_) {}

  // 4. Last resort: anon key (will only work if RLS allows it)
  return SUPABASE_KEY;
};

export const startBackgroundTracking = async (userId: string, name?: string, role: 'driver' | 'vendor' | 'admin' = 'driver', onUpdate?: (loc: {lat: number, lng: number}) => void) => {
  if (!isNative() || !userId) return null;

  // V17.4.3: HARD GUARD — only drivers get continuous background GPS tracking.
  // Vendors (stores) are fixed locations and update manually; admins don't need GPS.
  // This prevents any caller from accidentally re-enabling battery-draining
  // background location for non-driver roles.
  if (role !== 'driver') {
    console.log(`[BG-Tracking] Skipped for role="${role}" — only drivers are tracked continuously.`);
    return null;
  }

  try {
    const plugins = (Capacitor as unknown as { Plugins?: Record<string, any> }).Plugins;
    const BackgroundGeolocation = plugins?.BackgroundGeolocation;

    if (!BackgroundGeolocation) {
      console.warn('BackgroundGeolocation plugin not available.');
      return null;
    }

    // 1. Request necessary permissions
    const { Geolocation } = await import('@capacitor/geolocation');
    // For vendors/admins, we might not need high accuracy, but we need the background process
    const perm = await Geolocation.requestPermissions({ 
      permissions: ['location', 'coarseLocation', 'backgroundLocation'] 
    });
    
    if (perm.location !== 'granted') {
      console.warn('Location permission not granted');
      return null;
    }

    // V17.4.4: Natural-pace tracking — admin still gets live view but the
    // network and battery are no longer hammered.
    let lastDbUpdate = 0;
    const DB_UPDATE_INTERVAL = 8000;          // DB write at most every 8s
    let lastBroadcast = 0;
    const BROADCAST_INTERVAL = 4000;          // Realtime broadcast every 4s
    let lastLogInsert = 0;
    const LOG_INSERT_INTERVAL = 30 * 1000;    // History row every 30s (not 5s)

    let lastHeartbeatUpdate = 0;
    const HEARTBEAT_DB_INTERVAL = 90 * 1000;  // 1.5 minutes for heartbeat

    const bgMessage = role === 'driver' 
      ? "تتبع الموقع نشط لضمان وصول الطلبات بدقة — لا تغلق التطبيق"
      : "مزامنة البيانات نشطة في الخلفية لضمان استقبال التنبيهات";

    const bgTitle = role === 'driver'
      ? "ستارت: تتبع الموقع (وضع الاستمرارية)"
      : "ستارت: مزامنة البيانات (وضع الاستمرارية)";

    // V17.4.4: Driver tracking is continuous but at a NATURAL pace.
    // - GPS sample every 5s (was 1s) — admin sees a smooth live trail without spam
    // - 8m distance filter — won't fire on every step or GPS jitter
    // - 20m stationary radius — silent when driver is parked at a stop
    const mainWatcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: bgMessage,
        backgroundTitle: bgTitle,
        requestPermissions: true,
        staleLocationInterval: 10000,
        distanceFilter: 8,
        persist: true,
        forceAccuracy: true,
        stationaryRadius: 20,
        notificationTitle: bgTitle,
        notificationText: bgMessage,
        notificationIconColor: "#f97316",
        notificationImportance: 4,
        priority: 2,
        interval: 5000,
        fastestInterval: 3000,
        activitiesInterval: 10000,
        stopOnTerminate: false,
        startOnBoot: true,
        heartbeatInterval: 60,
        enableHeadless: true
      },
      async (location: any, error: any) => {
        if (error) {
          console.warn("BG Watcher Error:", error);
          return;
        }

        const now = Date.now();
        const isHeartbeat = !location || !location.latitude;

        if (!isHeartbeat && location.latitude && location.longitude) {
          if (role === 'driver' && location.accuracy && location.accuracy > 300) return;

          const loc = { 
            lat: location.latitude, 
            lng: location.longitude,
            heading: location.bearing || 0,
            speed: location.speed || 0,
            accuracy: location.accuracy || 0
          };
          if (onUpdate) onUpdate(loc);

          // V17.4.4: Throttle realtime broadcasts to BROADCAST_INTERVAL (4s).
          // Without this, GPS callbacks (every 5s natively but burst-prone) could
          // flood the realtime channel with multiple drivers broadcasting at once.
          if (role === 'driver' && now - lastBroadcast >= BROADCAST_INTERVAL) {
            lastBroadcast = now;
            sendLocationBroadcast(userId, loc, name);
          }

          if (now - lastDbUpdate < DB_UPDATE_INTERVAL) return;
          lastDbUpdate = now;
        } else if (isHeartbeat) {
          if (now - lastHeartbeatUpdate < HEARTBEAT_DB_INTERVAL) return;
          lastHeartbeatUpdate = now;
          console.log(`BG Tracker: Sending ${role} heartbeat...`);
        } else {
          return;
        }

        try {
          const accessToken = await getFreshAccessToken();
          const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          };

          const updateData: any = {
            is_online: true,
            last_location_update: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          if (location?.latitude) {
            updateData.location = { lat: location.latitude, lng: location.longitude, ts: now };
          }

          // Native update bypasses JS suspension
          const requests = [
            CapacitorHttp.patch({
              url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
              headers,
              data: updateData
            })
          ];

          if (role === 'driver') {
            // Drivers check for orders
            requests.push(
              CapacitorHttp.get({
                url: `${SUPABASE_URL}/rest/v1/orders?driver_id=eq.${userId}&status=in.("assigned","in_transit")&select=id,status`,
                headers
              })
            );

            // V17.4.4: Insert location_logs row only every 30s (was every 5s).
            // location_logs is a history table for trip replay — 30s granularity
            // is more than enough and keeps DB writes manageable across many drivers.
            if (location?.latitude && now - lastLogInsert >= LOG_INSERT_INTERVAL) {
              lastLogInsert = now;
              requests.push(
                CapacitorHttp.post({
                  url: `${SUPABASE_URL}/rest/v1/location_logs`,
                  headers,
                  data: {
                    user_id: userId,
                    lat: location.latitude,
                    lng: location.longitude,
                    speed: location.speed || 0,
                    heading: location.bearing || 0,
                    accuracy: location.accuracy || 0,
                    created_at: new Date().toISOString()
                  }
                })
              );
            }
          } else if (role === 'vendor') {
            // Vendors check for new pending orders
            requests.push(
              CapacitorHttp.get({
                url: `${SUPABASE_URL}/rest/v1/orders?vendor_id=eq.${userId}&status=eq.pending&select=id`,
                headers
              })
            );
          }

          const results = await Promise.allSettled(requests);

          // Alert if something new found in background
          if (role === 'driver' || role === 'vendor') {
            const checkRes = results[1]; // Order check is usually second
            if (checkRes.status === 'fulfilled' && Array.isArray((checkRes.value as any).data) && (checkRes.value as any).data.length > 0) {
              await triggerHaptic(ImpactStyle.Heavy);
            }
          }
        } catch (e) {
          console.warn("BG Native Update Exception", e);
        }
      }
    );

    return mainWatcherId;
  } catch (err) {
    console.error('Background Tracking Failed:', err);
    return null;
  }
};

/**
 * إيقاف تتبع الموقع في الخلفية
 */
export const stopBackgroundTracking = async (watcherId: string) => {
  if (!isNative() || !watcherId) return;

  try {
    const plugins = (Capacitor as unknown as { Plugins?: Record<string, unknown> }).Plugins;
    const BackgroundGeolocation = plugins?.BackgroundGeolocation as any;

    if (BackgroundGeolocation?.removeWatcher) {
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
      console.log('Native: Background tracking stopped');
    }
  } catch (e) {
    console.error('Stop Background Tracking Failed:', e);
  }
};

/**
 * تتبع الموقع اللحظي في الواجهة (Foreground)
 * يستخدم Geolocation.watchPosition لتحديثات سريعة جداً عند فتح التطبيق
 */
export const startForegroundTracking = async (userId: string, name?: string, onUpdate?: (loc: {lat: number, lng: number}) => void) => {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    
    let lastSentTs = 0;
    // V17.6.1: Industrial-Grade Background Resilience
    // Stationary: 10s, Moving: 5s, Fast (>2m/s): 3s
    const getDynamicInterval = (speed: number) => {
      if (speed > 2) return 3000;
      if (speed > 0) return 5000;
      return 10000;
    };

    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 3000,           // 3 seconds max wait
        maximumAge: 0            // Fresh data only
      },
      async (position, error) => {
        if (error || !position) return;
        
        const speed = position.coords.speed || 0;
        const loc = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed,
          accuracy: position.coords.accuracy || 0
        };
        if (onUpdate) onUpdate(loc);

        const now = Date.now();
        const dynamicInterval = getDynamicInterval(speed);
        
        if (now - lastSentTs < dynamicInterval) return;
        lastSentTs = now;

        // 1. Broadcast immediately via persistent singleton channel
        sendLocationBroadcast(userId, loc, name);

        // 2. Persist to DB
        await supabase.from('profiles').update({
          location: { ...loc, ts: now },
          is_online: true,
          last_location_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', userId);
      }
    );

    return watchId;
  } catch (e) {
    console.error('Start Foreground Tracking Failed:', e);
    return null;
  }
};

export const stopForegroundTracking = async (watchId: string) => {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.clearWatch({ id: watchId });
  } catch (e) {
    console.error('Stop foreground tracking failed:', e);
  }
};

