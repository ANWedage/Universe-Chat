# Push Notifications Setup Guide

## What's Already Done ✅

- Push Notifications plugin installed
- Notification handler code added
- FCM token saved to database
- Logout clears notification token

## Next Steps - Firebase Setup (Required)

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add Project"
3. Name it "Universe Chat"
4. Disable Google Analytics (optional)
5. Click "Create Project"

### 2. Add Android App to Firebase

1. In Firebase Console, click Android icon
2. Enter package name: `com.universe.chat`
3. Download `google-services.json`
4. Copy it to: `android/app/google-services.json`

### 3. Update Android Build Files

Add to `android/build.gradle` (project level):
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

Add to `android/app/build.gradle` (bottom of file):
```gradle
apply plugin: 'com.google.gms.google-services'
```

### 4. Add FCM Token Column to Database

Run this SQL in Supabase:
```sql
ALTER TABLE profiles ADD COLUMN fcm_token TEXT;
```

### 5. Create Supabase Edge Function for Notifications

This sends push notifications when new messages arrive.

Create in Supabase Dashboard → Edge Functions:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { record } = await req.json()
  
  // Get receiver's FCM token
  const { data: profile } = await supabase
    .from('profiles')
    .select('fcm_token, full_name')
    .eq('id', record.receiver_id)
    .single()

  if (!profile?.fcm_token) {
    return new Response('No FCM token', { status: 200 })
  }

  // Get sender's name
  const { data: sender } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', record.sender_id)
    .single()

  // Send FCM notification
  const fcmUrl = 'https://fcm.googleapis.com/fcm/send'
  const fcmKey = Deno.env.get('FCM_SERVER_KEY') // Add this in Edge Function secrets
  
  await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: profile.fcm_token,
      notification: {
        title: sender?.full_name || 'New Message',
        body: 'You have a new message',
        icon: '/logo.png',
      },
      data: {
        sender_id: record.sender_id,
        message_id: record.id,
      },
    }),
  })

  return new Response('OK', { status: 200 })
})
```

### 6. Create Database Trigger

Run in Supabase SQL Editor:
```sql
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'YOUR_EDGE_FUNCTION_URL',
    body := json_build_object('record', row_to_json(NEW))::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

## How It Works 🔔

1. User logs in → FCM token saved to database
2. Someone sends message → Database trigger fires
3. Edge Function sends FCM notification
4. User receives notification (even if app closed)
5. User taps notification → Opens chat

## Test It

1. Complete Firebase setup
2. Rebuild app: `npm run build:mobile`
3. Install on device
4. Login on 2 devices
5. Send message from one → Other receives notification!

---

**Note:** This requires Firebase (free tier available) and some Supabase configuration. Push notifications work even when app is closed or device is locked! 📱🔔
