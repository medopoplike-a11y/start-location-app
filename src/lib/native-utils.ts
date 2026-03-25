import { Capacitor } from '@capacitor/core';

/**
 * دالة للتحقق مما إذا كان التطبيق يعمل كـ Native (Android/iOS)
 */
export const isNative = () => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

/**
 * دالة لطلب كافة الأذونات المطلوبة من المستخدم عند بدء التطبيق
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
    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      await PushNotifications.register();
    }

    console.log('Native: All permissions requested');
  } catch (e) {
    console.warn('Native: Failed to request permissions', e);
  }
};
