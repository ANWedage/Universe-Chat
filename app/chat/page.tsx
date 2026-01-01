'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Send, LogOut, User, MessageSquare, RefreshCw, X, Settings, Trash2, MoreVertical, CheckSquare, Square, Upload, Smile, Menu, Reply, Check, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { storage } from '@/lib/storage'
import { requestNotificationPermission, showNotification, setupNotificationListeners, testNotification } from '@/lib/notifications'
import { initPushNotifications, setupPushNotificationListeners } from '@/lib/push-notifications'

const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '😎',
  '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
  '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞',
  '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '💪', '🦾', '🖕', '✍️', '🤳', '💅', '🦵',
  '🦿', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯',
  '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️',
  '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️',
  '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭',
  '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️',
  '❎', '🌐', '💠', '🎉', '🎊', '🎁', '🎈', '🎀', '🎂', '🎄', '🎃', '👻', '🎅', '🎆', '🎇', '🧨', '✨', '🎋', '🎍', '🎎',
  '🎏', '🎐', '🎑', '🧧', '🎀', '🎗️', '🎟️', '🎫', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '⚾', '🥎', '🏀', '🏐', '🏈',
  '🏉', '🎾', '🥏', '🎳', '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸️', '🎣', '🤿', '🎽', '🎿', '🛷'
]

type Profile = {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  last_seen: string | null
}

type Group = {
  id: string
  name: string
  created_by: string
  created_at: string
  photo_url?: string | null
  delete_timer?: '24h' | '3d' | 'off'
}

type GroupMember = {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  profiles?: Profile
}

type Message = {
  id: string
  sender_id: string
  receiver_id: string | null
  group_id: string | null
  content: string
  created_at: string
  read: boolean
  delivered: boolean
  deleted_by_sender: boolean
  deleted_by_receiver: boolean
  image_url: string | null
  reply_to: string | null
}

export default function Chat() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [deleteTimer, setDeleteTimer] = useState<'24h' | '7d' | 'immediately' | 'off'>('off')
  const [editedName, setEditedName] = useState('')
  const [fontSize, setFontSize] = useState<number>(14)
  const [unreadConversations, setUnreadConversations] = useState<Array<{ user: Profile; count: number }>>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null)
  const [showDeleteSubmenu, setShowDeleteSubmenu] = useState(false)
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [showMultiSelectMenu, setShowMultiSelectMenu] = useState(false)
  const [showMultiSelectDeleteSubmenu, setShowMultiSelectDeleteSubmenu] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'myChats' | 'groups'>('all')
  const [myChatsUsers, setMyChatsUsers] = useState<Profile[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<Set<string>>(new Set())
  const [groupSearchQuery, setGroupSearchQuery] = useState('')
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showGroupMembers, setShowGroupMembers] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [groupDeleteTimer, setGroupDeleteTimer] = useState<'24h' | '3d' | 'off'>('off')
  const [uploadingGroupPhoto, setUploadingGroupPhoto] = useState(false)
  const [contextMenuUser, setContextMenuUser] = useState<string | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [viewingAvatar, setViewingAvatar] = useState<{ url: string; name: string } | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Helper function to check if user is online (active within last 30 seconds)
  const isUserOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffInSeconds = (now.getTime() - lastSeenDate.getTime()) / 1000
    return diffInSeconds < 30
  }

  // Update user's last_seen timestamp
  const updateLastSeen = async () => {
    if (!currentUser) return
    try {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', currentUser.id)
    } catch (error) {
      console.error('Error updating last seen:', error)
    }
  }

  useEffect(() => {
    loadUser()
    
    // Request notification permission with logging
    const initNotifications = async () => {
      console.log('Requesting notification permission...')
      const granted = await requestNotificationPermission()
      console.log('Notification permission granted:', granted)
      
      // Initialize push notifications for mobile
      if (currentUser) {
        console.log('Initializing push notifications...')
        const token = await initPushNotifications(currentUser.id)
        if (token) {
          console.log('Push notifications initialized successfully')
        }
        setupPushNotificationListeners()
      }
    }
    initNotifications()
    
    // Setup notification click listeners for mobile
    setupNotificationListeners((userId) => {
      // Handle notification click - navigate to that user's chat
      if (userId) {
        const user = users.find(u => u.id === userId)
        if (user) {
          setSelectedUser(user)
        }
      }
    })
    
    // Add click handler to close context menu
    const handleClick = () => setContextMenuUser(null)
    document.addEventListener('click', handleClick)
    
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])

  // Update last_seen when user is logged in
  useEffect(() => {
    if (!currentUser) return

    // Update last_seen immediately
    updateLastSeen()

    // Mark undelivered messages as delivered when user comes online
    const markAsDelivered = async () => {
      try {
        await supabase
          .from('messages')
          .update({ delivered: true })
          .eq('receiver_id', currentUser.id)
          .eq('delivered', false)
      } catch (error) {
        console.error('Error marking messages as delivered:', error)
      }
    }
    markAsDelivered()

    // Update last_seen every 1 second for immediate status
    const lastSeenInterval = setInterval(() => {
      updateLastSeen()
    }, 1000)

    // Update last_seen on page unload/close
    const handleBeforeUnload = () => {
      updateLastSeen()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(lastSeenInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      updateLastSeen()
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      loadUsers()
      loadUserSettings()
      loadUnreadConversations()
      loadGroups()
      
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
          async (payload) => {
            console.log('New incoming message:', payload.new)
            const newMessage = payload.new as Message
            
            // Add message to the messages list in real-time
            setMessages((current) => {
              const exists = current.some(msg => msg.id === newMessage.id)
              if (exists) return current
              return [...current, newMessage]
            })
            
            // Show notification only if app is in background
            console.log('Message received. Document hidden:', document.hidden)
            
            if (document.hidden) {
              try {
                console.log('Getting sender info for notification...')
                // Get sender info
                const { data: sender } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', newMessage.sender_id)
                  .single()
                
                if (sender) {
                  console.log('Showing notification for new message...')
                  
                  console.log('Showing notification:', sender.full_name, newMessage.content)
                  await showNotification(
                    sender.full_name,
                    newMessage.content,
                    newMessage.sender_id
                  )
                }
              } catch (error) {
                console.error('Error showing notification:', error)
              }
            } else {
              console.log('Skipping notification - chat is active and visible')
            }
            
            loadUnreadConversations()
            loadMyChatsUsers() // Update My Chats list
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${currentUser.id}`,
          },
          (payload) => {
            console.log('Message updated:', payload.new)
            // Reload unread count when message read status changes
            loadUnreadConversations()
          }
        )
        .subscribe()

      // Subscribe to messages sent by current user to update My Chats
      const outgoingChannel = supabase
        .channel('outgoing-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${currentUser.id}`,
          },
          (payload) => {
            console.log('New outgoing message:', payload.new)
            loadMyChatsUsers() // Update My Chats list
          }
        )
        .subscribe()

      // Subscribe to profile updates for last_seen status
      const profileUpdatesChannel = supabase
        .channel('profile-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
          },
          (payload) => {
            const updatedProfile = payload.new as Profile
            // Update users list with new last_seen
            setUsers((current) => 
              current.map(u => u.id === updatedProfile.id ? updatedProfile : u)
            )
            setFilteredUsers((current) => 
              current.map(u => u.id === updatedProfile.id ? updatedProfile : u)
            )
            setMyChatsUsers((current) => 
              current.map(u => u.id === updatedProfile.id ? updatedProfile : u)
            )
            // Update selectedUser if it's the one that changed
            setSelectedUser((current) => 
              current && current.id === updatedProfile.id ? updatedProfile : current
            )
          }
        )
        .subscribe()

      return () => {
        clearInterval(cleanupInterval)
        supabase.removeChannel(profilesChannel)
        supabase.removeChannel(incomingChannel)
        supabase.removeChannel(outgoingChannel)
        supabase.removeChannel(profileUpdatesChannel)
      }
    }
  }, [currentUser, searchQuery])

  useEffect(() => {
    if (selectedUser && currentUser) {
      setSelectedGroup(null) // Clear group selection
      loadMessages()
      
      // Subscribe to new messages with a unique channel name
      const channelName = `chat:${currentUser.id}:${selectedUser.id}:${Date.now()}`
      let channel: any = null
      let reconnectTimer: NodeJS.Timeout | null = null
      let healthCheckTimer: NodeJS.Timeout | null = null
      let isSubscribed = false

      const setupSubscription = () => {
        console.log('Setting up message subscription for', selectedUser.full_name)
        
        // Remove old channel if exists
        if (channel) {
          try {
            supabase.removeChannel(channel)
          } catch (e) {
            console.error('Error removing old channel:', e)
          }
        }

        channel = supabase
          .channel(channelName, {
            config: {
              broadcast: { self: false },
              presence: { key: '' }
            }
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            async (payload) => {
              const newMessage = payload.new as Message
              console.log('Received new message:', newMessage.id)
              
              // Only add message if it's part of this conversation
              if (
                (newMessage.sender_id === currentUser.id && newMessage.receiver_id === selectedUser.id) ||
                (newMessage.sender_id === selectedUser.id && newMessage.receiver_id === currentUser.id)
              ) {
                // Mark message as read if it's from the other user and we're viewing the chat
                if (newMessage.sender_id === selectedUser.id && newMessage.receiver_id === currentUser.id) {
                  await supabase
                    .from('messages')
                    .update({ read: true })
                    .eq('id', newMessage.id)
                  
                  // Update the message in state with read: true
                  newMessage.read = true
                  
                  // Refresh unread conversations count
                  await loadUnreadConversations()
                  
                  // Show notification only if app is in background
                  if (document.hidden) {
                    try {
                      console.log('App is in background, showing notification...')
                      await showNotification(
                        selectedUser.full_name,
                        newMessage.content,
                        selectedUser.id
                      )
                    } catch (error) {
                      console.error('Error showing notification:', error)
                    }
                  } else {
                    console.log('Window is visible, skipping notification')
                  }
                }
                
                setMessages((current) => {
                  // Avoid duplicates
                  const exists = current.some(msg => msg.id === newMessage.id)
                  if (exists) return current
                  return [...current, newMessage]
                })
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
            },
            (payload) => {
              const updatedMessage = payload.new as Message
              // Update message status in local state (delivered/read status)
              if (
                (updatedMessage.sender_id === currentUser.id && updatedMessage.receiver_id === selectedUser.id) ||
                (updatedMessage.sender_id === selectedUser.id && updatedMessage.receiver_id === currentUser.id)
              ) {
                setMessages((current) =>
                  current.map((msg) =>
                    msg.id === updatedMessage.id
                      ? { ...msg, delivered: updatedMessage.delivered, read: updatedMessage.read }
                      : msg
                  )
                )
              }
            }
          )
          .subscribe((status, err) => {
            console.log('Subscription status:', status, err)
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time subscription active for', selectedUser.full_name)
              isSubscribed = true
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Channel error, will retry...', err)
              isSubscribed = false
              // Retry after 3 seconds
              if (reconnectTimer) clearTimeout(reconnectTimer)
              reconnectTimer = setTimeout(() => {
                console.log('Retrying subscription...')
                setupSubscription()
              }, 3000)
            } else if (status === 'TIMED_OUT') {
              console.error('⏱️ Subscription timed out, reconnecting...', err)
              isSubscribed = false
              setupSubscription()
            } else if (status === 'CLOSED') {
              console.log('Channel closed')
              isSubscribed = false
            }
          })
      }

      // Initial subscription
      setupSubscription()

      // Health check every 30 seconds
      healthCheckTimer = setInterval(() => {
        if (!isSubscribed) {
          console.log('Health check: subscription not active, reconnecting...')
          setupSubscription()
        }
      }, 30000)

      // Handle visibility change for mobile apps going to background/foreground
      const handleVisibilityChange = () => {
        if (!document.hidden && !isSubscribed) {
          console.log('App became visible, reconnecting subscription...')
          setupSubscription()
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Handle online/offline events
      const handleOnline = () => {
        console.log('Network online, reconnecting subscription...')
        setTimeout(() => setupSubscription(), 1000)
      }
      window.addEventListener('online', handleOnline)

      return () => {
        console.log('Cleaning up message subscription')
        isSubscribed = false
        if (reconnectTimer) clearTimeout(reconnectTimer)
        if (healthCheckTimer) clearInterval(healthCheckTimer)
        if (channel) {
          try {
            supabase.removeChannel(channel)
          } catch (e) {
            console.error('Error removing channel on cleanup:', e)
          }
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('online', handleOnline)
      }
    }
  }, [selectedUser, currentUser])

  useEffect(() => {
    if (selectedGroup && currentUser) {
      setSelectedUser(null) // Clear user selection
      loadGroupMessages()
      loadGroupMembers(selectedGroup.id)
      
      // Subscribe to group messages
      const channelName = `group:${selectedGroup.id}:${Date.now()}`
      let channel: any = null
      let reconnectTimer: NodeJS.Timeout | null = null
      let healthCheckTimer: NodeJS.Timeout | null = null
      let isSubscribed = false

      const setupSubscription = () => {
        console.log('Setting up group subscription for', selectedGroup.name)
        
        if (channel) {
          try {
            supabase.removeChannel(channel)
          } catch (e) {
            console.error('Error removing old channel:', e)
          }
        }

        channel = supabase
          .channel(channelName, {
            config: {
              broadcast: { self: false },
              presence: { key: '' }
            }
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `group_id=eq.${selectedGroup.id}`
            },
            async (payload) => {
              const newMessage = payload.new as Message
              console.log('Received new group message:', newMessage.id)
              
              // Show notification only if message is from someone else and app is in background
              if (newMessage.sender_id !== currentUser.id && document.hidden) {
                try {
                  console.log('App is in background, showing group notification...')
                  // Get sender info
                  const { data: sender } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', newMessage.sender_id)
                    .single()
                  
                  if (sender && newMessage.group_id) {
                    await showNotification(
                      `${sender.full_name} in ${selectedGroup.name}`,
                      newMessage.content,
                      newMessage.sender_id
                    )
                  }
                } catch (error) {
                  console.error('Error showing group notification:', error)
                }
              }
              
              setMessages((current) => {
                const exists = current.some(msg => msg.id === newMessage.id)
                if (exists) return current
                return [...current, newMessage]
              })
            }
          )
          .subscribe((status, err) => {
            console.log('Group subscription status:', status, err)
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Group real-time subscription active for', selectedGroup.name)
              isSubscribed = true
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Group channel error, will retry...', err)
              isSubscribed = false
              if (reconnectTimer) clearTimeout(reconnectTimer)
              reconnectTimer = setTimeout(() => {
                console.log('Retrying group subscription...')
                setupSubscription()
              }, 3000)
            } else if (status === 'TIMED_OUT') {
              console.error('⏱️ Group subscription timed out, reconnecting...', err)
              isSubscribed = false
              setupSubscription()
            } else if (status === 'CLOSED') {
              console.log('Group channel closed')
              isSubscribed = false
            }
          })
      }

      // Initial subscription
      setupSubscription()

      // Health check every 30 seconds
      healthCheckTimer = setInterval(() => {
        if (!isSubscribed) {
          console.log('Health check: group subscription not active, reconnecting...')
          setupSubscription()
        }
      }, 30000)

      // Handle visibility change
      const handleVisibilityChange = () => {
        if (!document.hidden && !isSubscribed) {
          console.log('App became visible, reconnecting group subscription...')
          setupSubscription()
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Handle online/offline events
      const handleOnline = () => {
        console.log('Network online, reconnecting group subscription...')
        setTimeout(() => setupSubscription(), 1000)
      }
      window.addEventListener('online', handleOnline)

      return () => {
        console.log('Cleaning up group subscription')
        isSubscribed = false
        if (reconnectTimer) clearTimeout(reconnectTimer)
        if (healthCheckTimer) clearInterval(healthCheckTimer)
        if (channel) {
          try {
            supabase.removeChannel(channel)
          } catch (e) {
            console.error('Error removing channel on cleanup:', e)
          }
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('online', handleOnline)
      }
    }
  }, [selectedGroup, currentUser])

  useEffect(() => {
    const baseUsers = activeTab === 'all' ? users : myChatsUsers
    const filtered = baseUsers.filter((user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredUsers(filtered)
  }, [searchQuery, users, myChatsUsers, activeTab])

  // Smart auto-scroll: only scroll if user is near the bottom
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    // Check if user is near the bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    
    // Only auto-scroll if user is near the bottom or hasn't manually scrolled
    if (isNearBottom || !isUserScrolling) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages])

  // Track manual scrolling
  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    
    // If user scrolls away from bottom, mark as manually scrolling
    if (!isNearBottom) {
      setIsUserScrolling(true)
    } else {
      // If user scrolls back near bottom, allow auto-scroll again
      setIsUserScrolling(false)
    }
  }

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
      
      // Load users with recent chats
      await loadMyChatsUsers()
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadMyChatsUsers = async () => {
    if (!currentUser) return

    try {
      // Get all direct messages (not group messages) where current user is sender or receiver
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .is('group_id', null)  // Only get direct messages, not group messages
        .order('created_at', { ascending: false })

      console.log('My Chats - recent messages:', recentMessages)

      if (!recentMessages || recentMessages.length === 0) {
        setMyChatsUsers([])
        return
      }

      // Get unique user IDs from conversations (filter out null receiver_ids from group messages)
      const userIds = new Set<string>()
      recentMessages.forEach((msg) => {
        if (msg.sender_id && msg.sender_id !== currentUser.id && msg.receiver_id) {
          userIds.add(msg.sender_id)
        }
        if (msg.receiver_id && msg.receiver_id !== currentUser.id && msg.receiver_id) {
          userIds.add(msg.receiver_id)
        }
      })

      console.log('My Chats - unique user IDs:', Array.from(userIds))

      if (userIds.size === 0) {
        setMyChatsUsers([])
        return
      }

      // Get profiles for these users
      const { data: chatUsers } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(userIds))

      console.log('My Chats - loaded users:', chatUsers)
      setMyChatsUsers(chatUsers || [])
    } catch (error) {
      console.error('Error loading my chats users:', error)
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

  const loadGroups = async () => {
    if (!currentUser) return

    try {
      // Get groups where current user is a member
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUser.id)

      if (!memberData || memberData.length === 0) {
        setGroups([])
        return
      }

      const groupIds = memberData.map(m => m.group_id)

      // Get group details
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false })

      setGroups(groupsData || [])
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

  const loadGroupMembers = async (groupId: string) => {
    try {
      const { data } = await supabase
        .from('group_members')
        .select('*, profiles(*)')
        .eq('group_id', groupId)

      setGroupMembers(data || [])
    } catch (error) {
      console.error('Error loading group members:', error)
    }
  }

  const createGroup = async () => {
    if (!currentUser || !newGroupName.trim() || selectedUsersForGroup.size === 0) {
      alert('Please enter a group name and select at least one member')
      return
    }

    try {
      console.log('Creating group:', newGroupName.trim())
      console.log('Current user:', currentUser.id)
      console.log('Selected members:', Array.from(selectedUsersForGroup))
      
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          created_by: currentUser.id
        })
        .select()
        .single()

      console.log('Group creation response:', { groupData, groupError })

      if (groupError) {
        console.error('Group creation error:', groupError)
        throw new Error(`Failed to create group: ${groupError.message}`)
      }

      // Add members (including creator)
      const membersToAdd = [currentUser.id, ...Array.from(selectedUsersForGroup)]
      console.log('Adding members:', membersToAdd)
      
      const { error: membersError } = await supabase
        .from('group_members')
        .insert(
          membersToAdd.map(userId => ({
            group_id: groupData.id,
            user_id: userId
          }))
        )

      console.log('Members add response:', membersError)

      if (membersError) {
        console.error('Members add error:', membersError)
        throw new Error(`Failed to add members: ${membersError.message}`)
      }

      // Reset and refresh
      setNewGroupName('')
      setSelectedUsersForGroup(new Set())
      setGroupSearchQuery('')
      setShowCreateGroupModal(false)
      await loadGroups()
      setActiveTab('groups')
    } catch (error) {
      console.error('Error creating group:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      alert(`Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const addGroupMember = async (userId: string) => {
    if (!selectedGroup || !currentUser) return

    // Check if user is group creator
    if (selectedGroup.created_by !== currentUser.id) {
      alert('Only the group creator can add members')
      return
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: selectedGroup.id,
          user_id: userId
        })

      if (error) throw error

      await loadGroupMembers(selectedGroup.id)
      setShowAddMemberModal(false)
      setGroupSearchQuery('')
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member')
    }
  }

  const removeGroupMember = async (userId: string) => {
    if (!selectedGroup || !currentUser) return

    // Check if user is group creator or removing themselves
    if (selectedGroup.created_by !== currentUser.id && userId !== currentUser.id) {
      alert('Only the group creator can remove members')
      return
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .eq('user_id', userId)

      if (error) throw error

      // If user removed themselves, close the group chat
      if (userId === currentUser.id) {
        setSelectedGroup(null)
        setGroupMembers([])
        await loadGroups()
      } else {
        await loadGroupMembers(selectedGroup.id)
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    }
  }

  const loadMessages = async () => {
    if (!selectedUser || !currentUser) return

    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .is('group_id', null)
        .order('created_at', { ascending: true })

      // Filter out messages deleted by current user
      const filteredMessages = (data || []).filter((msg: Message) => {
        if (msg.sender_id === currentUser.id && msg.deleted_by_sender) return false
        if (msg.receiver_id === currentUser.id && msg.deleted_by_receiver) return false
        return true
      })

      setMessages(filteredMessages)

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

  const loadGroupMessages = async () => {
    if (!selectedGroup || !currentUser) return

    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', selectedGroup.id)
        .order('created_at', { ascending: true })

      setMessages(data || [])
    } catch (error) {
      console.error('Error loading group messages:', error)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }
    
    setSelectedImage(file)
    sendImageMessage(file)
  }

  const sendImageMessage = async (file: File) => {
    if (!selectedUser || !currentUser) return
    
    setUploadingImage(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`
      const filePath = `chat-images/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file)
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath)
      
      const { data, error } = await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        content: '',
        image_url: publicUrl,
      }).select()
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setMessages((current) => {
          const exists = current.some(msg => msg.id === data[0].id)
          if (exists) return current
          return [...current, data[0] as Message]
        })
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to send image. Please try again.')
    } finally {
      setUploadingImage(false)
      setSelectedImage(null)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || (!selectedUser && !selectedGroup) || !currentUser) return

    const messageContent = newMessage.trim()
    setNewMessage('') // Clear input immediately for better UX
    
    // Blur the input to prevent zoom issues on mobile
    if (messageInputRef.current) {
      messageInputRef.current.blur()
    }

    try {
      console.log('Starting message send...')
      console.log('Current user:', currentUser.id)
      console.log('Selected user:', selectedUser?.id)
      console.log('Selected group:', selectedGroup?.id)
      console.log('Message content:', messageContent)
      
      // Fetch latest receiver status to check if they're online (for direct messages)
      let isReceiverOnline = false
      if (selectedUser && !selectedGroup) {
        const { data: latestUserData } = await supabase
          .from('profiles')
          .select('last_seen')
          .eq('id', selectedUser.id)
          .single()
        
        if (latestUserData) {
          isReceiverOnline = isUserOnline(latestUserData.last_seen)
          console.log('Receiver online status:', isReceiverOnline, 'Last seen:', latestUserData.last_seen)
        }
      }

      console.log('Attempting database insert...')
      
      const messageData: any = {
        sender_id: currentUser.id,
        content: messageContent,
        reply_to: replyingTo?.id || null,
        delivered: selectedGroup ? true : isReceiverOnline, // Group messages are always delivered, DM delivered if user online
      }

      if (selectedGroup) {
        messageData.group_id = selectedGroup.id
        messageData.receiver_id = null
      } else {
        messageData.receiver_id = selectedUser!.id
        messageData.group_id = null
      }

      const { data, error } = await supabase.from('messages').insert(messageData).select()

      console.log('Insert response:', { data, error })

      if (error) {
        console.error('Database error:', error)
        throw new Error('Database error: ' + error.message)
      }

      // If realtime doesn't work, add message manually
      if (data && data.length > 0) {
        const newMsg = data[0] as Message
        setMessages((current) => {
          const exists = current.some(msg => msg.id === newMsg.id)
          if (exists) return current
          return [...current, newMsg]
        })
      }
      
      // Update My Chats list when sending a message
      if (selectedUser) {
        console.log('Updating My Chats after sending message to:', selectedUser.username)
        setMyChatsUsers((current) => {
          const exists = current.some(u => u.id === selectedUser.id)
          if (exists) {
            console.log('User already in My Chats')
            return current
          }
          console.log('Adding user to My Chats')
          return [...current, selectedUser]
        })
      }
      
      // Reload My Chats to ensure it's up to date
      console.log('Reloading My Chats users...')
      await loadMyChatsUsers()
      
      // Clear reply state
      setReplyingTo(null)
      
      // Always scroll to bottom when sending a message
      setIsUserScrolling(false)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (error) {
      console.error('Error sending message:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    setMessageMenuOpen(null)
    setShowDeleteSubmenu(false)
    setMultiSelectMode(false)
    setSelectedMessages(new Set())
    setShowMultiSelectMenu(false)
    setShowMultiSelectDeleteSubmenu(false)
  }

  const deleteMessageForEveryone = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
      
      // Remove from local state
      setMessages((current) => current.filter(msg => msg.id !== messageId))
      setMessageMenuOpen(null)
      setShowDeleteSubmenu(false)
    } catch (error) {
      console.error('Error deleting message for everyone:', error)
    }
  }

  const deleteMessageForMe = async (messageId: string) => {
    if (!currentUser) return

    try {
      const message = messages.find(msg => msg.id === messageId)
      if (!message) return

      const isSender = message.sender_id === currentUser.id
      
      await supabase
        .from('messages')
        .update({ 
          [isSender ? 'deleted_by_sender' : 'deleted_by_receiver']: true 
        })
        .eq('id', messageId)
      
      // Remove from local state
      setMessages((current) => current.filter(msg => msg.id !== messageId))
      setMessageMenuOpen(null)
      setShowDeleteSubmenu(false)
    } catch (error) {
      console.error('Error deleting message for me:', error)
    }
  }

  const canDeleteMessage = (message: Message) => {
    if (!currentUser || message.sender_id !== currentUser.id) return false
    const messageTime = new Date(message.created_at).getTime()
    const now = new Date().getTime()
    const fiveMinutes = 5 * 60 * 1000
    return (now - messageTime) <= fiveMinutes
  }

  const handleDeleteChat = async (userId: string) => {
    if (!currentUser) return

    try {
      // Delete all messages in this conversation
      await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`)

      // Remove from My Chats list
      setMyChatsUsers((current) => current.filter(u => u.id !== userId))
      
      // Close chat if it's currently open
      if (selectedUser?.id === userId) {
        setSelectedUser(null)
      }
      
      setContextMenuUser(null)
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  const handleRightClick = (e: React.MouseEvent, userId: string) => {
    if (activeTab !== 'myChats') return
    
    e.preventDefault()
    setContextMenuUser(userId)
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
  }

  const handleCloseContextMenu = () => {
    setContextMenuUser(null)
  }

  const toggleMultiSelect = () => {
    setMultiSelectMode(!multiSelectMode)
    setSelectedMessages(new Set())
    setMessageMenuOpen(null)
    setShowDeleteSubmenu(false)
    setShowMultiSelectMenu(false)
    setShowMultiSelectDeleteSubmenu(false)
  }

  const toggleMessageSelection = (messageId: string) => {
    const newSelected = new Set(selectedMessages)
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId)
    } else {
      newSelected.add(messageId)
    }
    setSelectedMessages(newSelected)
  }

  const deleteSelectedMessages = async (deleteForEveryone: boolean) => {
    if (!currentUser || selectedMessages.size === 0) return

    try {
      const messageIds = Array.from(selectedMessages)
      
      if (deleteForEveryone) {
        // Delete messages completely from database
        await supabase
          .from('messages')
          .delete()
          .in('id', messageIds)
      } else {
        // Mark as deleted for current user
        for (const msgId of messageIds) {
          const message = messages.find(msg => msg.id === msgId)
          if (!message) continue
          
          const isSender = message.sender_id === currentUser.id
          await supabase
            .from('messages')
            .update({ 
              [isSender ? 'deleted_by_sender' : 'deleted_by_receiver']: true 
            })
            .eq('id', msgId)
        }
      }
      
      // Remove from local state
      setMessages((current) => current.filter(msg => !selectedMessages.has(msg.id)))
      setSelectedMessages(new Set())
      setMultiSelectMode(false)
      setShowMultiSelectMenu(false)
      setShowMultiSelectDeleteSubmenu(false)
    } catch (error) {
      console.error('Error deleting selected messages:', error)
    }
  }

  const handleLogout = async () => {
    // Update last_seen before logging out
    await updateLastSeen()
    
    // Clear remember me preference on explicit logout
    await storage.removeItem('rememberMe')
    
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentUser) return

    const file = e.target.files[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setUploadingAvatar(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id)

      if (updateError) throw updateError

      // Update local state
      setCurrentUser({ ...currentUser, avatar_url: publicUrl })
      
      // Reload users to update avatar in list
      await loadUsers()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Failed to upload avatar. Please try again.')
    } finally {
      setUploadingAvatar(false)
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
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          w-full sm:w-80 bg-gray-800 border-r border-gray-700 flex flex-col
          fixed md:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-gray-700 bg-gradient-to-r from-green-600 to-emerald-600">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center space-x-2 md:space-x-3">
              <Image
                src="/logo.png"
                alt="Universe Chat Logo"
                width={40}
                height={40}
                priority
                unoptimized
                className="w-8 h-8 md:w-10 md:h-10"
              />
              <h1 className="text-lg md:text-xl font-bold text-white">Universe Chat</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-2 hover:bg-white/20 active:bg-white/30 rounded-lg transition text-white"
                title="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-white/20 active:bg-white/30 rounded-lg transition text-white"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition"
                onClick={() => currentUser?.avatar_url && setViewingAvatar({ url: currentUser.avatar_url, name: currentUser.full_name })}
              >
                {currentUser?.avatar_url ? (
                  <Image
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {currentUser?.full_name}
                </p>
                <p className="text-xs text-gray-400 truncate">
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
                  onClick={() => {
                    setSelectedUser(user)
                    setIsSidebarOpen(false)
                  }}
                  className="w-full p-4 flex items-center space-x-3 hover:bg-gray-700 transition relative bg-green-900/10"
                >
                  <div 
                    className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden cursor-pointer hover:opacity-80 transition"
                    onClick={(e) => {
                      e.stopPropagation()
                      user.avatar_url && setViewingAvatar({ url: user.avatar_url, name: user.full_name })
                    }}
                  >
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.full_name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-white font-semibold text-lg">
                        {user.full_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                      {count}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-white truncate">
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

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-green-400 border-b-2 border-green-400 bg-green-900/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('myChats')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'myChats'
                  ? 'text-green-400 border-b-2 border-green-400 bg-green-900/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              My Chats ({myChatsUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'groups'
                  ? 'text-green-400 border-b-2 border-green-400 bg-green-900/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Groups ({groups.length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'groups' ? 'Search groups...' : 'Search users...'}
                value={activeTab === 'groups' ? groupSearchQuery : searchQuery}
                onChange={(e) => activeTab === 'groups' ? setGroupSearchQuery(e.target.value) : setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>
            {activeTab === 'groups' ? (
              <div className="flex gap-2">
                <button
                  onClick={loadGroups}
                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  title="Refresh groups"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                  title="Create new group"
                >
                  + Group
                </button>
              </div>
            ) : (
              <button
                onClick={loadUsers}
                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                title="Refresh user list"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Users List */}
        {activeTab !== 'groups' && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="relative">
                  <button
                    onClick={() => {
                      setSelectedUser(user)
                      setIsSidebarOpen(false)
                    }}
                    onContextMenu={(e) => handleRightClick(e, user.id)}
                    className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-700 transition ${
                      selectedUser?.id === user.id ? 'bg-green-900/30 border-l-4 border-green-600' : ''
                    }`}
                  >
                    <div 
                      className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition"
                      onClick={(e) => {
                        e.stopPropagation()
                        user.avatar_url && setViewingAvatar({ url: user.avatar_url, name: user.full_name })
                      }}
                    >
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.full_name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-white font-semibold text-lg">
                          {user.full_name.charAt(0).toUpperCase()}
                        </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center space-x-10">
                      <p className="text-sm font-semibold text-white truncate">
                        {user.full_name}
                      </p>
                      {isUserOnline(user.last_seen) && (
                        <span className="flex items-center text-[13px] text-green-500 flex-shrink-0">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                          Online
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      @{user.username}
                    </p>
                  </div>
                </button>
              </div>
            ))
          )}
        </div>
        )}

        {/* Groups List */}
        {activeTab === 'groups' && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {groups.filter(g => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())).length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                {groups.length === 0 ? 'No groups yet. Create one!' : 'No groups found'}
              </div>
            ) : (
              groups.filter(g => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())).map((group) => (
                <button
                  key={group.id}
                  onClick={() => {
                    setSelectedGroup(group)
                    setIsSidebarOpen(false)
                  }}
                  className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-700 transition ${
                    selectedGroup?.id === group.id ? 'bg-green-900/30 border-l-4 border-green-600' : ''
                  }`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {group.photo_url ? (
                      <Image
                        src={group.photo_url}
                        alt={group.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-white font-semibold text-lg">
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-white truncate">
                      {group.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {group.created_by === currentUser?.id ? 'Created by you' : 'Group chat'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Context Menu for My Chats */}
        {contextMenuUser && activeTab === 'myChats' && (
          <div
            style={{
              position: 'fixed',
              top: `${contextMenuPosition.y}px`,
              left: `${contextMenuPosition.x}px`,
              zIndex: 1000,
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleDeleteChat(contextMenuUser)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Chat</span>
            </button>
          </div>
        )}

        {/* Settings Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => {
              setEditedName(currentUser?.full_name || '')
              setShowSettings(true)
            }}
            className="w-full flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <Settings className="w-5 h-5 text-gray-300" />
            <span className="text-sm font-medium text-gray-200">Settings</span>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-900 w-full md:w-auto min-h-0 h-full">
        {selectedUser || selectedGroup ? (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-3 md:p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 hover:bg-gray-700 rounded-lg transition mr-2 flex-shrink-0"
                >
                  <Menu className="w-6 h-6 text-gray-400" />
                </button>
                
                {selectedUser && (
                  <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                    <div 
                      className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition"
                      onClick={() => selectedUser.avatar_url && setViewingAvatar({ url: selectedUser.avatar_url, name: selectedUser.full_name })}
                    >
                      {selectedUser.avatar_url ? (
                        <Image
                          src={selectedUser.avatar_url}
                          alt={selectedUser.full_name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-white font-semibold">
                          {selectedUser.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-white truncate">
                        <span className="md:hidden">{selectedUser.full_name.split(' ')[0]}</span>
                        <span className="hidden md:inline">{selectedUser.full_name}</span>
                      </h2>
                      <p className="text-xs text-gray-400">
                        {isUserOnline(selectedUser.last_seen) ? (
                          <span className="text-green-500 flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                            Online
                          </span>
                        ) : selectedUser.last_seen ? (
                          `Last seen ${new Date(selectedUser.last_seen).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            hour12: true 
                          })}`
                        ) : (
                          '@' + selectedUser.username
                        )}
                    </p>
                  </div>
                </div>
                )}

                {selectedGroup && (
                  <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {selectedGroup.photo_url ? (
                        <Image
                          src={selectedGroup.photo_url}
                          alt={selectedGroup.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-white font-semibold">
                          {selectedGroup.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-white truncate">
                        {selectedGroup.name}
                      </h2>
                      <p className="text-xs text-gray-400 truncate">
                        {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                  {selectedGroup && (
                    <>
                      <button
                        onClick={() => setShowGroupSettings(true)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Group settings"
                      >
                        <Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setShowGroupMembers(!showGroupMembers)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Group members"
                      >
                        <User className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      </button>
                    </>
                  )}
                  {selectedUser && messages.length > 0 && (
                    <button
                      onClick={toggleMultiSelect}
                      className={`p-2 hover:bg-gray-700 rounded-lg transition-colors ${
                        multiSelectMode ? 'bg-green-100 dark:bg-green-900/30' : ''
                      }`}
                      title="Select multiple messages"
                    >
                      <CheckSquare className={`w-4 h-4 md:w-5 md:h-5 ${
                        multiSelectMode ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                      }`} />
                    </button>
                  )}
                  <button
                    onClick={selectedUser ? loadMessages : loadGroupMessages}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Refresh messages"
                  >
                    <RefreshCw className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(null)
                      setSelectedGroup(null)
                      setShowGroupMembers(false)
                    }}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Close chat"
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Group Members Sidebar */}
            {selectedGroup && showGroupMembers && (
              <div className="bg-gray-800 border-b border-gray-700 p-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Group Members</h3>
                  {selectedGroup.created_by === currentUser?.id && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition"
                    >
                      + Add
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">
                        {member.profiles?.full_name || 'Unknown'}
                        {member.user_id === selectedGroup.created_by && (
                          <span className="ml-2 text-xs text-green-400">(Creator)</span>
                        )}
                      </span>
                      {selectedGroup.created_by === currentUser?.id && member.user_id !== currentUser?.id && (
                        <button
                          onClick={() => removeGroupMember(member.user_id)}
                          className="text-red-400 hover:text-red-300 transition"
                          title="Remove member"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {member.user_id === currentUser?.id && member.user_id !== selectedGroup.created_by && (
                        <button
                          onClick={() => removeGroupMember(currentUser.id)}
                          className="text-xs text-gray-400 hover:text-white transition"
                        >
                          Leave
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-select Toolbar */}
            {multiSelectMode && selectedMessages.size > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 px-4 py-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {selectedMessages.size} message{selectedMessages.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowMultiSelectMenu(!showMultiSelectMenu)
                        setShowMultiSelectDeleteSubmenu(false)
                      }}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                      title="Delete options"
                    >
                      <MoreVertical className="w-5 h-5 text-green-700 dark:text-green-400" />
                    </button>
                    {showMultiSelectMenu && (
                      <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px] z-10">
                        <button
                          onClick={() => setShowMultiSelectDeleteSubmenu(!showMultiSelectDeleteSubmenu)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-gray-300 flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                    {showMultiSelectDeleteSubmenu && showMultiSelectMenu && (
                      <div className="absolute top-full mt-2 right-[152px] bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px] z-10">
                        <button
                          onClick={() => deleteSelectedMessages(true)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete for everyone</span>
                        </button>
                        <button
                          onClick={() => deleteSelectedMessages(false)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-gray-300 flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete for me</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide min-h-0"
            >
              {messages.map((message, index) => {
                const isSent = message.sender_id === currentUser?.id
                const isDeletable = canDeleteMessage(message)
                const isTopHalf = index < messages.length / 2
                const isSelected = selectedMessages.has(message.id)
                
                // Get sender name for group messages
                const senderName = selectedGroup && !isSent 
                  ? groupMembers.find(m => m.user_id === message.sender_id)?.profiles?.full_name || 'Unknown'
                  : null
                
                let touchTimer: NodeJS.Timeout | null = null
                let touchStartX = 0
                let touchStartY = 0
                
                const handleTouchStart = (e: React.TouchEvent) => {
                  touchStartX = e.touches[0].clientX
                  touchStartY = e.touches[0].clientY
                  
                  if (multiSelectMode) return
                  touchTimer = setTimeout(() => {
                    setMessageMenuOpen(message.id)
                    setShowDeleteSubmenu(false)
                  }, 1000)
                }
                
                const handleTouchMove = (e: React.TouchEvent) => {
                  if (touchTimer) {
                    clearTimeout(touchTimer)
                  }
                }
                
                const handleTouchEnd = (e: React.TouchEvent) => {
                  if (touchTimer) {
                    clearTimeout(touchTimer)
                  }
                  
                  // Calculate swipe distance
                  const touchEndX = e.changedTouches[0].clientX
                  const touchEndY = e.changedTouches[0].clientY
                  const deltaX = touchEndX - touchStartX
                  const deltaY = Math.abs(touchEndY - touchStartY)
                  
                  // If swiped left more than 50px and vertical movement is less than 30px
                  if (deltaX < -50 && deltaY < 30 && !multiSelectMode) {
                    setReplyingTo(message)
                    setMessageMenuOpen(null)
                    messageInputRef.current?.focus()
                  }
                }
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className={`flex items-end space-x-2 ${isSent ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {multiSelectMode && (
                        <button
                          onClick={() => toggleMessageSelection(message.id)}
                          className="mb-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      )}
                      <div
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={`inline-block max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-md px-2.5 py-1.5 ${
                          isSent
                            ? 'bg-gradient-to-r from-green-700 to-emerald-700 text-white'
                            : 'bg-gray-800 text-white border border-gray-700'
                        }`}
                      >
                        {senderName && (
                          <div className="text-xs text-green-300 mb-0.5 font-semibold">
                            {senderName}
                          </div>
                        )}
                        {message.reply_to && (() => {
                          const repliedMsg = messages.find(m => m.id === message.reply_to)
                          const isOwnReply = repliedMsg?.sender_id === currentUser?.id
                          let senderFirstName = 'Unknown'
                          
                          if (!isOwnReply && repliedMsg) {
                            if (selectedGroup) {
                              const member = groupMembers.find(m => m.user_id === repliedMsg.sender_id)
                              const fullName = member?.profiles?.full_name || ''
                              senderFirstName = fullName.split(' ')[0] || member?.profiles?.username || 'Unknown'
                            } else if (selectedUser) {
                              senderFirstName = selectedUser.full_name.split(' ')[0] || selectedUser.username
                            }
                          }
                          
                          return (
                            <div className={`text-xs mb-1.5 p-1.5 rounded border-l-2 ${
                              isSent 
                                ? 'bg-green-800/30 border-green-400' 
                                : 'bg-gray-700/50 border-gray-500'
                            }`}>
                              <div className="text-[10px] opacity-70 mb-0.5">
                                {isOwnReply ? 'You' : senderFirstName}
                              </div>
                              <div className="opacity-80 truncate">
                                {messages.find(m => m.id === message.reply_to)?.content || 'Message'}
                              </div>
                            </div>
                          )
                        })()}
                        {message.image_url ? (
                          <div className="space-y-1">
                            <img 
                              src={message.image_url} 
                              alt="Shared image" 
                              className="max-w-full max-h-80 rounded cursor-pointer"
                              onClick={() => window.open(message.image_url!, '_blank')}
                            />
                            {message.content && (
                              <span className="block break-words leading-tight" style={{ fontSize: `${fontSize}px` }}>
                                {message.content}
                              </span>
                            )}
                            <span
                              className={`block text-[10px] whitespace-nowrap text-right flex items-center justify-end gap-1 ${
                                isSent ? 'text-green-100' : 'text-gray-400'
                              }`}
                            >
                              <span>{new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}</span>
                              {isSent && !message.group_id && (
                                message.read ? (
                                  <CheckCheck className="w-4 h-4" style={{ color: '#60a5fa', strokeWidth: 2.5 }} />
                                ) : message.delivered ? (
                                  <CheckCheck className="w-4 h-4" style={{ strokeWidth: 2.5 }} />
                                ) : (
                                  <Check className="w-4 h-4" style={{ strokeWidth: 2.5 }} />
                                )
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="break-words leading-tight" style={{ fontSize: `${fontSize}px` }}>
                            {message.content}{' '}
                            <span
                              className={`text-[10px] whitespace-nowrap inline-flex items-center gap-1 ${
                                isSent ? 'text-green-100' : 'text-gray-400'
                              }`}
                            >
                              <span>{new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}</span>
                              {isSent && !message.group_id && (
                                message.read ? (
                                  <CheckCheck className="w-4 h-4" style={{ color: '#60a5fa', strokeWidth: 2.5 }} />
                                ) : message.delivered ? (
                                  <CheckCheck className="w-4 h-4" style={{ strokeWidth: 2.5 }} />
                                ) : (
                                  <Check className="w-4 h-4" style={{ strokeWidth: 2.5 }} />
                                )
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                      {!multiSelectMode && (
                        <div className="relative">
                          <button
                            onClick={() => {
                              setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id)
                              setShowDeleteSubmenu(false)
                            }}
                            className={`p-1 rounded-lg transition-opacity ${
                              isSent 
                                ? 'hover:bg-white/20 text-white' 
                                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400'
                            }`}
                            title="Message options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {messageMenuOpen === message.id && (
                            <div 
                              className={`absolute ${isTopHalf ? 'top-full mt-2' : 'bottom-full mb-2'} ${
                                isSent ? 'right-0' : 'left-0'
                              } bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px] z-20`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setReplyingTo(message)
                                  setMessageMenuOpen(null)
                                  messageInputRef.current?.focus()
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-gray-300 flex items-center space-x-2"
                              >
                                <Reply className="w-4 h-4" />
                                <span>Reply</span>
                              </button>
                              {isDeletable && (
                                <button
                                  onClick={() => setShowDeleteSubmenu(!showDeleteSubmenu)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-gray-300 flex items-center space-x-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          )}
                          {showDeleteSubmenu && messageMenuOpen === message.id && (
                            <div 
                              className={`fixed md:absolute ${isTopHalf ? 'md:top-full md:mt-2' : 'md:bottom-full md:mb-2'} ${
                                isSent ? 'left-4 right-4 md:left-auto md:right-0 md:right-[152px]' : 'left-4 right-4 md:right-auto md:left-0 md:left-[152px]'
                              } bottom-20 md:bottom-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 md:w-[200px] md:min-w-[180px] z-30`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => deleteMessageForEveryone(message.id)}
                                className="w-full px-4 py-3 md:py-2 text-left text-sm md:text-sm hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 text-red-600 dark:text-red-400 flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete for everyone</span>
                              </button>
                              <button
                                onClick={() => deleteMessageForMe(message.id)}
                                className="w-full px-4 py-3 md:py-2 text-left text-sm md:text-sm hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 text-gray-300 flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete for me</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-gray-800 border-t border-gray-700 p-3 md:p-4 flex-shrink-0">
              {replyingTo && (() => {
                const isOwnMessage = replyingTo.sender_id === currentUser?.id
                let senderName = 'Unknown'
                
                if (!isOwnMessage) {
                  if (selectedGroup) {
                    const member = groupMembers.find(m => m.user_id === replyingTo.sender_id)
                    const fullName = member?.profiles?.full_name || ''
                    senderName = fullName.split(' ')[0] || member?.profiles?.username || 'Unknown'
                  } else if (selectedUser) {
                    senderName = selectedUser.full_name.split(' ')[0] || selectedUser.username
                  }
                }
                
                return (
                  <div className="mb-2 flex items-start bg-gray-700/50 rounded-lg p-2 border-l-4 border-green-500">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-green-400 font-semibold mb-0.5">
                        Replying to {isOwnMessage ? 'yourself' : senderName}
                      </div>
                    <div className="text-sm text-gray-300 truncate">
                      {replyingTo.content}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="ml-2 p-1 hover:bg-gray-600 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                )
              })()}
              <form onSubmit={sendMessage} className="flex items-center space-x-1 md:space-x-2 relative">
                <div className="flex items-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="px-2 md:px-3 py-2 md:py-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors active:bg-gray-100 dark:active:bg-gray-700 rounded-lg"
                  >
                    <Smile className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <label className="px-2 md:px-3 py-2 md:py-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 rounded-lg">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    <Upload className={`w-5 h-5 md:w-6 md:h-6 ${uploadingImage ? 'opacity-50' : ''}`} />
                  </label>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 max-w-[280px] sm:max-w-none sm:w-80 max-h-48 sm:max-h-64 overflow-y-auto scrollbar-hide z-50">
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2">
                        {emojis.map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setNewMessage(newMessage + emoji)
                              setShowEmojiPicker(false)
                            }}
                            className="text-2xl hover:bg-gray-700 rounded p-1 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={messageInputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 px-3 md:px-4 py-2 md:py-3 text-base bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400"
                  style={{ fontSize: '16px' }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="flex-shrink-0 px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 md:hover:scale-105"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            {/* Mobile Menu Button for empty state */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden mb-6 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg flex items-center space-x-2 shadow-lg hover:from-green-700 hover:to-emerald-700 transition active:scale-95"
            >
              <Menu className="w-5 h-5" />
              <span>Open Chats</span>
            </button>
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 md:p-6 rounded-full inline-block mb-4">
                <MessageSquare className="w-12 h-12 md:w-16 md:h-16 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                Welcome to Universe Chat
              </h2>
              <p className="text-sm md:text-base text-gray-400">
                Select a user to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    
    {/* Settings Modal */}
    {showSettings && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSettings(false)}>
        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] md:max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-700">
            <h2 className="text-xl md:text-2xl font-bold text-white">Settings</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition active:bg-gray-200 dark:active:bg-gray-600"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">
            {/* Profile Picture Section */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center space-x-4">
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition"
                  onClick={() => currentUser?.avatar_url && setViewingAvatar({ url: currentUser.avatar_url, name: currentUser.full_name })}
                >
                  {currentUser?.avatar_url ? (
                    <Image
                      src={currentUser.avatar_url}
                      alt={currentUser.full_name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-white font-bold text-2xl">
                      {currentUser?.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className={`inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer transition ${
                      uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingAvatar ? 'Uploading...' : 'Upload Picture'}
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Max 5MB. (JPG, PNG)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Disappearing Message Timer
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="deleteTimer"
                    value="off"
                    checked={deleteTimer === 'off'}
                    onChange={(e) => setDeleteTimer(e.target.value as 'off')}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-3 text-sm text-white">Off - Keep all messages</span>
                </label>
                <label className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="deleteTimer"
                    value="immediately"
                    checked={deleteTimer === 'immediately'}
                    onChange={(e) => setDeleteTimer(e.target.value as 'immediately')}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-3 text-sm text-white">Immediately - Delete when closing chat</span>
                </label>
                <label className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="deleteTimer"
                    value="24h"
                    checked={deleteTimer === '24h'}
                    onChange={(e) => setDeleteTimer(e.target.value as '24h')}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-3 text-sm text-white">24 hours - Delete messages after 1 day</span>
                </label>
                <label className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="deleteTimer"
                    value="7d"
                    checked={deleteTimer === '7d'}
                    onChange={(e) => setDeleteTimer(e.target.value as '7d')}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-3 text-sm text-white">7 days - Delete messages after 1 week</span>
                </label>
              </div>
            </div>

            {/* Notification Test Section */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Test Notifications
              </label>
              <button
                onClick={async () => {
                  const { testNotification } = await import('@/lib/notifications')
                  testNotification()
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Send Test Notification</span>
              </button>
              <p className="text-xs text-gray-400 mt-2">
                Click to test if notifications are working on your device
              </p>
            </div>

            {/* Message Font Size Section */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message Font Size
              </label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Small</span>
                  <span className="text-sm font-medium text-white">{fontSize}px</span>
                  <span className="text-sm text-gray-400">Large</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="20"
                  step="1"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-green-600"
                />
                <div className="p-3 bg-gray-900 rounded-lg">
                  <p style={{ fontSize: `${fontSize}px` }} className="text-white">
                    Preview: This is how your messages will look
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Account Section */}
            <div className="pt-6 border-t border-gray-700">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-gray-400 mb-3">
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
          </div>

          <div className="p-6 border-t border-gray-700">
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition"
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
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border-2 border-red-500" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Delete Account</h2>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </p>
            <p className="text-sm font-medium text-gray-300 mb-2">
              Please type <span className="font-bold text-red-600 dark:text-red-400">{currentUser.username}</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmUsername}
              onChange={(e) => setDeleteConfirmUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
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
              className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition"
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
    <footer className="bg-gray-800 border-t border-gray-700 py-2 px-4">
      <p className="text-xs text-center text-gray-400">
        Developed by Adeepa Wedage
      </p>
    </footer>

    {/* Group Settings Modal */}
    {showGroupSettings && selectedGroup && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowGroupSettings(false)}>
        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Group Settings</h2>
            <button
              onClick={() => setShowGroupSettings(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-6">
            {/* Group Photo Section */}
            {selectedGroup.created_by === currentUser?.id && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Group Photo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full flex items-center justify-center overflow-hidden">
                    {selectedGroup.photo_url ? (
                      <Image
                        src={selectedGroup.photo_url}
                        alt={selectedGroup.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-white font-semibold text-2xl">
                        {selectedGroup.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        if (!file.type.startsWith('image/')) {
                          alert('Please select an image file')
                          return
                        }

                        setUploadingGroupPhoto(true)
                        try {
                          const fileExt = file.name.split('.').pop()
                          const fileName = `${selectedGroup.id}-${Math.random()}.${fileExt}`
                          const filePath = `group-photos/${fileName}`

                          const { error: uploadError } = await supabase.storage
                            .from('avatars')
                            .upload(filePath, file, { upsert: true })

                          if (uploadError) throw uploadError

                          const { data: { publicUrl } } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(filePath)

                          await supabase
                            .from('groups')
                            .update({ photo_url: publicUrl })
                            .eq('id', selectedGroup.id)

                          setSelectedGroup({ ...selectedGroup, photo_url: publicUrl })
                          await loadGroups()
                        } catch (error) {
                          console.error('Error uploading group photo:', error)
                          alert('Failed to upload group photo')
                        } finally {
                          setUploadingGroupPhoto(false)
                        }
                      }}
                      className="hidden"
                      id="group-photo-upload"
                      disabled={uploadingGroupPhoto}
                    />
                    <label
                      htmlFor="group-photo-upload"
                      className={`cursor-pointer px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition inline-block text-sm ${
                        uploadingGroupPhoto ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingGroupPhoto ? 'Uploading...' : selectedGroup.photo_url ? 'Change Photo' : 'Upload Photo'}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Disappearing Messages Timer */}
            {selectedGroup.created_by === currentUser?.id && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Disappearing Messages
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'off', label: 'Off' },
                    { value: '24h', label: '24 Hours' },
                    { value: '3d', label: '3 Days' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={async () => {
                        try {
                          await supabase
                            .from('groups')
                            .update({ delete_timer: option.value })
                            .eq('id', selectedGroup.id)
                          
                          setGroupDeleteTimer(option.value as '24h' | '3d' | 'off')
                          setSelectedGroup({ ...selectedGroup, delete_timer: option.value as '24h' | '3d' | 'off' })
                        } catch (error) {
                          console.error('Error updating timer:', error)
                          alert('Failed to update timer')
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
                        (selectedGroup.delete_timer || 'off') === option.value
                          ? 'border-green-500 bg-green-900/30 text-white'
                          : 'border-gray-600 hover:border-gray-500 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option.label}</span>
                        {(selectedGroup.delete_timer || 'off') === option.value && (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Messages will be automatically deleted after the selected time period
                </p>
              </div>
            )}

            {/* Group Info (Read-only for non-creators) */}
            {selectedGroup.created_by !== currentUser?.id && (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">Only the group creator can change settings</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-700">
            <button
              onClick={() => setShowGroupSettings(false)}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Create Group Modal */}
    {showCreateGroupModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Create Group</h3>
            <button
              onClick={() => {
                setShowCreateGroupModal(false)
                setNewGroupName('')
                setSelectedUsersForGroup(new Set())
                setGroupSearchQuery('')
              }}
              className="p-1 hover:bg-gray-700 rounded transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400 mb-4"
          />

          <div className="mb-3">
            <input
              type="text"
              placeholder="Search users to add..."
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto mb-4 space-y-2">
            {users.filter(u => 
              u.full_name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
              u.username.toLowerCase().includes(groupSearchQuery.toLowerCase())
            ).map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer"
                onClick={() => {
                  const newSet = new Set(selectedUsersForGroup)
                  if (newSet.has(user.id)) {
                    newSet.delete(user.id)
                  } else {
                    newSet.add(user.id)
                  }
                  setSelectedUsersForGroup(newSet)
                }}
              >
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                  selectedUsersForGroup.has(user.id) 
                    ? 'bg-green-600 border-green-600' 
                    : 'border-gray-500'
                }`}>
                  {selectedUsersForGroup.has(user.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowCreateGroupModal(false)
                setNewGroupName('')
                setSelectedUsersForGroup(new Set())
                setGroupSearchQuery('')
              }}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={createGroup}
              disabled={!newGroupName.trim() || selectedUsersForGroup.size === 0}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create ({selectedUsersForGroup.size} selected)
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Add Member Modal */}
    {showAddMemberModal && selectedGroup && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Add Members</h3>
            <button
              onClick={() => {
                setShowAddMemberModal(false)
                setGroupSearchQuery('')
              }}
              className="p-1 hover:bg-gray-700 rounded transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="mb-3">
            <input
              type="text"
              placeholder="Search users to add..."
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {users.filter(u => 
              !groupMembers.some(m => m.user_id === u.id) &&
              (u.full_name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
              u.username.toLowerCase().includes(groupSearchQuery.toLowerCase()))
            ).map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer"
                onClick={() => addGroupMember(user.id)}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                </div>
                <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition">
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Avatar Viewer Modal */}
    {viewingAvatar && (
      <div 
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
        onClick={() => setViewingAvatar(null)}
      >
        <div className="relative w-full max-w-md">
          <button
            onClick={() => setViewingAvatar(null)}
            className="absolute -top-12 md:-top-10 right-0 p-2 text-white hover:bg-white/10 rounded-lg transition active:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="bg-gray-800 rounded-2xl p-4 md:p-6 shadow-2xl">
            <h3 className="text-base md:text-lg font-semibold text-white mb-4 text-center truncate">
              {viewingAvatar.name}
            </h3>
            <div className="w-64 h-64 sm:w-80 sm:h-80 mx-auto rounded-full overflow-hidden border-4 border-green-500 dark:border-green-400">
              <Image
                src={viewingAvatar.url}
                alt={viewingAvatar.name}
                width={320}
                height={320}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  )
}
