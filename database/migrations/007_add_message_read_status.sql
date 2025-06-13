-- Migration: Add read status tracking to messages table
-- This enables notification badges for unread messages

-- Add is_read column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add read_at timestamp for when message was read
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance when querying unread messages
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at);

-- Create a table to track message read status per user (for group chats)
-- In group chats, each message can be read by multiple users
CREATE TABLE IF NOT EXISTS message_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Create indexes for message_read_status
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);

-- Function to mark a message as read for a specific user
CREATE OR REPLACE FUNCTION mark_message_read(msg_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert or update read status
  INSERT INTO message_read_status (message_id, user_id, read_at)
  VALUES (msg_id, user_id, NOW())
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET read_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to mark all messages in a chat as read for a user
CREATE OR REPLACE FUNCTION mark_chat_messages_read(chat_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO message_read_status (message_id, user_id, read_at)
  SELECT m.id, user_id, NOW()
  FROM messages m
  WHERE m.chat_id = chat_id
    AND m.sender_id != user_id -- Don't mark own messages as read
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET read_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON message_read_status TO anon, authenticated; 