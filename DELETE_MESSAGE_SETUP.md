# Delete Message Feature Setup

## Database Changes Required

To enable the delete message feature, you need to add two new columns to the `messages` table to track message deletions.

### Add deletion tracking columns to messages table

Run this SQL in your Supabase SQL Editor:

```sql
-- Add deleted_by_sender and deleted_by_receiver columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS deleted_by_sender BOOLEAN DEFAULT FALSE;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS deleted_by_receiver BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS messages_deleted_by_sender_idx ON messages(deleted_by_sender);
CREATE INDEX IF NOT EXISTS messages_deleted_by_receiver_idx ON messages(deleted_by_receiver);

-- Update existing messages to have false as default
UPDATE messages 
SET deleted_by_sender = FALSE 
WHERE deleted_by_sender IS NULL;

UPDATE messages 
SET deleted_by_receiver = FALSE 
WHERE deleted_by_receiver IS NULL;
```

## How It Works

### Delete Message Options

Users can delete messages they sent within **5 minutes** of sending them. Two options are available:

1. **Delete for everyone** - Permanently removes the message from the database for both sender and receiver
2. **Delete for me** - Hides the message only for you. The other person can still see it.

### User Experience

- A three-dot menu (⋮) appears on hover for messages you sent within the last 5 minutes
- Click the menu to see delete options
- **Delete for everyone**: The message disappears for both you and the recipient
- **Delete for me**: The message only disappears from your view

### Technical Details

- Messages older than 5 minutes cannot be deleted
- Only the sender can delete their own messages
- "Delete for everyone" removes the message from the database entirely
- "Delete for me" marks the message as deleted for the current user using `deleted_by_sender` or `deleted_by_receiver` flags
- Messages are filtered on load to hide deleted messages

### Privacy

- When you delete for yourself, the other person can still see the message
- When you delete for everyone, the message is permanently removed and cannot be recovered
- The 5-minute window ensures messages can only be deleted shortly after sending

## Testing

1. Send a message to another user
2. Hover over the message you just sent
3. Click the three-dot menu (⋮) that appears
4. Choose either "Delete for everyone" or "Delete for me"
5. Verify the message is removed as expected
6. Wait 5 minutes and verify the delete option no longer appears

## Notes

- Make sure to run the SQL commands above in your Supabase project before using this feature
- The feature works automatically once the database columns are added
- Messages encrypted with the crypto library remain secure during deletion operations
