# Universe Chat - Native Android App

A modern, real-time chat application for Android built with Kotlin and Supabase.

## Features

### 🚀 Onboarding & Authentication
- **Splash Screen**: Beautiful animated splash screen
- **3 Onboarding Screens**: 
  1. Connect with Anyone - Search users across the platform
  2. Real-time Messaging - Lightning-fast message delivery
  3. Secure & Private - Modern authentication and encryption
- **Login & Signup**: Secure authentication with username/password
- **Remember Me**: Stay logged in across app sessions

### 💬 Chat Features
- **Real-time Messaging**: Instant message delivery using Supabase Realtime
- **User Search**: Find users by name or username
- **Chat List**: View all your conversations
- **Message History**: Persistent chat history
- **Typing Indicators**: See when someone is typing (coming soon)
- **Read Receipts**: Know when messages are delivered and read (coming soon)

### 🎨 UI/UX
- **Material Design 3**: Modern Android design patterns
- **Dark Theme**: Eye-friendly dark theme matching the web app
- **Gradient Backgrounds**: Beautiful green gradients throughout
- **Bottom Navigation**: Easy navigation between Chats, Groups, and Profile
- **Custom Icons**: Vector-based icons for crisp visuals
- **Animations**: Smooth transitions and animations

### 👤 Profile Management
- **User Profiles**: Display name, username, and email
- **Avatar Support**: Profile pictures (coming soon)
- **Logout**: Secure logout functionality

## Tech Stack

- **Language**: Kotlin
- **UI**: XML Layouts with Material Design 3
- **Architecture**: MVVM-ready structure
- **Backend**: Supabase
  - Auth: User authentication
  - Postgrest: Database operations
  - Realtime: Live updates
  - Storage: File uploads (for avatars)
- **Dependencies**:
  - AndroidX Core, AppCompat, Material
  - ViewPager2 (for onboarding)
  - RecyclerView (for lists)
  - Coroutines (for async operations)
  - Encrypted SharedPreferences (for secure storage)
  - Coil (for image loading)

## Setup Instructions

### Prerequisites
- Android Studio Hedgehog or later
- JDK 17
- Android SDK with API 24+ (Android 7.0+)
- Supabase account and project

### 1. Clone the Repository
```bash
cd android
```

### 2. Configure Supabase
1. Go to [supabase.com](https://supabase.com) and create a project
2. Get your project URL and anon key from Project Settings > API
3. Open `SupabaseClient.kt` and replace:
```kotlin
private const val SUPABASE_URL = "YOUR_SUPABASE_URL"
private const val SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"
```

### 3. Database Setup
Run these SQL commands in your Supabase SQL editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    receiver_id UUID REFERENCES profiles(id),
    group_id UUID,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    delivered BOOLEAN DEFAULT FALSE,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_receiver BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    reply_to UUID REFERENCES messages(id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can view their own messages"
ON messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages"
ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Create indexes for better performance
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

### 4. Build and Run
1. Open the `android` folder in Android Studio
2. Wait for Gradle sync to complete
3. Connect an Android device or start an emulator
4. Click Run or press Shift+F10

## Project Structure

```
android/app/src/main/
├── java/com/universe/chat/
│   ├── SplashActivity.kt           # App entry point
│   ├── OnboardingActivity.kt       # 3-slide onboarding
│   ├── OnboardingAdapter.kt        # ViewPager adapter
│   ├── LoginActivity.kt            # User login
│   ├── SignupActivity.kt           # User registration
│   ├── MainActivity.kt             # Main container with bottom nav
│   ├── ChatsFragment.kt            # Chat list
│   ├── GroupsFragment.kt           # Groups (placeholder)
│   ├── ProfileFragment.kt          # User profile
│   ├── SearchUsersActivity.kt      # User search
│   ├── ChatActivity.kt             # 1-on-1 messaging
│   ├── ChatsAdapter.kt             # Chat list adapter
│   ├── UsersAdapter.kt             # User search adapter
│   ├── MessagesAdapter.kt          # Messages adapter
│   ├── SharedPreferencesHelper.kt  # Encrypted preferences
│   ├── SupabaseClient.kt           # Supabase configuration
│   └── Models.kt                   # Data models
├── res/
│   ├── layout/                     # All XML layouts
│   ├── drawable/                   # Vector icons & backgrounds
│   ├── values/                     # Colors, strings, styles
│   ├── menu/                       # Navigation menus
│   └── color/                      # Color state lists
└── AndroidManifest.xml             # App configuration
```

## Color Scheme

Matching the web app's green theme:
- Primary: Green (#22C55E)
- Secondary: Emerald (#10B981)
- Accent: Teal (#14B8A6)
- Background: Dark Gray (#111827)
- Surface: Gray (#1F2937)

## Minimum Requirements

- Android 7.0 (API 24) or higher
- Internet connection
- 50MB free storage

## Features Coming Soon

- [ ] Group chat functionality
- [ ] Image/file sharing
- [ ] Voice messages
- [ ] Video calls
- [ ] Push notifications
- [ ] End-to-end encryption
- [ ] Message reactions
- [ ] Dark/Light theme toggle
- [ ] Custom chat backgrounds
- [ ] Message forwarding
- [ ] User blocking

## Troubleshooting

### Build Errors
- **Gradle sync failed**: Check your internet connection and try "File > Invalidate Caches and Restart"
- **SDK version errors**: Ensure you have Android SDK 34 installed

### Runtime Errors
- **Authentication fails**: Verify Supabase credentials in `SupabaseClient.kt`
- **Network errors**: Check internet connection and Supabase project status
- **App crashes on start**: Check logcat for detailed error messages

## Contributing

This is a learning project. Feel free to fork and experiment!

## License

MIT License - See the web app for full license details.

## Developer

**Adeepa Wedage**

For questions or issues, please create an issue in the repository.

---

**Note**: This native Android app mirrors the functionality of the Universe Chat web application but is built entirely with native Android components for optimal performance and user experience.
