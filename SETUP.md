# Universe Chat Setup Instructions

## Prerequisites
- Node.js installed
- A Supabase account (free tier works fine)

## 1. Supabase Setup

### Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Wait for the project to be ready

### Create Database Tables

Run these SQL commands in the Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Messages policies
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Create indexes for better performance
CREATE INDEX messages_sender_id_idx ON messages(sender_id);
CREATE INDEX messages_receiver_id_idx ON messages(receiver_id);
CREATE INDEX messages_created_at_idx ON messages(created_at);
CREATE INDEX profiles_username_idx ON profiles(username);

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### Enable Realtime in Supabase Dashboard (IMPORTANT!)

After running the SQL above, enable Realtime for the messages table:

**Option 1: Using Table Editor (Easiest)**
1. Go to **Table Editor** in your Supabase dashboard
2. Click on the **messages** table
3. Click the settings icon (⚙️) or right-click the table
4. Look for **Enable Realtime** or **Realtime** toggle
5. Turn it **ON**

**Option 2: Using Database Settings**
1. Go to **Database** > **Publications** in your Supabase dashboard
2. Find **supabase_realtime** publication
3. Make sure **messages** table is listed/checked
4. If not, the SQL command above should have added it

**Option 3: Verify with SQL**
Run this in SQL Editor to verify:
```sql
-- Check if messages table is in the publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'messages';
```
If it returns a row, Realtime is configured correctly!

### Get Your Supabase Credentials

1. Go to Project Settings > API
2. Copy your project URL
3. Copy your anon/public key
4. Update the `.env.local` file with these values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 2. Run the Application

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### ✨ User Authentication
- Sign up with email and password
- Login securely
- Automatic session management

### 👥 User Search
- Search users by username or full name
- Real-time filtering
- Beautiful user list interface

### 💬 Real-time Chat
- Instant message delivery
- Live updates when new messages arrive
- Beautiful modern UI with gradients
- Message timestamps
- Read status tracking

### 🎨 Modern UI Design
- Gradient backgrounds
- Smooth animations
- Dark mode support
- Responsive design
- Glassmorphism effects

## Project Structure

```
universe/
├── app/
│   ├── chat/
│   │   └── page.tsx          # Main chat interface
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── signup/
│   │   └── page.tsx          # Sign up page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # Landing page
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser Supabase client
│   │   ├── server.ts         # Server Supabase client
│   │   └── middleware.ts     # Auth middleware
│   └── types/
│       └── database.types.ts # TypeScript types
├── middleware.ts             # Next.js middleware
└── .env.local               # Environment variables
```

## Usage

1. **Create an Account**: Click "Get Started" and fill in your details
2. **Login**: Use your email and password to sign in
3. **Search Users**: Use the search bar to find other users
4. **Start Chatting**: Click on any user to start a conversation
5. **Send Messages**: Type your message and click send or press Enter

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Date Formatting**: date-fns

## Tips

- Messages are delivered in real-time using Supabase Realtime
- The chat automatically scrolls to new messages
- You can search users by their full name or username
- All data is secured with Row Level Security policies
- Dark mode is automatically supported based on system preferences

Enjoy chatting in the Universe! 🚀✨
