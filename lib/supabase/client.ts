import { createBrowserClient } from '@supabase/ssr'
import { Preferences } from '@capacitor/preferences'

// Check if running in Capacitor (mobile app)
const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor

// Custom storage adapter for Capacitor with proper error handling
const capacitorStorage = {
  getItem: async (key: string) => {
    try {
      const { value } = await Preferences.get({ key })
      return value
    } catch (error) {
      console.error('Error getting item from Capacitor storage:', error)
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await Preferences.set({ key, value })
    } catch (error) {
      console.error('Error setting item in Capacitor storage:', error)
    }
  },
  removeItem: async (key: string) => {
    try {
      await Preferences.remove({ key })
    } catch (error) {
      console.error('Error removing item from Capacitor storage:', error)
    }
  },
}

// Browser storage adapter (fallback for web)
const browserStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  },
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: isCapacitor ? capacitorStorage : browserStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        storageKey: 'supabase-auth-token'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        },
        timeout: 30000,
        heartbeatIntervalMs: 15000
      },
      global: {
        headers: {
          'X-Client-Info': isCapacitor ? 'capacitor-mobile' : 'web'
        }
      }
    }
  )
}
