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
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permissions not granted');
        return;
      }

      await PushNotifications.register();
    };

    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      
      // حفظ التوكن في بروفايل المستخدم في سوبابيز
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token.value })
        .eq('id', userId);
        
      if (error) {
        console.error('Error updating push token:', error);
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      // هنا يمكنك إظهار تنبيه داخلي في التطبيق إذا كان مفتوحاً
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      // هنا يمكنك توجيه المستخدم لصفحة الطلبات مثلاً
    });

    registerPush();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userId]);

  return null;
}
