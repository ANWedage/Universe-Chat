-- Add image_url column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] = 'chat-images'
);

-- RLS Policy: Allow public read access to images
CREATE POLICY "Allow public read access to images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- RLS Policy: Allow users to delete their own images
CREATE POLICY "Allow users to delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  owner = auth.uid()
);
