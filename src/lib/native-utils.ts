import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';

/**
 * دالة للتحقق مما إذا كان التطبيق يعمل كـ Native (Android/iOS)
 */
export const isNative = () => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

/**
 * دالة لطلب كافة الأذونات المطلوبة من المستخدم عند بدء التطبيق بشكل شامل
 */
export const requestAllPermissions = async () => {
  if (!isNative()) return;

  try {
    // 1. طلب إذن الموقع
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.requestPermissions();

    // 2. طلب إذن الكاميرا والوسائط
    const { Camera } = await import('@capacitor/camera');
    await Camera.requestPermissions();

    // 3. طلب إذن التنبيهات
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const pushStatus = await PushNotifications.requestPermissions();
    if (pushStatus.receive === 'granted') {
      await PushNotifications.register();
    }

    console.log('Native: Core permissions requested');
  } catch (e) {
    console.warn('Native: Failed to request permissions', e);
  }
};

/**
 * نظام التحديث التلقائي الذكي (OTA)
 * يقوم بالتحقق من جدول app_config في Supabase وتحميل التحديث فوراً
 */
export const checkForAutoUpdate = async () => {
  if (!isNative()) return;

  try {
    const { data: config, error } = await supabase
      .from('app_config')
      .select('*')
      .single();

    if (error || !config) return;

    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    const current = await CapacitorUpdater.getLatest();

    // إذا كانت النسخة السحابية أحدث من الحالية
    if (config.latest_version !== current.version && config.bundle_url) {
      console.log('Native: New update found!', config.latest_version);

      // تحميل التحديث
      const bundle = await CapacitorUpdater.download({
        url: config.bundle_url,
        version: config.latest_version
      });

      // إذا كان التحديث إجبارياً أو النسخة جاهزة، نقوم بالتثبيت
      if (config.force_update) {
        await CapacitorUpdater.set({ id: bundle.id });
      }

      return { available: true, version: config.latest_version, bundleId: bundle.id };
    }
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
        }
      }
    );

    return watcherId;
  } catch (e) {
    console.error('Background Tracking Failed:', e);
  }
};
