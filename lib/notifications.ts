import { PushNotifications } from '@capacitor/push-notifications';
import { createClient } from './supabase/client';

export const initializePushNotifications = async () => {
  const supabase = createClient();

  // Request permission
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.log('Push notification permission denied');
    return;
  }

  // Register with FCM
  await PushNotifications.register();

  // Save token to database when received
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push registration success, token: ' + token.value);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Save FCM token to user profile
      await supabase
        .from('profiles')
        .update({ fcm_token: token.value })
        .eq('id', user.id);
    }
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  // Handle notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received: ', notification);
    // You can show an in-app notification here
  });

  // Handle notification tap
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push notification action performed', notification);
    // Navigate to chat screen or specific conversation
  });
};

export const removePushNotifications = async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Remove FCM token from database
    await supabase
      .from('profiles')
      .update({ fcm_token: null })
      .eq('id', user.id);
  }
  
  // Unregister from push notifications
  await PushNotifications.removeAllListeners();
};
