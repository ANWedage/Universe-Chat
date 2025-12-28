# Notification System Setup

## Features Implemented

### Web Notifications
- Uses Web Notifications API
- Shows desktop notifications when new messages arrive
- Displays sender name and message preview
- Click notification to focus the app window

### Mobile Notifications
- Uses Capacitor Local Notifications plugin
- Shows native push notifications on Android and iOS
- Includes sender name and message preview
- Tap notification to open the app and navigate to the chat

## How It Works

### Permission Request
- On first app load, the app automatically requests notification permission
- Users can grant or deny permission
- Permission is remembered for future sessions

### Notification Triggers
1. **Direct Messages:** Shows notification when you receive a message from another user
2. **Group Messages:** Shows notification for new group messages (includes group name)
3. **Background Notifications:** Shows when app is in background or viewing a different chat
4. **No Duplicate Notifications:** Won't show notification if you're already viewing that chat

### Message Decryption
- Messages are decrypted before showing in notifications
- Ensures you see the actual message content, not encrypted text

## Platform Support

### Web Browsers
- Chrome, Edge, Firefox, Safari (all modern versions)
- Requires HTTPS in production
- Works on localhost for development

### Mobile Apps
- Android: API 33+ (POST_NOTIFICATIONS permission)
- iOS: Requires user permission

## Testing

### Web
1. Open the app in a browser
2. Grant notification permission when prompted
3. Open a chat and have someone send you a message
4. Minimize or switch tabs
5. You should receive a desktop notification

### Mobile
1. Install the APK on Android or build for iOS
2. Grant notification permission when prompted
3. Have someone send you a message
4. Lock the phone or switch to another app
5. You should receive a native notification

## Permissions

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
```

### iOS
Automatically configured by Capacitor - users will be prompted on first launch

## Notification Content

### Direct Message
- Title: Sender's full name
- Body: Decrypted message content
- Data: Sender's user ID (for navigation)

### Group Message
- Title: "Sender's Name in Group Name"
- Body: Decrypted message content
- Data: Sender's user ID

## Customization

You can customize notifications in `lib/notifications.ts`:
- Icon: Change the icon path
- Sound: Add notification sound
- Badge: Modify badge behavior
- Actions: Add action buttons

## Troubleshooting

### Notifications not showing on web
- Check if permission is granted (browser settings)
- Ensure HTTPS is used in production
- Check browser console for errors

### Notifications not showing on Android
- Verify POST_NOTIFICATIONS permission is granted in app settings
- Check Android version is 13+ (API 33+)
- Look for errors in Android logcat

### Notifications not showing on iOS
- Ensure permission is granted in iOS settings
- Check Xcode console for errors
- Verify app is not in Do Not Disturb mode

## Future Enhancements
- Notification badges showing unread count
- Custom notification sounds
- Rich notifications with images
- Action buttons (Reply, Mark as Read)
- Notification grouping by conversation
