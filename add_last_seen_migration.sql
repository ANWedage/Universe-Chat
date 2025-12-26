-- Add last_seen column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance on last_seen queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);

-- Update existing profiles to have current timestamp
UPDATE profiles SET last_seen = NOW() WHERE last_seen IS NULL;
