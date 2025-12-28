-- Add delivered column to messages table for message status tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_delivered ON messages(delivered);

-- Update existing messages to mark as delivered if they are already read
UPDATE messages SET delivered = true WHERE read = true;
