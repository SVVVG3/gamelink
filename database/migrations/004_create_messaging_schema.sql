-- Migration: Create messaging schema for chats and messages
-- Supports both 1:1 and group chats

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT, -- Optional name for group chats, null for 1:1 chats
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')) DEFAULT 'direct',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create chat_participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fid INTEGER, -- Farcaster ID for easy lookup
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT false,
  UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_fid INTEGER, -- Farcaster ID for easy lookup
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL, -- For threaded replies
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_created_by ON chats(created_by);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_type ON chats(type);

CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_fid ON chat_participants(fid);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_fid ON messages(sender_fid);

-- Enable Row Level Security (RLS)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
CREATE POLICY "Users can view chats they participate in" ON chats
  FOR SELECT USING (
    id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Users can create chats" ON chats
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Chat creators and admins can update chats" ON chats
  FOR UPDATE USING (
    created_by = auth.uid() OR
    id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = auth.uid() AND is_admin = true AND left_at IS NULL
    )
  );

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants of chats they're in" ON chat_participants
  FOR SELECT USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Chat creators and admins can manage participants" ON chat_participants
  FOR ALL USING (
    chat_id IN (
      SELECT id FROM chats WHERE created_by = auth.uid()
    ) OR
    chat_id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = auth.uid() AND is_admin = true AND left_at IS NULL
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in chats they participate in" ON messages
  FOR SELECT USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Users can send messages to chats they participate in" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    chat_id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Function to update chat's last_message_at when a new message is sent
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats 
  SET last_message_at = NEW.created_at, updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_message_at
CREATE TRIGGER trigger_update_chat_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_last_message();

-- Function to create a direct chat between two users
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
GRANT ALL ON chats TO anon, authenticated;
GRANT ALL ON chat_participants TO anon, authenticated;
GRANT ALL ON messages TO anon, authenticated; 