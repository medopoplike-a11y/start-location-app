import { Capacitor } from '@capacitor/core';
import { supabase, supabaseLock } from './supabaseClient';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';

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
const CHECK_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown

/**
 * نظام التحديث التلقائي الذكي (OTA)
 * يقوم بالتحقق من جدول app_config في Supabase وتحميل التحديث فوراً
 */
export const checkForAutoUpdate = async (force = false) => {
  if (!isNative()) return { available: false, reason: 'NOT_NATIVE' };
  if (isChecking) return { available: false, reason: 'ALREADY_CHECKING' };

  // Prevent frequent checks unless forced
  const now = Date.now();
  if (!force && now - lastCheckTime < CHECK_COOLDOWN) {
    console.log('Native OTA: Skipping check due to cooldown.');
    return { available: false, reason: 'COOLDOWN' };
  }
  
  isChecking = true;
  lastCheckTime = now;

  try {
    console.log('Native OTA: Checking for updates in app_config...');
    const { data: config, error: configError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (configError) {
      console.error('Native OTA: Database query failed:', configError.message);
      return { available: false, reason: 'DB_ERROR', error: configError.message };
    }

    if (!config) {
      console.warn('Native OTA: No app_config record found for id=1');
      return { available: false, reason: 'NO_CONFIG' };
    }

    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    let current;
    try {
      current = await CapacitorUpdater.getLatest();
    } catch (e) {
      console.warn('Native OTA: Failed to get latest bundle info from plugin, using fallback', e);
      current = { version: '0.0.0' };
    }
    const bundleUrl = String(config.bundle_url || '').trim();

    const phoneVersion = current.version || '0.0.0';
    const dbVersion = config.latest_version || '0.0.0';

    console.log(`Native OTA: [Current: ${phoneVersion}] [Latest: ${dbVersion}]`);
    console.log(`Native OTA: Bundle URL: ${bundleUrl}`);

    if (dbVersion === phoneVersion) {
      console.log('Native OTA: App is up to date.');
      return { 
        available: false, 
        version: dbVersion, 
        phoneVersion: phoneVersion,
        reason: 'SAME_VERSION' 
      };
    }

    if (!bundleUrl || !dbVersion) {
      console.warn('Native OTA: Missing update configuration in DB');
      return { 
        available: false, 
        version: dbVersion, 
        phoneVersion: phoneVersion,
        reason: 'MISSING_CONFIG' 
      };
    }

    console.log('Native OTA: New update found! Starting download...');

    const bundle = await CapacitorUpdater.download({
      url: bundleUrl,
      version: dbVersion
    });

    console.log('Native OTA: Download successful, bundle ID:', bundle.id);

    // If it's a force update, apply and reload immediately
    if (config.force_update) {
      console.log('Native OTA: Force update active, applying and reloading...');
      await CapacitorUpdater.set({ id: bundle.id });
      await CapacitorUpdater.reload();
    }
    
    return {
      available: true,
      version: dbVersion,
      bundleId: bundle.id,
      downloaded: true,
      forceUpdate: !!config.force_update,
      updateMessage: String(config.update_message || 'التحديث جاهز للتثبيت.')
    };
  } catch (e: any) {
    console.error('Native OTA: Fatal error during update check:', e);
    let errorMsg = e.message || 'فشل الاتصال بخادم التحديثات';
    if (errorMsg.includes('rate_limit_exceeded')) {
      errorMsg = 'تجاوزت حد المحاولات المسموح به حالياً. يرجى الانتظار 15 دقيقة ثم المحاولة مرة أخرى.';
    }
    return { available: false, reason: 'FATAL_ERROR', error: errorMsg };
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
        staleLocationInterval: 30000,
        distanceFilter: 10
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

