"use client";

import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabaseClient';

export default function PushNotificationManager({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform()) {
      return;
    }

    const registerPush = async () => {
      // Check if we should skip registration to prevent crashes on non-configured devices
      const skipPush = localStorage.getItem('skip_push_registration') === 'true';
      if (skipPush) {
        console.log('PushNotificationManager: Registration skipped by user/system flag');
        return;
      }

      try {
        // Robust check: Is the plugin actually available?
        if (!(PushNotifications as any).register) {
          console.warn('PushNotificationManager: PushNotifications.register not available on this platform/build');
          return;
        }

        let permStatus = await PushNotifications.checkPermissions().catch(err => {
          console.error('PushNotificationManager: checkPermissions failed', err);
          return { receive: 'denied' as const };
        });

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions().catch(err => {
            console.error('PushNotificationManager: requestPermissions failed', err);
            return { receive: 'denied' as const };
          });
        }

        if (permStatus.receive !== 'granted') {
          console.warn('Push notification permissions not granted');
          return;
        }

        console.log('PushNotificationManager: Attempting to register with native service...');
        // Note: This might still crash if Firebase is not initialized on Android
        // despite the try-catch, as it\'s a native exception.
        // We use a safe wrapper or skip if known to be problematic
        await PushNotifications.register().catch(err => {
          console.error('PushNotificationManager: register() failed', err);
          localStorage.setItem('skip_push_registration', 'true');
        });
      } catch (e) {
        console.error('PushNotificationManager: Native registration exception', e);
        localStorage.setItem('skip_push_registration', 'true');
      }
    };

    const registrationListener = PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      
      try {
        // حفظ التوكن في بروفايل المستخدم في سوبابيز
        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token.value })
          .eq('id', userId);
          
        if (error) {
          console.error('Error updating push token:', error);
        }
      } catch (e) {
        console.error('Push token update exception', e);
      }
    });

    const registrationErrorListener = PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error listener:', error);
      // If we get a specific error, we might want to disable future attempts
      if (error?.error?.includes('Firebase') || error?.error?.includes('initializ')) {
        localStorage.setItem('skip_push_registration', 'true');
      }
    });

    const pushReceivedListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      // هنا يمكنك إظهار تنبيه داخلي في التطبيق إذا كان مفتوحاً
    });

    const pushActionListener = PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      // هنا يمكنك توجيه المستخدم لصفحة الطلبات مثلاً
    });

    // Delay registration slightly to ensure native bridge is fully ready
    const timeoutId = setTimeout(() => {
      registerPush();
    }, 5000); // Increased delay for stability

    return () => {
      clearTimeout(timeoutId);
      registrationListener.remove();
      registrationErrorListener.remove();
      pushReceivedListener.remove();
      pushActionListener.remove();
    };
  }, [userId]);

  return null;
}
