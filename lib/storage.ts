import { Preferences } from '@capacitor/preferences'

// Check if running in Capacitor (mobile app)
const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isCapacitor) {
      try {
        const { value } = await Preferences.get({ key })
        return value
      } catch (error) {
        console.error('Error getting item from storage:', error)
        return null
      }
    } else {
      return localStorage.getItem(key)
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isCapacitor) {
      try {
        await Preferences.set({ key, value })
      } catch (error) {
        console.error('Error setting item in storage:', error)
      }
    } else {
      localStorage.setItem(key, value)
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isCapacitor) {
      try {
        await Preferences.remove({ key })
      } catch (error) {
        console.error('Error removing item from storage:', error)
      }
    } else {
      localStorage.removeItem(key)
    }
  }
}
