import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

// Check if running in Capacitor (mobile app) - must be native platform
const isCapacitor = typeof window !== 'undefined' && Capacitor.isNativePlatform()

export async function requestNotificationPermission(): Promise<boolean> {
  console.log('requestNotificationPermission called, isCapacitor:', isCapacitor)
  
  if (isCapacitor) {
    // Request permission for Capacitor (mobile)
    try {
      console.log('Requesting Capacitor notification permission...')
      const result = await LocalNotifications.requestPermissions()
      console.log('Capacitor permission result:', result)
      return result.display === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  } else {
    // Request permission for web
    if ('Notification' in window) {
      console.log('Current Notification permission:', Notification.permission)
      if (Notification.permission === 'default') {
        console.log('Requesting web notification permission...')
        const permission = await Notification.requestPermission()
        console.log('Web notification permission result:', permission)
        return permission === 'granted'
      }
      return Notification.permission === 'granted'
    }
    console.log('Notification API not available')
    return false
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (isCapacitor) {
    try {
      const result = await LocalNotifications.checkPermissions()
      console.log('Capacitor permission check:', result)
      return result.display === 'granted'
    } catch (error) {
      console.error('Error checking Capacitor permission:', error)
      return false
    }
  } else {
    if ('Notification' in window) {
      const hasPermission = Notification.permission === 'granted'
      console.log('Web notification permission check:', hasPermission, Notification.permission)
      return hasPermission
    }
    return false
  }
}

export async function showNotification(title: string, body: string, userId?: string) {
  // Check if document is hidden (app in background/minimized)
  const isDocumentHidden = typeof document !== 'undefined' && document.hidden
  
  console.log('Attempting to show notification:', { title, body, isDocumentHidden, isCapacitor })
  
  const hasPermission = await checkNotificationPermission()
  
  if (!hasPermission) {
    console.log('Notification permission not granted')
    return
  }

  if (isCapacitor) {
    // Show notification using Capacitor (mobile)
    try {
      console.log('Scheduling Capacitor notification...')
      // Use a smaller ID that fits in Java int (max 2147483647)
      // Generate a random int between 1 and 2147483647
      const notificationId = Math.floor(Math.random() * 2147483647) + 1
      
      const result = await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) }, // Show immediately
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { userId }
          }
        ]
      })
      console.log('Notification scheduled:', result)
    } catch (error) {
      console.error('Error showing notification:', error)
    }
  } else {
    // Show notification using Web API
    console.log('Web notification path - Notification in window:', 'Notification' in window)
    console.log('Web notification path - Permission:', Notification?.permission)
    
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        console.log('Creating web notification...')
        const notification = new Notification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: userId || 'message',
          requireInteraction: false,
          data: { userId }
        })
        console.log('Web notification created:', notification)

        notification.onclick = () => {
          window.focus()
          notification.close()
          // If userId is provided, could navigate to that chat
          if (userId) {
            // The app will handle this through URL or state management
          }
        }
        
        console.log('Web notification created successfully')
      } catch (error) {
        console.error('Error creating web notification:', error)
      }
    } else {
      console.log('Notification API not available or permission not granted')
      console.log('  - Notification in window:', 'Notification' in window)
      console.log('  - Permission:', Notification?.permission)
    }
  }
}

export function setupNotificationListeners(onNotificationClick: (userId?: string) => void) {
  if (isCapacitor) {
    // Handle notification clicks on mobile
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      const userId = notification.notification.extra?.userId
      onNotificationClick(userId)
    })
  }
}

// Test function to verify notifications are working
export async function testNotification() {
  console.log('Testing notification...')
  const hasPermission = await checkNotificationPermission()
  console.log('Has permission:', hasPermission)
  
  if (!hasPermission) {
    const granted = await requestNotificationPermission()
    console.log('Permission request result:', granted)
    if (!granted) {
      alert('Notification permission denied. Please enable it in your browser/system settings.')
      return
    }
  }
  
  await showNotification('Test Notification', 'This is a test message from Universe Chat!')
}
