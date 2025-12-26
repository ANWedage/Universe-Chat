'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Send, LogOut, User, MessageSquare, RefreshCw, X, Settings } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { encryptMessage, decryptMessage } from '@/lib/crypto'

type Profile = {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
}

type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  read: boolean
}

export default function Chat() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map())
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [deleteTimer, setDeleteTimer] = useState<'24h' | '7d' | 'immediately' | 'off'>('off')
  const [editedName, setEditedName] = useState('')
  const [unreadConversations, setUnreadConversations] = useState<Array<{ user: Profile; count: number }>>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadUsers()
      loadUserSettings()
      loadUnreadConversations()
      
      // Run cleanup on mount
      cleanupOldMessages()
      
      // Set up periodic cleanup (every hour)
      const cleanupInterval = setInterval(() => {
        cleanupOldMessages()
      }, 60 * 60 * 1000)
      
      // Subscribe to new user registrations
      const profilesChannel = supabase
        .channel('public-profiles')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'profiles',
          },
          (payload) => {
            console.log('New user registered:', payload.new)
            // Add new user to the list if not current user
            const newProfile = payload.new as Profile
            if (newProfile.id !== currentUser.id) {
              setUsers((current) => {
                const exists = current.some(u => u.id === newProfile.id)
                if (exists) return current
                return [...current, newProfile].sort((a, b) => a.username.localeCompare(b.username))
              })
              setFilteredUsers((current) => {
                const exists = current.some(u => u.id === newProfile.id)
                if (exists) return current
                const updated = [...current, newProfile].sort((a, b) => a.username.localeCompare(b.username))
                // Apply current search filter
                if (searchQuery) {
                  return updated.filter((user) =>
                    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                }
                return updated
              })
            }
          }
        )
        .subscribe()

      // Subscribe to incoming messages for unread notifications
      const incomingChannel = supabase
        .channel('incoming-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${currentUser.id}`,
          },
          (payload) => {
            console.log('New incoming message:', payload.new)
            loadUnreadConversations()
          }
        )
        .subscribe()

      return () => {
        clearInterval(cleanupInterval)
        supabase.removeChannel(profilesChannel)
        supabase.removeChannel(incomingChannel)
      }
    }
  }, [currentUser, searchQuery])

  useEffect(() => {
    if (selectedUser && currentUser) {
      loadMessages()
      
      // Subscribe to new messages with a unique channel name
      const channelName = `chat:${currentUser.id}:${selectedUser.id}`
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const newMessage = payload.new as Message
            // Only add message if it's part of this conversation
            if (
              (newMessage.sender_id === currentUser.id && newMessage.receiver_id === selectedUser.id) ||
              (newMessage.sender_id === selectedUser.id && newMessage.receiver_id === currentUser.id)
            ) {
              setMessages((current) => {
                // Avoid duplicates
                const exists = current.some(msg => msg.id === newMessage.id)
                if (exists) return current
                return [...current, newMessage]
              })
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Real-time subscription active')
          }
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedUser, currentUser])

  useEffect(() => {
    const filtered = users.filter((user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredUsers(filtered)
  }, [searchQuery, users])

  // Decrypt messages when they change
  useEffect(() => {
    if (!currentUser || !selectedUser) return

    const decryptAllMessages = async () => {
      const newDecrypted = new Map<string, string>()
      
      for (const message of messages) {
        try {
          const decrypted = await decryptMessage(
            message.content,
            message.sender_id,
            message.receiver_id
          )
          newDecrypted.set(message.id, decrypted)
        } catch (error) {
          console.error('Failed to decrypt message:', error)
          newDecrypted.set(message.id, '[Encrypted]')
        }
      }
      
      setDecryptedMessages(newDecrypted)
    }

    decryptAllMessages()
  }, [messages, currentUser, selectedUser])

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setCurrentUser(profile)
      setLoading(false)
    } catch (error) {
      console.error('Error loading user:', error)
      router.push('/login')
    }
  }

  const loadUserSettings = async () => {
    if (!currentUser) return
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('message_delete_timer')
        .eq('id', currentUser.id)
        .single()

      if (profile?.message_delete_timer) {
        setDeleteTimer(profile.message_delete_timer as '24h' | '7d' | 'immediately' | 'off')
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser!.id)
        .order('username')

      setUsers(data || [])
      setFilteredUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadUnreadConversations = async () => {
    if (!currentUser) return

    try {
      // Get all unread messages for current user
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', currentUser.id)
        .eq('read', false)

      if (!unreadMessages || unreadMessages.length === 0) {
        setUnreadConversations([])
        return
      }

      // Count unread messages per sender
      const unreadCounts = new Map<string, number>()
      unreadMessages.forEach((msg) => {
        const count = unreadCounts.get(msg.sender_id) || 0
        unreadCounts.set(msg.sender_id, count + 1)
      })

      // Get profile info for senders
      const senderIds = Array.from(unreadCounts.keys())
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', senderIds)

      if (senderProfiles) {
        const conversations = senderProfiles.map((user) => ({
          user,
          count: unreadCounts.get(user.id) || 0,
        }))
        setUnreadConversations(conversations)
      }
    } catch (error) {
      console.error('Error loading unread conversations:', error)
    }
  }

  const loadMessages = async () => {
    if (!selectedUser || !currentUser) return

    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })

      setMessages(data || [])

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', selectedUser.id)
        .eq('receiver_id', currentUser.id)
        .eq('read', false)

      // Refresh unread conversations
      await loadUnreadConversations()
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser || !currentUser) return

    const messageContent = newMessage.trim()
    setNewMessage('') // Clear input immediately for better UX

    try {
      // Encrypt the message before sending
      const encryptedContent = await encryptMessage(
        messageContent,
        currentUser.id,
        selectedUser.id
      )

      const { data, error } = await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        content: encryptedContent, // Store encrypted content
      }).select()

      if (error) throw error

      // If realtime doesn't work, add message manually
      if (data && data.length > 0) {
        setMessages((current) => {
          const exists = current.some(msg => msg.id === data[0].id)
          if (exists) return current
          return [...current, data[0] as Message]
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent) // Restore message on error
    }
  }

  const handleCloseChat = async () => {
    if (deleteTimer === 'immediately' && selectedUser && currentUser) {
      try {
        // Delete all messages in this conversation
        await supabase
          .from('messages')
          .delete()
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
      } catch (error) {
        console.error('Error deleting messages:', error)
      }
    }
    // Refresh unread conversations first to ensure read status is reflected
    await loadUnreadConversations()
    // Then close the chat
    setSelectedUser(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const saveSettings = async () => {
    if (!currentUser) return

    try {
      // Prepare update data
      const updateData: any = { message_delete_timer: deleteTimer }
      
      // Add name if it was changed
      if (editedName.trim() && editedName.trim() !== currentUser.full_name) {
        updateData.full_name = editedName.trim()
      }

      // Update user profile
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id)

      if (error) throw error

      // Update local state if name was changed
      if (updateData.full_name) {
        setCurrentUser({ ...currentUser, full_name: updateData.full_name })
      }

      // Set up message cleanup if timer is enabled
      if (deleteTimer !== 'off') {
        await cleanupOldMessages()
      }

      setShowSettings(false)
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const handleDeleteAccount = async () => {
    if (!currentUser) return

    setDeleteError('')

    // Verify username matches
    if (deleteConfirmUsername !== currentUser.username) {
      setDeleteError('Username does not match')
      return
    }

    try {
      // Step 1: Delete all messages
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)

      if (messagesError) {
        console.error('Error deleting messages:', messagesError)
        throw new Error('Failed to delete messages')
      }

      // Step 2: Delete user settings if they exist
      await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', currentUser.id)

      // Step 3: Get user's email for auth deletion
      const { data: { user } } = await supabase.auth.getUser()
      
      // Step 4: Delete profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', currentUser.id)

      if (profileError) {
        console.error('Error deleting profile:', profileError)
        throw new Error('Failed to delete profile')
      }

      // Step 5: Delete auth account using admin API
      // Note: This requires the delete_user edge function or admin access
      if (user) {
        // Try to call the RPC function if it exists
        const { error: rpcError } = await supabase.rpc('delete_auth_user', {
          user_id: currentUser.id
        })
        
        // If RPC fails, continue anyway as profile is deleted
        if (rpcError) {
          console.log('Auth user deletion requires manual cleanup or edge function')
        }
      }

      // Sign out and redirect
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error: any) {
      console.error('Error deleting account:', error)
      setDeleteError(error.message || 'Failed to delete account. Please try again.')
    }
  }

  const cleanupOldMessages = async () => {
    if (!currentUser || deleteTimer === 'off' || deleteTimer === 'immediately') return

    try {
      const now = new Date()
      let cutoffDate: Date

      if (deleteTimer === '24h') {
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      } else { // 7d
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }

      // Delete messages older than cutoff date
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .lt('created_at', cutoffDate.toISOString())

      if (error) throw error

      // Reload messages if a chat is open
      if (selectedUser) {
        loadMessages()
      }
    } catch (error) {
      console.error('Error cleaning up messages:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-gray-900 dark:via-green-900 dark:to-emerald-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-emerald-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Image
                src="/logo.png"
                alt="Universe Chat Logo"
                width={40}
                height={40}
                priority
              />
              <h1 className="text-xl font-bold text-white">Universe Chat</h1>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/20 rounded-lg transition text-white"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {currentUser?.full_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{currentUser?.username}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Unread Messages Section */}
        {unreadConversations.filter(({ user }) => user.id !== selectedUser?.id).length > 0 && (
          <>
            <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
              <h3 className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
                Unread Messages ({unreadConversations.filter(({ user }) => user.id !== selectedUser?.id).length})
              </h3>
            </div>
            <div className="border-b-2 border-green-500">
              {unreadConversations.filter(({ user }) => user.id !== selectedUser?.id).map(({ user, count }) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition relative bg-green-50/50 dark:bg-green-900/10"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center flex-shrink-0 relative">
                    <span className="text-white font-semibold text-lg">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                      {count}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold truncate">
                      {count} new {count === 1 ? 'message' : 'messages'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:text-white"
              />
            </div>
            <button
              onClick={loadUsers}
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              title="Refresh user list"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                  selectedUser?.id === user.id ? 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-600' : ''
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-lg">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{user.username}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Settings Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setEditedName(currentUser?.full_name || '')
              setShowSettings(true)
            }}
            className="w-full flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Settings</span>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {selectedUser.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {selectedUser.full_name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{selectedUser.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={loadMessages}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Refresh messages"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={handleCloseChat}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Close chat"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isSent = message.sender_id === currentUser?.id
                return (
                  <div
                    key={message.id}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isSent
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p className="text-sm break-words">
                        {decryptedMessages.get(message.id) || 'Decrypting...'}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isSent ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Message Input */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              <form onSubmit={sendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-full inline-block mb-4">
                <MessageSquare className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Universe Chat
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Select a user to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    
    {/* Settings Modal */}
    {showSettings && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Disappearing Message Timer
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="deleteTimer"
                    value="off"
                    checked={deleteTimer === 'off'}
                    onChange={(e) => setDeleteTimer(e.target.value as 'off')}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">Off - Keep all messages</span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="deleteTimer"
                    value="immediately"
                    checked={deleteTimer === 'immediately'}
                    onChange={(e) => setDeleteTimer(e.target.value as 'immediately')}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">Immediately - Delete when closing chat</span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="deleteTimer"
                    value="24h"
                    checked={deleteTimer === '24h'}
                    onChange={(e) => setDeleteTimer(e.target.value as '24h')}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">24 hours - Delete messages after 1 day</span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="deleteTimer"
                    value="7d"
                    checked={deleteTimer === '7d'}
                    onChange={(e) => setDeleteTimer(e.target.value as '7d')}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">7 days - Delete messages after 1 week</span>
                </label>
              </div>
            </div>

            {/* Delete Account Section */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Once you delete your account, there is no going back. All your messages and data will be permanently removed.
              </p>
              <button
                onClick={() => {
                  setShowDeleteModal(true)
                  setDeleteConfirmUsername('')
                  setDeleteError('')
                }}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Delete Account
              </button>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Delete Account Confirmation Modal */}
    {showDeleteModal && currentUser && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={() => setShowDeleteModal(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border-2 border-red-500" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Delete Account</h2>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Please type <span className="font-bold text-red-600 dark:text-red-400">{currentUser.username}</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmUsername}
              onChange={(e) => setDeleteConfirmUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:text-white"
            />
            {deleteError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {deleteError}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmUsername !== currentUser.username}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Footer */}
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-2 px-4">
      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        Developed by Adeepa Wedage
      </p>
    </footer>
  </div>
  )
}
