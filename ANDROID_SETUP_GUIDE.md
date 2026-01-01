# Universe Chat - Android Native App Setup Guide

This guide will help you set up and run the native Android app.

## Quick Start (5 Minutes)

### Step 1: Install Android Studio
1. Download [Android Studio](https://developer.android.com/studio)
2. Install with default settings
3. Open Android Studio and let it download required SDKs

### Step 2: Configure Supabase

1. **Get Supabase Credentials**:
   - Go to your Supabase project at [supabase.com](https://supabase.com/dashboard)
   - Navigate to Settings > API
   - Copy your **Project URL** and **anon/public key**

2. **Update SupabaseClient.kt**:
   - Open: `android/app/src/main/java/com/universe/chat/SupabaseClient.kt`
   - Replace the placeholder values:
   ```kotlin
   private const val SUPABASE_URL = "https://your-project.supabase.co"
   private const val SUPABASE_ANON_KEY = "your-anon-key-here"
   ```

### Step 3: Run the App

1. **Open Project**:
   - Launch Android Studio
   - Click "Open" and select the `android` folder
   - Wait for Gradle sync (this may take a few minutes the first time)

2. **Set Up Device**:
   
   **Option A - Physical Device**:
   - Enable Developer Options on your Android phone (Settings > About > Tap Build Number 7 times)
   - Enable USB Debugging (Settings > Developer Options > USB Debugging)
   - Connect phone via USB
   
   **Option B - Emulator**:
   - Click "Device Manager" in Android Studio
   - Click "Create Device"
   - Select "Pixel 6" (recommended)
   - Download and select a system image (API 34 recommended)
   - Click "Finish"

3. **Build and Run**:
   - Click the green "Run" button (▶) or press `Shift+F10`
   - Select your device/emulator
   - Wait for the app to build and install

## Database Setup

If you haven't set up your Supabase database yet, run these SQL commands in the Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    group_id UUID,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    delivered BOOLEAN DEFAULT FALSE,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_receiver BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Message policies
CREATE POLICY "Users can view their messages"
ON messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own messages"
ON messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Indexes
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_receiver ON messages(receiver_id, created_at DESC);
CREATE INDEX idx_profiles_username ON profiles(username);
```

## Testing the App

### First Run Flow:
1. **Splash Screen** (2 seconds) → Shows Universe Chat logo
2. **Onboarding** (3 screens):
   - Screen 1: "Connect with Anyone"
   - Screen 2: "Real-time Messaging"
   - Screen 3: "Secure & Private"
   - Click "Next" or "Skip"
3. **Signup**:
   - Enter: Full Name, Username, Email, Password
   - Click "Create Account"
4. **Main App**:
   - Chats tab: View conversations
   - Click FAB (+) to search users
   - Click user to start chatting
   - Profile tab: View your info, logout

### Test User Accounts:
Create 2 accounts to test messaging between users.

## Common Issues & Solutions

### 1. Gradle Sync Failed
**Problem**: "Gradle sync failed: Connection timeout"
**Solution**:
- Check internet connection
- File > Invalidate Caches and Restart
- Try File > Sync Project with Gradle Files

### 2. SDK Not Found
**Problem**: "Android SDK not found"
**Solution**:
- Tools > SDK Manager
- Install Android SDK 34 (or latest)
- Install Android SDK Build-Tools 34.0.0

### 3. Emulator Won't Start
**Problem**: Emulator stuck on loading
**Solution**:
- Tools > Device Manager
- Delete and recreate the virtual device
- Or use a physical device

### 4. App Crashes on Login
**Problem**: App crashes when clicking "Sign In"
**Solution**:
- Check Supabase credentials in `SupabaseClient.kt`
- Verify internet connection
- Check Logcat for specific error

### 5. Build Error: "Duplicate class"
**Problem**: Build fails with duplicate class errors
**Solution**:
- Build > Clean Project
- Build > Rebuild Project

### 6. Messages Not Appearing
**Problem**: Can send but don't see messages
**Solution**:
- Check Supabase database policies
- Verify both users are in the profiles table
- Check Logcat for SQL errors

## Development Tips

### View Logs
- Click "Logcat" tab at bottom of Android Studio
- Filter by "universe" to see app-specific logs
- Look for errors (red) or warnings (orange)

### Debug the App
- Click line number to set breakpoint (red dot)
- Click "Debug" button (🐛) instead of "Run"
- App will pause at breakpoints

### Hot Reload
- After code changes, click "Apply Changes" (⚡)
- Faster than full rebuild

### Inspect Database
- Go to Supabase > Table Editor
- View profiles and messages tables
- Manually verify data

## Building APK

To create an installable APK:

1. **Build APK**:
   - Build > Build Bundle(s) / APK(s) > Build APK(s)
   - Wait for build to complete
   - Click "locate" in notification

2. **Install APK**:
   - Connect phone via USB
   - Transfer APK to phone
   - Open and install
   - Enable "Install from Unknown Sources" if prompted

3. **Location**:
   - APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

## App Structure Overview

```
User Flow:
Splash → Onboarding → Login/Signup → Main App (Chats/Groups/Profile)
                                    ↓
                            Search Users → Chat with User
```

**Activities** (Full-screen pages):
- `SplashActivity` - Entry point, checks login state
- `OnboardingActivity` - 3-screen introduction
- `LoginActivity` - Username/password login
- `SignupActivity` - Account creation
- `MainActivity` - Container with bottom navigation
- `SearchUsersActivity` - Find users to chat with
- `ChatActivity` - 1-on-1 messaging

**Fragments** (Embedded in MainActivity):
- `ChatsFragment` - List of conversations
- `GroupsFragment` - Group chats (placeholder)
- `ProfileFragment` - User profile and settings

## Next Steps

After basic setup:
1. Test creating an account
2. Create a second account on another device/emulator
3. Test messaging between accounts
4. Explore the profile section
5. Check out the code to understand the structure

## Need Help?

- Check the main `ANDROID_NATIVE_README.md` for detailed feature list
- Look at error messages in Logcat
- Verify Supabase configuration
- Ensure database tables are created correctly

## Additional Resources

- [Android Developer Docs](https://developer.android.com/docs)
- [Supabase Android Guide](https://supabase.com/docs/reference/kotlin/introduction)
- [Kotlin Documentation](https://kotlinlang.org/docs/home.html)
- [Material Design 3](https://m3.material.io/)

---

**Ready to start?** Open Android Studio, follow Step 1-3 above, and you'll have the app running in minutes!
