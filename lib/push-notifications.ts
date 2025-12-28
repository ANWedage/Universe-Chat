import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

const isNativePlatform = Capacitor.isNativePlatform()

export async function initPushNotifications(userId: string) {
  if (!isNativePlatform) {
    console.log('Push notifications only work on native platforms')
    return null
  }

  try {
    // Request permission
    const permissionResult = await PushNotifications.requestPermissions()
    
    if (permissionResult.receive !== 'granted') {
      console.log('Push notification permission denied')
      return null
    }

    // Register with FCM
    await PushNotifications.register()
    console.log('Push notifications registered')

    return new Promise<string | null>((resolve) => {
      // Get FCM token
      PushNotifications.addListener('registration', async (token) => {
        console.log('FCM Token:', token.value)
        
        // Save token to Supabase for this user
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          
          await supabase
            .from('profiles')
            .update({ fcm_token: token.value })
            .eq('id', userId)
          
          console.log('FCM token saved to profile')
          resolve(token.value)
        } catch (error) {
          console.error('Error saving FCM token:', error)
          resolve(null)
        }
      })

      // Handle registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error)
        resolve(null)
      })
    })
  } catch (error) {
    console.error('Error initializing push notifications:', error)
    return null
  }
}

export function setupPushNotificationListeners() {
  if (!isNativePlatform) return

  // Handle notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification)
  })

  // Handle notification clicked
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push notification clicked:', notification)
    // You can navigate to the chat here
    const userId = notification.notification.data?.userId
    if (userId) {
      // Handle navigation to specific chat
      console.log('Navigate to chat with user:', userId)
    }
  })
}
