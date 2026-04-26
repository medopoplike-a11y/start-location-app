import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

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

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ' + JSON.stringify(notification));
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action performed: ' + JSON.stringify(notification));
  });
};
