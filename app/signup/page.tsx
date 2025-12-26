'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, Home } from 'lucide-react'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isConfigured, setIsConfigured] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if Supabase is configured
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
      setIsConfigured(false)
    }
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!isConfigured) {
      setError('Supabase is not configured. Please check SETUP.md for instructions.')
      return
    }

    // Validate full name (only letters and spaces)
    const nameRegex = /^[A-Za-z\s]+$/
    if (!nameRegex.test(fullName)) {
      setError('Full name can only contain letters and spaces')
      return
    }

    // Validate password match
    if (password !== retypePassword) {
      setError('Passwords do not match')
      return
    }
    
    setLoading(true)

    try {
      // Check if username already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single()

      if (existingProfile) {
        setError('Username already taken')
        setLoading(false)
        return
      }

      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          username,
          email,
          full_name: fullName,
          avatar_url: null,
        })

        if (profileError) throw profileError

        router.push('/chat')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-gray-900 dark:via-green-900 dark:to-emerald-900 px-4 py-8">
      {/* Home Button */}
      <Link
        href="/"
        className="fixed top-6 left-6 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 border border-gray-200 dark:border-gray-700"
        title="Back to Home"
      >
        <Home className="w-6 h-6 text-green-600 dark:text-green-400" />
      </Link>
      
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-center mb-3">
          <Image
            src="/logo.png"
            alt="Universe Chat Logo"
            width={60}
            height={60}
            priority
            unoptimized
          />
        </div>
        
        <h1 className="text-xl font-bold text-center mb-1 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Join Universe Chat
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4 text-xs">
          Create your account to start chatting
        </p>

        {!isConfigured && (
          <div className="mb-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded-lg p-2">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-800 dark:text-yellow-300">
                <p className="font-semibold mb-0.5">Supabase Setup Required</p>
                <p>Please configure Supabase to use authentication. See <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">SETUP.md</code> for instructions.</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-3">
          <div>
            <label htmlFor="fullName" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => {
                const value = e.target.value
                // Only allow letters and spaces
                if (value === '' || /^[A-Za-z\s]*$/.test(value)) {
                  setFullName(value)
                }
              }}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
              placeholder="johndoe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="retypePassword" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Retype Password
            </label>
            <input
              id="retypePassword"
              type="password"
              value={retypePassword}
              onChange={(e) => setRetypePassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
              placeholder="••••••••"
            />
            {retypePassword && password !== retypePassword && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-green-600 hover:text-green-500 dark:text-green-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
