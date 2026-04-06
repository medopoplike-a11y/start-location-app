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
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('zip') || contentType.includes('octet-stream') || url.toLowerCase().endsWith('.zip');
  } catch (headError) {
    console.warn('Native: HEAD check failed for update URL, trying GET', headError);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' }
      });
      if (!response.ok) return false;

      const contentType = response.headers.get('content-type') || '';
      return contentType.includes('zip') || contentType.includes('octet-stream') || url.toLowerCase().endsWith('.zip');
    } catch (getError) {
      console.error('Native: Update URL validation failed', getError);
      return false;
    }
  }
};

/**
 * نظام التحديث التلقائي الذكي (OTA)
 * يقوم بالتحقق من جدول app_config في Supabase وتحميل التحديث فوراً
 */
export const checkForAutoUpdate = async () => {
  if (!isNative()) return { available: false };

  try {
    // التحقق من الإعدادات بدون قفل لتجنب أي تعارض أو بطء
    const { data: config, error: configError } = await supabase
      .from('app_config')
      .select('*')
      .single();

    if (configError) {
      console.warn('Native: checkForAutoUpdate skip due to config error:', configError.message);
      return { available: false };
    }

    if (!config) {
      return { available: false };
    }

    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    const current = await CapacitorUpdater.getLatest();
    const bundleUrl = String(config.bundle_url || '').trim();

    if (!bundleUrl || !config.latest_version) {
      console.warn('Native: Update config missing bundle_url or latest_version');
      return { available: false };
    }

    if (config.latest_version === current.version) {
      console.log('Native: Version is up to date:', current.version);
      return { available: false };
    }

    if (!(await isValidUpdateUrl(bundleUrl))) {
      console.warn('Native: Update URL is not valid or not reachable', bundleUrl);
      return { available: false };
    }

    console.log('Native: New update found!', config.latest_version);

    const bundle = await CapacitorUpdater.download({
      url: bundleUrl,
      version: config.latest_version
    });

    console.log('Native: Download complete, bundle ID:', bundle.id);

    // If it's a force update, apply and reload immediately
    if (config.force_update) {
      console.log('Native: Force update active, applying and reloading...');
      await CapacitorUpdater.set({ id: bundle.id });
      await CapacitorUpdater.reload();
    }
    
    return {
      available: true,
      version: config.latest_version,
      bundleId: bundle.id,
      downloaded: true,
      forceUpdate: !!config.force_update,
      updateMessage: String(config.update_message || 'التحديث جاهز للتثبيت.')
    };
  } catch (e) {
    console.error('Auto Update Check Failed:', e);
  }

  return { available: false };
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

