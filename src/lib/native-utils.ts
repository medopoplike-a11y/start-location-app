import { Capacitor } from '@capacitor/core';
import { supabase, supabaseLock } from './supabaseClient';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';
import { Preferences } from '@capacitor/preferences';

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
    return await Geolocation.requestPermissions();
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

const isValidUpdateUrl = async (url: string) => {
  if (!url || !/^https?:\/\//i.test(url)) return false;

  try {
    const response = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
    if (!response.ok) {
      console.warn(`Native OTA: URL ${url} returned status ${response.status}`);
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    const isValid = contentType.includes('zip') || contentType.includes('octet-stream') || url.toLowerCase().endsWith('.zip');
    
    if (!isValid) {
      console.warn(`Native OTA: URL ${url} has invalid content-type: ${contentType}`);
    }
    
    return isValid;
  } catch (err) {
    console.error(`Native OTA: Failed to validate URL ${url}`, err);
    return false;
  }
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
export const startBackgroundTracking = async (userId: string) => {
  if (!isNative() || !userId) return;

  try {
    const plugins = (Capacitor as unknown as { Plugins?: Record<string, unknown> }).Plugins;
    const BackgroundGeolocation = plugins?.BackgroundGeolocation as
      | {
          addWatcher: (
            options: {
              backgroundMessage: string;
              backgroundTitle: string;
              requestPermissions: boolean;
              staleLocationInterval: number;
              distanceFilter: number;
            },
            callback: (
              location?: {
                latitude: number;
                longitude: number;
                bearing: number | null;
                speed: number | null;
                accuracy: number;
              },
              error?: { code?: string }
            ) => void
          ) => Promise<string>;
          openSettings: () => void;
        }
      | undefined;

    if (!BackgroundGeolocation) {
      console.warn('BackgroundGeolocation plugin not available.');
      return;
    }

    const watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "جاري تتبع موقعك لتقديم أفضل خدمة توصيل...",
        backgroundTitle: "تطبيق ستارت نشط",
        requestPermissions: true,
        staleLocationInterval: 10000, // Reduced to 10 seconds for faster updates
        distanceFilter: 5 // Reduced to 5 meters for higher precision
      },
      async (location, error) => {
        if (error) {
          if (error.code === "NOT_AUTHORIZED") {
            if (window.confirm("التطبيق يحتاج إذن الموقع في الخلفية للعمل بشكل صحيح. هل تود الذهاب للإعدادات؟")) {
              BackgroundGeolocation.openSettings();
            }
          }
          return;
        }

        if (location) {
          // استخدام القفل لضمان تسلسل تحديثات الموقع
          await supabaseLock.runExclusive(async () => {
            await supabase
              .from('profiles')
              .update({
                location: {
                  lat: location.latitude,
                  lng: location.longitude,
                  heading: location.bearing,
                  speed: location.speed,
                  accuracy: location.accuracy
                },
                is_online: true,
                last_location_update: new Date().toISOString()
              })
              .eq('id', userId);
          });
        }
      }
    );

    return watcherId;
  } catch (e) {
    console.error('Background Tracking Failed:', e);
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
    
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      },
      async (position, err) => {
        if (err || !position) return;
        
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (onUpdate) onUpdate({ lat, lng });

        // Update Supabase immediately
        await supabase
          .from('profiles')
          .update({
            location: {
              lat,
              lng,
              heading: position.coords.heading,
              speed: position.coords.speed,
              accuracy: position.coords.accuracy
            },
            is_online: true,
            last_location_update: new Date().toISOString()
          })
          .eq('id', userId);
      }
    );
    
    return watchId;
  } catch (e) {
    console.error('Foreground tracking failed:', e);
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

