import { Capacitor } from '@capacitor/core';

/**
 * دالة للتحقق مما إذا كان التطبيق يعمل كـ Native (Android/iOS)
 */
export const isNative = () => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

/**
<<<<<<< HEAD
 * دالة لطلب كافة الأذونات المطلوبة من المستخدم عند بدء التطبيق
=======
 * دالة لتحميل تحديث لحظي (OTA) وتثبيته فوراً
>>>>>>> 4f3a7978a70c576d8c07e817f760035194f82d4b
 */
export const requestAllPermissions = async () => {
  if (!isNative()) return;

  try {
<<<<<<< HEAD
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
=======
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    
    // تحميل وتثبيت النسخة الجديدة فوراً
    await CapacitorUpdater.download({
      url,
      version
    });
    
    console.log('Native: Live update installed successfully');
    
    // إعادة تشغيل التطبيق لتطبيق التحديث
    await CapacitorUpdater.set({ id: version });
  } catch (e) {
    console.warn('Native: Live update failed', e);
>>>>>>> 4f3a7978a70c576d8c07e817f760035194f82d4b
  }
};
