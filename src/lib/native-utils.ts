import { Capacitor } from '@capacitor/core';

/**
 * دالة للتحقق مما إذا كان التطبيق يعمل كـ Native (Android/iOS)
 */
export const isNative = () => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

/**
 * دالة لتحميل تحديث لحظي (OTA) فقط في البيئة الأصلية
 */
export const downloadLiveUpdate = async (url: string, version: string) => {
  if (!isNative()) return;

  try {
    // استيراد ديناميكي للمكتبة لمنع تعطل الويب
    const { CapacitorUpdater } = await import('capacitor-updater');
    await CapacitorUpdater.download({
      url,
      version
    });
    console.log('Native: Live update downloaded successfully');
  } catch (e) {
    console.warn('Native: Live update download failed', e);
  }
};
