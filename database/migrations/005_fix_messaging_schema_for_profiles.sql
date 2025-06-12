-- Migration: Fix messaging schema to work with profiles table instead of auth.users
-- This fixes foreign key constraints that were referencing auth.users

-- First, we need to ensure the profiles table exists
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fid INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  bio TEXT,
  pfp_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing foreign key constraints that reference auth.users
ALTER TABLE IF EXISTS chats DROP CONSTRAINT IF EXISTS chats_created_by_fkey;
ALTER TABLE IF EXISTS chat_participants DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Drop existing RLS policies that use auth.uid()
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Chat creators and admins can update chats" ON chats;
DROP POLICY IF EXISTS "Users can view participants of chats they're in" ON chat_participants;
DROP POLICY IF EXISTS "Chat creators and admins can manage participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages in chats they participate in" ON messages;
DROP POLICY IF EXISTS "Users can send messages to chats they participate in" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Disable RLS temporarily to allow updates
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Update foreign key constraints to reference profiles table
ALTER TABLE chats 
  ADD CONSTRAINT chats_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE chat_participants 
  ADD CONSTRAINT chat_participants_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE messages 
  ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update the create_direct_chat function to work with profiles
CREATE OR REPLACE FUNCTION create_direct_chat(user1_id UUID, user1_fid INTEGER, user2_id UUID, user2_fid INTEGER)
RETURNS UUID AS $$
DECLARE
  chat_id UUID;
  existing_chat_id UUID;
BEGIN
  -- Check if a direct chat already exists between these users
  SELECT c.id INTO existing_chat_id
  FROM chats c
  WHERE c.type = 'direct'
    AND c.id IN (
      SELECT cp1.chat_id 
      FROM chat_participants cp1
      WHERE cp1.user_id = user1_id AND cp1.left_at IS NULL
    )
    AND c.id IN (
      SELECT cp2.chat_id 
      FROM chat_participants cp2
      WHERE cp2.user_id = user2_id AND cp2.left_at IS NULL
    );

  -- If chat exists, return it
  IF existing_chat_id IS NOT NULL THEN
    RETURN existing_chat_id;
  END IF;

  -- Create new direct chat
  INSERT INTO chats (type, created_by)
  VALUES ('direct', user1_id)
  RETURNING id INTO chat_id;

  -- Add both participants
  INSERT INTO chat_participants (chat_id, user_id, fid)
  VALUES 
    (chat_id, user1_id, user1_fid),
    (chat_id, user2_id, user2_fid);

  RETURN chat_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON chats TO anon, authenticated;
GRANT ALL ON chat_participants TO anon, authenticated;
GRANT ALL ON messages TO anon, authenticated; 