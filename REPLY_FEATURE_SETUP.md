# Reply Feature Setup

## Database Migration

Run this SQL in your Supabase SQL Editor to add the reply functionality:

```sql
-- Add reply_to column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);
```

Or run the migration file: `add_reply_to_migration.sql`

## Features Implemented

### 1. **Reply via Menu Option**
   - Click the three-dot menu (⋮) on any message
   - Select "Reply" option
   - The message will appear above the input box
   - Type your reply and send

### 2. **Reply via Swipe Gesture (Mobile)**
   - Swipe any message **left** (at least 50px)
   - The message will automatically be set for reply
   - Type your reply and send

### 3. **Reply Preview**
   - When replying, a preview box appears above the input
   - Shows who you're replying to
   - Shows the original message content
   - Click X to cancel the reply

### 4. **Replied Message Display**
   - Replied messages show the original message in a quoted box
   - Shows who sent the original message
   - Original message is truncated for clean UI
   - Works for both direct messages and group chats

## How It Works

1. **Frontend**: 
   - Message type updated to include `reply_to` field
   - New state `replyingTo` tracks which message is being replied to
   - Swipe gesture detection for mobile UX
   - Reply preview component above message input

2. **Backend**:
   - `reply_to` column stores the ID of the message being replied to
   - References the `messages` table via foreign key
   - Automatically set to NULL if the original message is deleted

## UI Elements

- **Reply Icon**: Added Reply icon from lucide-react
- **Swipe Detection**: Left swipe triggers reply (mobile-friendly)
- **Visual Indicators**: Quoted message box with left border
- **Cancel Option**: X button to clear reply selection

## Mobile Experience

- **Long Press**: Opens message menu with Reply and Delete options
- **Swipe Left**: Quick reply gesture (swipe message left to reply)
- **Touch Optimized**: Large tap targets and smooth animations
