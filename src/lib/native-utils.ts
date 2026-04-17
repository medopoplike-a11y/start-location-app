import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { supabase, supabaseLock } from './supabaseClient';
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
 * دالة للاستيقاظ وإعادة مزامنة الجلسة والقنوات الحية (V1.8.0)
 * يتم استدعاؤها عند عودة التطبيق من الخلفية لضمان عدم تجمد البيانات
 */
export const refreshAppSession = async () => {
  try {
    console.log("App: RADICAL WAKE-UP starting...");
    
    // 1. Force refresh supabase session natively
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn("Session Refresh Error:", error);
      // Fallback: Check if we still have a valid user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("User logged out during background suspension");
        // We could trigger a logout here but it's risky
      }
    }

    // 2. Re-establish broadcast channel if dead
    await getBroadcastChannel();

    // 3. Clear and Re-subscribe Realtime (Handled by useSync via visibility listener)
    // We send a custom event to notify listeners that a hard wake-up occurred
    const channel = supabase.channel('system_sync');
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'app_wake_up',
      payload: { ts: Date.now() }
    });

    return session;
  } catch (e) {
    console.warn("App Wake-up failed:", e);
    return null;
  }
};

/**
 * مستمع لحدث عودة التطبيق للواجهة (Resume)
 */
export const onAppResume = (callback: () => void) => {
  if (!isNative()) return () => {};
  
  const listener = App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      console.log("App: Resumed from background, triggering refresh...");
      refreshAppSession().then(() => {
        callback();
      });
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
const CHECK_COOLDOWN = 2 * 60 * 1000; // 2 minutes cooldown

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
 * نظام التحديث التلقائي الذكي (OTA)
 * يقوم بالتحقق من جدول app_config في Supabase وتحميل التحديث فوراً
 */
export const checkForAutoUpdate = async (force = false) => {
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
    
    // 1. Get current state
    const dbVersion = String(config.latest_version || '').trim();
    const bundleUrl = String(config.bundle_url || '').trim();

    // 2. Check persistent storage for "Applied Version"
    // This is our ground truth to prevent infinite loops
    const { value: appliedVersion } = await Preferences.get({ key: 'last_applied_ota_version' });
    
    console.log(`Native OTA: [Applied: ${appliedVersion}] [DB: ${dbVersion}]`);

    if (appliedVersion === dbVersion) {
      console.log('Native OTA: App already has this version applied persistently.');
      return { available: false, version: dbVersion, reason: 'SAME_VERSION' };
    }

    // 3. Double check with plugin
    let current;
    try {
      current = await CapacitorUpdater.getLatest();
    } catch (e) {
      current = { version: '0.0.0' };
    }

    if (current.version === dbVersion) {
      // Sync our storage if plugin already knows
      await Preferences.set({ key: 'last_applied_ota_version', value: dbVersion });
      return { available: false, version: dbVersion, reason: 'SAME_VERSION' };
    }

    if (!bundleUrl || !dbVersion) {
      return { available: false, reason: 'MISSING_CONFIG' };
    }

    console.log('Native OTA: New update found! Downloading:', dbVersion);

    const bundle = await CapacitorUpdater.download({
      url: bundleUrl,
      version: dbVersion
    });

    // 4. Set as default and save to persistent storage BEFORE reload
    await CapacitorUpdater.set({ id: bundle.id });
    await Preferences.set({ key: 'last_applied_ota_version', value: dbVersion });
    
    console.log('Native OTA: Update applied to storage. Ready for reload.');

    return {
      available: true,
      version: dbVersion,
      bundleId: bundle.id,
      downloaded: true,
      forceUpdate: true,
      updateMessage: String(config.update_message || 'جاري تثبيت التحديث...')
    };
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
    // 3. Fall back to cached session in Preferences
    const { value: sessionStr } = await Preferences.get({ key: SESSION_KEY });
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session.access_token) return session.access_token;
    }
  } catch (_) {}

  // 4. Last resort: anon key (will only work if RLS allows it)
  return SUPABASE_KEY;
};

export const startBackgroundTracking = async (userId: string, name?: string, onUpdate?: (loc: {lat: number, lng: number}) => void) => {
  if (!isNative() || !userId) return null;

  try {
    const plugins = (Capacitor as unknown as { Plugins?: Record<string, any> }).Plugins;
    const BackgroundGeolocation = plugins?.BackgroundGeolocation;

    if (!BackgroundGeolocation) {
      console.warn('BackgroundGeolocation plugin not available.');
      return null;
    }

    // 1. Request all necessary permissions first (Including Background for Android 10+)
    const { Geolocation } = await import('@capacitor/geolocation');
    const perm = await Geolocation.requestPermissions({ 
      permissions: ['location', 'coarseLocation', 'backgroundLocation'] 
    });
    
    if (perm.location !== 'granted') {
      console.warn('Location permission not granted');
      return null;
    }

    // 2. RADICAL Background Geolocation Config (V1.8.0 - UNKILLABLE MODE)
    let lastDbUpdate = 0;
    const DB_UPDATE_INTERVAL = 3000; // 3 seconds interval for DB updates (Snappier)
    
    // Proactive Heartbeat: Ensure online status is refreshed every 1 minute for radical stability
    let lastHeartbeatUpdate = 0;
    const HEARTBEAT_DB_INTERVAL = 1 * 60 * 1000; 

    // Start the main location watcher
    const mainWatcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "تتبع الموقع نشط لضمان وصول الطلبات بدقة — لا تغلق التطبيق لضمان استمرارية الخدمة",
        backgroundTitle: "ستارت: تتبع الموقع (وضع الاستمرارية النشط)",
        requestPermissions: true,
        staleLocationInterval: 3000,
        distanceFilter: 1, // 1 meter filter for maximum precision
        persist: true,
        forceAccuracy: true,
        stationaryRadius: 1,
        notificationTitle: "تطبيق ستارت يعمل في الخلفية (وضع الاستمرارية)",
        notificationText: "تتبع الموقع والنبض نشط لضمان جودة الخدمة واستقبال الطلبات",
        notificationIconColor: "#f97316", // Orange-500
        notificationImportance: 5, // Max importance (Foreground Service - Priority High)
        priority: 2, // Maximum priority (V1.8.0)
        interval: 1000, // 1 second update interval
        fastestInterval: 500, // 0.5 second fastest interval
        activitiesInterval: 3000,
        stopOnTerminate: false, // Critical: don't stop if app is swiped away
        startOnBoot: true, // Auto-start on phone reboot
        heartbeatInterval: 20, // Plugin heartbeat every 20s (More aggressive)
        enableHeadless: true // Allow running JS logic even if UI is killed
      },
      async (location: any, error: any) => {
        if (error) {
          console.warn("BG Watcher Error:", error);
          // Auto-recovery: If watcher errors out, we don't stop, we wait for next heartbeat
          return;
        }

        const now = Date.now();
        const isHeartbeat = !location || !location.latitude;

        if (!isHeartbeat && location.latitude && location.longitude) {
          // في الخلفية تتراجع دقة GPS طبيعياً — نقبل حتى 300م لضمان استمرار التتبع
          if (location.accuracy && location.accuracy > 300) return;

          const loc = { 
            lat: location.latitude, 
            lng: location.longitude,
            heading: location.bearing || 0,
            speed: location.speed || 0,
            accuracy: location.accuracy || 0
          };
          if (onUpdate) onUpdate(loc);

          // Broadcast via persistent singleton channel (fixes channel-leak bug)
          sendLocationBroadcast(userId, loc, name);

          // Rate limit DB updates to avoid network flooding but keep it snappy
          if (now - lastDbUpdate < DB_UPDATE_INTERVAL) return;
          lastDbUpdate = now;
        } else if (isHeartbeat) {
          // Heartbeat logic: refresh is_online status even if stationary
          if (now - lastHeartbeatUpdate < HEARTBEAT_DB_INTERVAL) return;
          lastHeartbeatUpdate = now;
          console.log("BG Tracker: Sending stationary heartbeat (UNKILLABLE MODE)...");
        } else {
          return;
        }

        try {
          // RADICAL FIX: In background, JS clients are paused. CapacitorHttp is NATIVE and bypasses JS pausing.
          // We fetch a fresh token natively and update via REST API directly.
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

          // Use NATIVE Http to ensure the update goes through even if JS is frozen
          // This bypasses any JavaScript engine throttling by the OS
          const [profileUpdate, orderCheck] = await Promise.allSettled([
            CapacitorHttp.patch({
              url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
              headers,
              data: updateData
            }),
            // RADICAL BG: Check for any assigned/pending orders to keep the driver alert
            CapacitorHttp.get({
              url: `${SUPABASE_URL}/rest/v1/orders?driver_id=eq.${userId}&status=in.("assigned","in_transit")&select=id,status`,
              headers
            }),
            location?.latitude ? CapacitorHttp.post({
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
            }) : Promise.resolve()
          ]);

          // If we found orders and the app is in background, we trigger a haptic pulse if possible
          if (orderCheck.status === 'fulfilled' && Array.isArray((orderCheck.value as any).data) && (orderCheck.value as any).data.length > 0) {
             // We can trigger haptics or toast to keep the OS process alive
             await triggerHaptic(ImpactStyle.Heavy);
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
    const MIN_INTERVAL = 3000; // 3 seconds between DB updates to avoid throttling

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
        // DYNAMIC GPS STREAM: 1s fast, 2s slow, 5s stationary
        const dynamicInterval = speed > 2 ? 1000 : (speed > 0 ? 2000 : 5000);
        
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

