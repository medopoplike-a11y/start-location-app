import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { dbService } from './db-service';

export const setupPushNotifications = async () => {
  // V19.0.1: CRITICAL SAFETY GUARD
  // Prevent app crash on Android if Firebase is not initialized (missing google-services.json)
  if (typeof window !== 'undefined') {
    const isPushDisabled = localStorage.getItem('disable_push_notifications') === 'true';
    if (isPushDisabled) {
      console.log('PushNotifications: Disabled by safety flag');
      return;
    }
  }

  if (Capacitor.getPlatform() === 'web') {
    console.log('Push notifications not supported on web platform yet.');
    return;
  }

  try {
    console.log('PushNotifications: Checking permissions...');
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('PushNotifications: Permission not granted');
      return;
    }

    console.log('PushNotifications: Registering with native service...');
    // This is the line that crashes if google-services.json is missing
    await PushNotifications.register();
    
    // If we reached here, registration at least didn't crash the process
    console.log('PushNotifications: Registration call completed');

  } catch (err: any) {
    console.error('PushNotifications: Fatal registration error', err);
    
    // If it's a Firebase initialization error, disable it permanently for this device
    if (err.message?.includes('Firebase') || err.message?.includes('initialization')) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('disable_push_notifications', 'true');
      }
    }
  }

  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token: ' + token.value);
    // Here you would typically send the token to your backend (Supabase)
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  PushNotifications.addListener('pushNotificationReceived', async (notification) => {
    console.log('Push received: ' + JSON.stringify(notification));
    
    // V20.0.0: Save notification data to SQLite immediately
    try {
      // Check if notification contains order data
      const data = notification.data as any;
      if (data?.order) {
        console.log('PushNotifications: Saving order to SQLite:', data.order);
        await dbService.saveOrder(data.order);
        // Trigger a sync to ensure we have the latest data
        await dbService.syncFromRemote();
      }
    } catch (e) {
      console.error('PushNotifications: Failed to save data to SQLite', e);
    }
  });

  PushNotifications.addListener('pushNotificationActionPerformed', async (notification) => {
    console.log('Push action performed: ' + JSON.stringify(notification));
    
    // V20.0.0: Ensure data is saved to SQLite when user taps notification
    try {
      const data = notification.notification.data as any;
      if (data?.order) {
        console.log('PushNotifications: Saving order to SQLite from action:', data.order);
        await dbService.saveOrder(data.order);
        await dbService.syncFromRemote();
      }
    } catch (e) {
      console.error('PushNotifications: Failed to save data from action', e);
    }
  });
};
