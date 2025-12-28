-- Add FCM token column to profiles table for push notifications
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON profiles(fcm_token);
