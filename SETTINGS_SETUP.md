# Settings Feature Setup

## Database Changes Required

To enable the disappearing message timer feature, you need to add a new column to the `profiles` table.

### 1. Add message_delete_timer column to profiles table

Run this SQL in your Supabase SQL Editor:

```sql
-- If column already exists, update the constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_message_delete_timer_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_message_delete_timer_check 
CHECK (message_delete_timer IN ('off', 'immediately', '24h', '7d'));

-- If column doesn't exist yet, create it
-- ALTER TABLE profiles 
-- ADD COLUMN message_delete_timer TEXT DEFAULT 'off' CHECK (message_delete_timer IN ('off', 'immediately', '24h', '7d'));

-- Update existing users to have 'off' as default
UPDATE profiles 
SET message_delete_timer = 'off' 
WHERE message_delete_timer IS NULL;
```

## How It Works

### Settings Modal
- Users can access settings by clicking the Settings button at the bottom of the sidebar
- Four options available:
  - **Off** - Keep all messages (default)
  - **Immediately** - Delete messages when closing the chat
  - **24 hours** - Automatically delete messages older than 1 day
  - **7 days** - Automatically delete messages older than 1 week

### Automatic Cleanup
- Messages are automatically deleted based on the user's selected timer
- Cleanup runs:
  - When the user first logs in
  - Every hour while the app is open
  - When the user saves new settings

### Privacy
- The cleanup only affects messages where the current user is either the sender or receiver
- Each user's setting applies to their own messages
- When a message is deleted, it's permanently removed from the database

## Notes

- Make sure to run the SQL command above in your Supabase project
- The feature works automatically once the database column is added
- Users can change their preference at any time through the Settings modal
