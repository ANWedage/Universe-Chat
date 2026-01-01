# Android App Feature Implementation Plan

## ✅ Already Implemented
1. **Basic Messaging** - Send and receive plain text messages
2. **Realtime Updates** - Messages appear instantly via Supabase Realtime
3. **Settings Activity** - Profile settings, font size, delete timer
4. **Profile Management** - View and edit user profile
5. **Last Seen Filtering** - Old encrypted messages are filtered out

## 🚀 Features Ready to Add (From Web App)

### 1. Enhanced Chat UI
**Files to Update:**
- `activity_chat.xml` → Replace with `activity_chat_new.xml`
- `ChatActivity.kt` → Add header with avatar, online status, last seen

**New Components:**
- Chat header with user avatar and online status indicator
- Reply preview bar
- Emoji picker button
- Attach image button

### 2. Last Seen & Online Status
**Implementation:**
- Update `last_seen` in database every 30 seconds when app is active
- Show "Online" if last_seen < 30 seconds ago
- Show "Last seen X minutes/hours ago" otherwise
- Add green dot indicator for online users

**Files:**
- `ChatActivity.kt` - Add updateLastSeen() timer
- `Models.kt` - Already has last_seen field ✅
- `item_chat.xml` - Add online indicator dot

### 3. Read Receipts & Delivery Status
**Implementation:**
- Show single checkmark (✓) when delivered
- Show double checkmark (✓✓) when read
- Blue checkmarks when read by recipient
- Update message `read` and `delivered` fields

**Files:**
- `item_message_sent.xml` - Add delivery/read status icons
- `MessagesAdapter.kt` - Show checkmarks based on message.read and message.delivered
- `ChatActivity.kt` - Mark messages as read when viewed

### 4. Emoji Picker
**Implementation:**
- RecyclerView with grid of emojis
- Insert emoji at cursor position in message input
- Common emojis at top, full emoji list below

**Files:**
- `activity_chat_new.xml` - Already has emojiPicker RecyclerView ✅
- `ChatActivity.kt` - Toggle emoji picker, insert emoji on tap
- Create `EmojiAdapter.kt` for emoji grid

### 5. Image Sharing
**Implementation:**
- Select image from gallery
- Upload to Supabase Storage
- Send message with image_url
- Display images in chat with click to view full size

**Files:**
- `ChatActivity.kt` - Add image picker, upload logic
- `item_message_sent/received.xml` - Add ImageView for message images
- `MessagesAdapter.kt` - Load and display images

**Dependencies Needed:**
```gradle
implementation 'com.github.bumptech.glide:glide:4.16.0'
```

### 6. Message Reply
**Implementation:**
- Long press message → Reply option
- Show reply preview above input
- Send message with reply_to field
- Display reply indicator in message bubble

**Files:**
- `activity_chat_new.xml` - Already has replyPreview card ✅
- `ChatActivity.kt` - Handle reply mode
- `item_message_sent/received.xml` - Show reply context
- `Models.kt` - Already has reply_to field ✅

### 7. Unread Message Count
**Implementation:**
- Count unread messages per conversation
- Show badge on chat list items
- Mark messages as read when chat is opened

**Files:**
- `ChatsFragment.kt` - Load unread counts
- `item_chat.xml` - Add unread count badge
- `ChatsAdapter.kt` - Display unread count

### 8. Push Notifications
**Implementation:**
- Use Firebase Cloud Messaging (FCM)
- Send notification when message received while app in background
- Notification shows sender name and message preview
- Tap notification to open chat

**Dependencies:**
```gradle
implementation 'com.google.firebase:firebase-messaging:23.4.0'
```

**Files:**
- Create `FCMService.kt` - Handle incoming notifications
- `AndroidManifest.xml` - Register FCM service
- Update Supabase functions to send FCM notifications

### 9. Group Chat
**Implementation:**
- Create group with multiple users
- Send/receive group messages
- Group chat UI with member list
- Group settings (name, photo, delete timer)

**Files:**
- `ChatActivity.kt` - Support group_id in messages
- `GroupsFragment.kt` - Already exists ✅
- Create `GroupChatActivity.kt` - Separate activity for group chats
- `Models.kt` - Already has Group and GroupMember ✅

### 10. Profile Picture Upload
**Implementation:**
- Select image from gallery
- Upload to Supabase Storage (avatars bucket)
- Update profile.avatar_url
- Display in chat header, user list

**Files:**
- `SettingsActivity.kt` - Add uploadAvatar() function
- `ProfileFragment.kt` - Display avatar
- `ChatActivity.kt` - Load and display user avatar

## 📝 Implementation Priority

**Phase 1 (Essential):**
1. Enhanced Chat UI with header
2. Last Seen & Online Status
3. Read Receipts

**Phase 2 (User Experience):**
4. Emoji Picker
5. Message Reply
6. Profile Picture Upload

**Phase 3 (Advanced):**
7. Image Sharing
8. Unread Message Count
9. Push Notifications

**Phase 4 (Group Features):**
10. Group Chat complete implementation

## 🔧 Quick Start Implementation

To implement all features, I can create:
1. Updated `ChatActivity.kt` with all features
2. Enhanced message layouts with read receipts, images, replies
3. `EmojiAdapter.kt` for emoji picker
4. `ImageUploadHelper.kt` for image handling
5. Updated `SettingsActivity.kt` with avatar upload
6. Updated `ChatsFragment.kt` with unread counts

Would you like me to implement these features now?
