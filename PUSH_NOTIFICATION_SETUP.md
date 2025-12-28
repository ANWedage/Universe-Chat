# Push Notification Setup - Universe Chat

Get notifications even when the app is completely closed using Firebase Cloud Messaging (FCM).

---

## 📋 Overview

**What you'll set up:**
1. Database column to store device FCM tokens
2. Firebase service account for sending notifications
3. Supabase Edge Function to send notifications via Firebase
4. Database trigger to auto-send notifications on new messages

**Time required:** 15-20 minutes

---

## Step 1: Database Setup

### Add FCM Token Column

1. Go to your **Supabase Dashboard** → SQL Editor
2. Run this SQL:

```sql
-- Add FCM token column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON profiles(fcm_token);
```

✅ **Done!** Your database can now store device notification tokens.

---

## Step 2: Firebase Configuration

### Get Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **Universe Chat** project
3. Click **⚙️ gear icon** → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **"Generate New Private Key"** button
6. Download the **JSON file** (keep it safe!)

### What's in the JSON file?

Open it and you'll see:
```json
{
  "project_id": "universe-chat-xxxxx",
  "client_email": "firebase-adminsdk-xxxxx@universe-chat.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
}
```

**You'll need these 3 values in Step 3.**

---

## Step 3: Create Supabase Edge Function

### Option A: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard** → **Edge Functions**
2. Click **"Create a new function"**
3. **Name:** `send-push-notification`
4. **Paste this code:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')!
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL')!
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY')!

async function getAccessToken() {
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const jwtClaimSet = btoa(JSON.stringify({
    iss: FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }))
  
  const signatureInput = `${jwtHeader}.${jwtClaimSet}`
  const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyData,
    new TextEncoder().encode(signatureInput)
  )
  
  const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`
  
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })
  
  const { access_token } = await tokenResponse.json()
  return access_token
}

serve(async (req) => {
  try {
    const { receiverId, senderName, message } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Get receiver's FCM token
    const tokenResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${receiverId}&select=fcm_token`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    )

    const profiles = await tokenResponse.json()
    const fcmToken = profiles[0]?.fcm_token

    if (!fcmToken) {
      return new Response(JSON.stringify({ error: 'No FCM token found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get OAuth2 access token
    const accessToken = await getAccessToken()
    
    // Send notification via Firebase
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: {
              title: senderName,
              body: message,
            },
            data: {
              userId: receiverId,
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
              },
            },
          },
        }),
      }
    )

    const result = await fcmResponse.json()
    
    return new Response(JSON.stringify(result), {
      status: fcmResponse.ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Push notification error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

5. **Add Secrets** (from your Firebase JSON file):
   - Go to Edge Function Settings → Secrets
   - Add:
     - `FIREBASE_PROJECT_ID` = `universe-chat-xxxxx`
     - `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-xxxxx@...`
     - `FIREBASE_PRIVATE_KEY` = `-----BEGIN PRIVATE KEY-----\n...` (full key with \n)

6. Click **"Deploy"**

✅ **Done!** Your Edge Function is live.

---

## Step 4: Database Trigger

This automatically calls the Edge Function when someone sends a message.

### Get Your Supabase Project URL:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Find **Project URL** (looks like: `https://abcdefgh.supabase.co`)
3. Copy it (you'll use it below)

### Create the Trigger:

1. Go to **Supabase Dashboard** → SQL Editor
2. **Replace `YOUR_PROJECT_URL`** in the code below with your actual project URL
3. Run this SQL:

```sql
-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create notification function
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  -- Get sender's name
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Call Edge Function using service role authentication
  -- The Edge Function has its own service role key in environment variables
  PERFORM net.http_post(
    url := 'https://lmhjvuwzuqwixgioeiwx.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGp2dXd6dXF3aXhnaW9laXd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY0MzM2NSwiZXhwIjoyMDgyMjE5MzY1fQ.u5PwNHNABA3F-t4XPWROiA2GBkCUrL-dTHQXuklkp7I'
    ),
    body := jsonb_build_object(
      'receiverId', NEW.receiver_id,
      'senderName', COALESCE(v_sender_name, 'Someone'),
      'message', 'New message'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.receiver_id IS NOT NULL)
EXECUTE FUNCTION notify_new_message();
```

**Note:** I've already added your service role key and project URL above. Just copy and run this SQL directly!

✅ **Done!** Messages will now trigger push notifications.

---

## Step 5: Android Configuration (Already Done!)

Your Android project already has:
- ✅ `google-services.json` in `android/app/`
- ✅ Push notification plugin installed
- ✅ FCM token registration code

Just rebuild:

```bash
npm run build:mobile
```

---

## Step 6: Test It!

### IMPORTANT: Debugging Steps First!

Before testing, verify everything is set up correctly:

#### 1. Check FCM Token is Saved

**Option A: Use Android Studio Logcat (Easiest)**
1. Open Android Studio
2. Click **Logcat** tab at the bottom
3. In the filter box, type: `FCM`
4. Run your app
5. Look for: `FCM Token: fJ7X...` (long token)

**Option B: Command Line (if adb is in PATH)**
```bash
adb logcat | grep -i "FCM"
```

**Option C: Check Directly in Supabase**
Go to Supabase SQL Editor and run:
```sql
SELECT id, full_name, fcm_token FROM profiles WHERE fcm_token IS NOT NULL;
```

**Expected Result:** You should see your user with a long FCM token string.

**If no token:** The app isn't registering for push notifications. Check Android Studio Logcat for errors.

---

#### 2. Verify Edge Function is Deployed

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Check `send-push-notification` shows as **"Deployed"**
3. Click on it and check the logs for any errors
4. Test it manually:
   - Click **"Invoke function"**
   - Use this test JSON:
   ```json
   {
     "receiverId": "your-user-id-from-profiles",
     "senderName": "Test User",
     "message": "Test notification"
   }
   ```
   - Check the response - should show success

**If function fails:** Check the 3 Firebase secrets are set correctly in Edge Function settings.

---

#### 3. Test Database Trigger

In Supabase SQL Editor, manually insert a test message:

```sql
-- Replace with actual user IDs from your profiles table
INSERT INTO messages (sender_id, receiver_id, content, created_at)
VALUES (
  'sender-user-id-here',
  'receiver-user-id-here', 
  'Test message',
  NOW()
);
```

Then check:
1. **Edge Function logs** in Supabase Dashboard - should show a new invocation
2. **Your device** - should receive a notification (if token is saved)

**If trigger doesn't fire:** Run this to check it exists:
```sql
\df notify_new_message
```

---

#### 4. Check Firebase Configuration

In Firebase Console → Cloud Messaging:
1. Verify **Firebase Cloud Messaging API (V1)** is **Enabled**
2. Check the Edge Function secrets match your service account JSON exactly:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`  
   - `FIREBASE_PRIVATE_KEY` (must include `\n` characters)

---

### After Verification, Test End-to-End:

### Testing Checklist:

1. **Open the app** on your Android device/emulator
2. **Login** → Check logcat for "FCM Token: ..." message
3. **Verify** token is saved in Supabase:
   ```sql
   SELECT id, full_name, fcm_token FROM profiles WHERE fcm_token IS NOT NULL;
   ```
4. **Send a message** from another user
5. **Close the app** (swipe it away from recent apps)
6. **Wait** → You should get a notification! 🎉

### Check Logcat (Android Studio):
```bash
# Filter for push notification logs
adb logcat | grep -E "FCM|PushNotifications|Capacitor"
```

---

## 🐛 Troubleshooting

### No FCM Token Saved
- Check Android logcat for "FCM Token" or error messages
- Ensure `google-services.json` matches your Firebase project
- Rebuild: `npm run build:mobile`

### Edge Function Fails
- Check Edge Function logs in Supabase Dashboard
- Verify all 3 Firebase secrets are set correctly
- Test Edge Function manually from dashboard

### No Notification Received
- Verify database trigger is created: `\df notify_new_message` in SQL Editor
- Check Edge Function was called (view logs)
- Ensure service role key is set in database settings
- Check Android notification permissions are granted

### Notification Shows Error
- Check Firebase Console → Cloud Messaging for delivery status
- Verify FCM token in database is valid
- Ensure Firebase Cloud Messaging API (V1) is enabled

---

## ✅ Current Status

- ✅ Push notification plugin installed  
- ✅ FCM token registration code added
- ✅ Database migration file created
- ⏳ **You need to:** Run database migrations
- ⏳ **You need to:** Get Firebase service account JSON
- ⏳ **You need to:** Create Edge Function with secrets
- ⏳ **You need to:** Create database trigger
- ⏳ **You need to:** Test with app closed

---

## 📚 Additional Notes

- **Security:** Service account JSON has admin access - keep it secret!
- **Cost:** Firebase FCM is free for unlimited notifications
- **Web Push:** This setup is for Android. Web notifications already work (different system).
- **iOS:** Would need similar setup with APNs (Apple Push Notification service)

Need help? Check Edge Function logs in Supabase Dashboard or Firebase Console delivery reports.
