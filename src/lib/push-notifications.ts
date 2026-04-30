import { Capacitor } from '@capacitor/core';

export const setupPushNotifications = async () => {
  // V20.0.1: ULTRA-SAFE - All dynamic imports to prevent app crash
  
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
    // Dynamically import PushNotifications
    const { PushNotifications } = await import('@capacitor/push-notifications');
    
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

    // Setup listeners (only if registration succeeded)
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Here you would typically send the token to your backend (Supabase)
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      
      // V20.0.1: ULTRA-SAFE - Only save to SQLite if dbService is available
      try {
        // Check if notification contains order data
        const data = notification.data as any;
        if (data?.order && Capacitor.isNativePlatform()) {
          try {
            const { dbService } = await import('./db-service');
            console.log('PushNotifications: Saving order to SQLite:', data.order);
            await dbService.saveOrder(data.order);
            // Trigger a sync to ensure we have the latest data
            try {
              await dbService.syncFromRemote();
            } catch (syncErr) {
              console.warn('PushNotifications: Sync failed (safe to continue)', syncErr);
            }
          } catch (dbErr) {
            console.warn('PushNotifications: SQLite not available (safe to continue)', dbErr);
          }
        }
      } catch (e) {
        console.error('PushNotifications: Failed to process notification (safe to continue)', e);
      }
    });

    PushNotifications.addListener('pushNotificationActionPerformed', async (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      
      // V20.0.1: ULTRA-SAFE
      try {
        const data = notification.notification.data as any;
        if (data?.order && Capacitor.isNativePlatform()) {
          try {
            const { dbService } = await import('./db-service');
            console.log('PushNotifications: Saving order to SQLite from action:', data.order);
            await dbService.saveOrder(data.order);
            try {
              await dbService.syncFromRemote();
            } catch (syncErr) {
              console.warn('PushNotifications: Sync failed (safe to continue)', syncErr);
            }
          } catch (dbErr) {
            console.warn('PushNotifications: SQLite not available (safe to continue)', dbErr);
          }
        }
      } catch (e) {
        console.error('PushNotifications: Failed to process action (safe to continue)', e);
      }
    });

  } catch (err: any) {
    console.error('PushNotifications: Fatal error (safe to continue)', err);
    
    // If it's a Firebase initialization error, disable it permanently for this device
    if (err.message?.includes('Firebase') || err.message?.includes('initialization')) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('disable_push_notifications', 'true');
      }
    }
  }
};
