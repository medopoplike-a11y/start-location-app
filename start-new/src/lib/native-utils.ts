import { Capacitor } from '@capacitor/core';

/**
 * دالة للتحقق مما إذا كان التطبيق يعمل كـ Native (Android/iOS)
 */
export const isNative = () => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

/**
 * دالة لتحميل تحديث لحظي (OTA) وتثبيته فوراً
 */
export const downloadLiveUpdate = async (url: string, version: string) => {
  if (!isNative()) return;

  try {
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
  }
};
