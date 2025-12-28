'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, Home } from 'lucide-react'
import { storage } from '@/lib/storage'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isConfigured, setIsConfigured] = useState(true)
  const [rememberMe, setRememberMe] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if Supabase is configured
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
      setIsConfigured(false)
    }

    // Check if user is already logged in with remember me
    const checkExistingSession = async () => {
      const rememberMe = await storage.getItem('rememberMe')
      if (rememberMe === 'true') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // User has valid session and remember me is enabled
          router.push('/chat')
        }
      }
    }
    checkExistingSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!isConfigured) {
      setError('Supabase is not configured. Please check SETUP.md for instructions.')
      return
    }
    
    setLoading(true)

    try {
      // Look up the user's email from their username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .single()

      if (profileError || !profile) {
        setError('Invalid username or password')
        setLoading(false)
        return
      }

      // Sign in with the email and password
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      })

      if (error) {
        setError('Invalid username or password')
        setLoading(false)
        return
      }

      // Store remember me preference
      if (rememberMe) {
        await storage.setItem('rememberMe', 'true')
      } else {
        await storage.setItem('rememberMe', 'false')
      }

      router.push('/chat')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 overflow-y-auto flex items-center justify-center bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 px-4 py-8">
      {/* Home Button */}
      <Link
        href="/"
        className="fixed top-4 left-4 md:top-6 md:left-6 p-2 md:p-3 bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 border border-gray-700 z-10"
        title="Back to Home"
      >
        <Home className="w-6 h-6 text-green-400" />
      </Link>
      
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Universe Chat Logo"
            width={60}
            height={60}
            priority
            unoptimized
          />
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Welcome Back
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Sign in to continue chatting
        </p>

        {!isConfigured && (
          <div className="mb-6 bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-300">
                <p className="font-semibold mb-1">Supabase Setup Required</p>
                <p>Please configure Supabase to use authentication. See <code className="bg-yellow-800 px-1 rounded">SETUP.md</code> for instructions.</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-700 text-white transition"
              placeholder="johndoe"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-700 text-white transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-300 cursor-pointer select-none">
              Remember me (Stay logged in)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link href="/signup" className="font-semibold text-green-400 hover:text-green-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
