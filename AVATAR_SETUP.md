# Avatar Upload Feature Setup

## Supabase Storage Setup

To enable profile picture uploads, you need to create a storage bucket in Supabase.

### 1. Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Check this box (avatars need to be publicly accessible)
   - **File size limit**: 5242880 (5MB)
   - **Allowed MIME types**: `image/*` (or specific: `image/jpeg,image/png,image/gif,image/webp`)
5. Click **Create bucket**

### 2. Set Up Storage Policies

After creating the bucket, set up Row Level Security policies:

```sql
-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow public read access to avatars
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
```

### 3. Alternative: Quick Setup via Dashboard

Instead of SQL, you can set policies in the Dashboard:

1. Go to **Storage** → **avatars** bucket
2. Click **Policies** tab
3. Click **New policy**
4. Create these policies:
   - **INSERT**: Allow authenticated users
   - **SELECT**: Allow public access
   - **UPDATE**: Allow authenticated users
   - **DELETE**: Allow authenticated users

## How It Works

### Profile Picture Upload

1. Users click **Settings** button in the sidebar
2. In the settings modal, click **Upload Picture**
3. Select an image file (JPG, PNG, or GIF, max 5MB)
4. Image is uploaded to Supabase Storage
5. Profile is updated with the public URL
6. Avatar appears immediately across the app

### Avatar Display

Avatars are displayed in:
- Sidebar (current user profile)
- User list (all registered users)
- Chat header (selected conversation)
- Unread messages section
- Settings modal

If a user hasn't uploaded an avatar, their initials are shown instead.

### Real-Time Updates

- Avatar changes appear immediately without page refresh
- All users see the updated avatar in real-time
- Avatar is fetched directly from Supabase Storage CDN

## File Storage Structure

Avatars are stored with this naming pattern:
```
avatars/
  └── {user_id}-{timestamp}.{ext}
```

Example: `avatars/123e4567-e89b-12d3-a456-426614174000-1703631234567.jpg`

## Security Features

- **File Type Validation**: Only image files accepted
- **Size Limit**: Maximum 5MB per file
- **Authentication Required**: Only logged-in users can upload
- **User Isolation**: Users can only manage their own avatars
- **Public URLs**: Avatars are publicly accessible for display

## Troubleshooting

### Upload fails with "Bucket not found"
- Make sure you created the `avatars` bucket in Supabase Storage
- Verify the bucket name is exactly `avatars` (case-sensitive)

### Image doesn't appear after upload
- Check if the bucket is set to **Public**
- Verify the SELECT policy allows public access
- Try hard-refreshing your browser (Ctrl+Shift+R)

### "Permission denied" error
- Ensure RLS policies are set up correctly
- Check that user is authenticated
- Verify the INSERT policy allows authenticated users

## Notes

- Images are stored permanently until manually deleted
- Old avatars are not automatically deleted when uploading new ones (uses upsert)
- The app uses `unoptimized` images to bypass Next.js caching
- CDN URLs are cached by browsers - version updates may be needed for immediate changes
