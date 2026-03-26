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
 * تشمل: الموقع، الكاميرا، الوسائط، سجل المكالمات، والتنبيهات
 */
export const requestAllPermissions = async () => {
  if (!isNative()) return;

  try {
    // 1. طلب إذن الموقع (بما في ذلك الخلفية)
    const { Geolocation } = await import('@capacitor/geolocation');
    const geoStatus = await Geolocation.requestPermissions();
    console.log('Native: Geolocation status', geoStatus);

    // 2. طلب إذن الكاميرا والوسائط
    const { Camera } = await import('@capacitor/camera');
    await Camera.requestPermissions();

    // 3. طلب إذن التنبيهات
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const pushStatus = await PushNotifications.requestPermissions();
    if (pushStatus.receive === 'granted') {
      await PushNotifications.register();
    }

    // 4. طلب أذونات متقدمة عبر Capacitor Bridge (سجل المكالمات والنشاط البدني)
    // ملاحظة: بعض الأذونات تتطلب plugins مخصصة، ولكننا نضمنها في Manifest أولاً
    console.log('Native: All core permissions requested');
  } catch (e) {
    console.warn('Native: Failed to request permissions', e);
  }
};

/**
 * نظام تتبع الطيار الذكي - يرسل الموقع لـ Supabase حتى في الخلفية
 * تم تحسينه ليرسل السرعة والاتجاه لضمان تجربة "خرافية" على الخريطة
 */
export const startBackgroundTracking = async (userId: string) => {
  if (!isNative() || !userId) return;

  try {
    const { Geolocation } = await import('@capacitor/geolocation');

    await Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 5000, // تحديث كل 5 ثوانٍ لدقة خرافية
      maximumAge: 0
    }, async (position, err) => {
      if (err) {
        console.error('Tracking Error:', err);
        return;
      }

      if (position) {
        const { coords } = position;

        // تحديث جدول البروفايل بالإحداثيات المتقدمة
        await supabase
          .from('profiles')
          .update({
            location: {
              lat: coords.latitude,
              lng: coords.longitude,
              heading: coords.heading,
              speed: coords.speed,
              altitude: coords.altitude,
              accuracy: coords.accuracy
            },
            is_online: true,
            last_location_update: new Date().toISOString()
          })
          .eq('id', userId);
      }
    });

    console.log('Native: High-precision tracking started');
  } catch (e) {
    console.error('Tracking Setup Failed:', e);
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
    const currentVersion = (await CapacitorUpdater.getLatest()).version;

    if (config.latest_version !== currentVersion && config.bundle_url) {
      console.log('Native: New update found!', config.latest_version);

      // تحميل التحديث في الخلفية
      await CapacitorUpdater.download({
        url: config.bundle_url,
        version: config.latest_version
      });

      // إذا كان التحديث إجبارياً، نقوم بتثبيته فوراً
      if (config.force_update) {
        await CapacitorUpdater.set({ id: config.latest_version });
      }
    }
  } catch (e) {
    console.error('Auto Update Check Failed:', e);
  }
};
