import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { supabase, supabaseLock } from './supabaseClient';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';
import { Preferences } from '@capacitor/preferences';
import { config } from './config';

// Constants for direct native API calls (V0.9.52)
const SUPABASE_URL = config.supabase.url;
const SUPABASE_KEY = config.supabase.anonKey;
const SESSION_KEY = 'start-location-v1-session';

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
 * نظام تتبع الموقع المتقدم في الخلفية
 */
export const startBackgroundTracking = async (userId: string, onUpdate?: (loc: {lat: number, lng: number}) => void) => {
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

    // 2. Optimized Background Geolocation Config (v0.9.86 - FORCE SYNC)
    let lastDbUpdate = 0;
    const DB_UPDATE_INTERVAL = 4000;

    // Start the main location watcher
    const mainWatcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "تطبيق ستارت يعمل لتحديث موقعك لضمان جودة الخدمة...",
        backgroundTitle: "تتبع الموقع في الخلفية نشط",
        requestPermissions: true,
        staleLocationInterval: 5000,
        distanceFilter: 2,
        persist: true,
        forceAccuracy: true,
        stationaryRadius: 2,
        notificationTitle: "تطبيق ستارت يعمل",
        notificationText: "جاري تتبع موقعك في الخلفية لضمان دقة الطلبات",
        notificationIconColor: "#3b82f6",
        notificationImportance: 5,
        priority: 1,
        interval: 3000,
        fastestInterval: 1000,
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

        if (location && location.latitude && location.longitude) {
          if (location.accuracy && location.accuracy > 50) return;

          const loc = { 
            lat: location.latitude, 
            lng: location.longitude,
            heading: location.bearing || 0,
            speed: location.speed || 0,
            accuracy: location.accuracy || 0
          };
          if (onUpdate) onUpdate(loc);

          const now = Date.now();
          if (now - lastDbUpdate < DB_UPDATE_INTERVAL) return;
          lastDbUpdate = now;

          try {
            let accessToken = SUPABASE_KEY;
            try {
              const { value: sessionStr } = await Preferences.get({ key: 'start-location-v1-session' });
              if (sessionStr) {
                const session = JSON.parse(sessionStr);
                if (session.access_token) accessToken = session.access_token;
              }
            } catch (e) {}

            const headers = {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            };

            await Promise.allSettled([
              CapacitorHttp.patch({
                url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
                headers,
                data: {
                  location: {
                    lat: location.latitude,
                    lng: location.longitude,
                    heading: location.bearing || 0,
                    speed: location.speed || 0,
                    accuracy: location.accuracy || 0,
                    ts: now
                  },
                  is_online: true,
                  last_location_update: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              }),
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
                  created_at: new Date().toISOString() // Ensure timestamp is set for logs
                }
              })
            ]);
          } catch (e) {
            console.warn("BG Native Update Exception", e);
          }
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
export const startForegroundTracking = async (userId: string, onUpdate?: (loc: {lat: number, lng: number}) => void) => {
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
        
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (onUpdate) onUpdate(loc);

        const now = Date.now();
        const speed = position.coords.speed || 0;
        // DYNAMIC GPS STREAM (V0.9.0): 
        // 1s interval if moving fast (> 2m/s), 2s if slow, 5s if stationary
        const dynamicInterval = speed > 2 ? 1000 : (speed > 0 ? 2000 : 5000);
        
        if (now - lastSentTs < dynamicInterval) return;
        lastSentTs = now;

        console.log(`[ULTIMATE-STREAM] Speed: ${speed}m/s - Interval: ${dynamicInterval}ms`);
        await supabase.from('profiles').update({
          location: {
            lat: loc.lat,
            lng: loc.lng,
            heading: position.coords.heading || 0,
            speed: speed,
            accuracy: position.coords.accuracy || 0,
            ts: now 
          },
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

