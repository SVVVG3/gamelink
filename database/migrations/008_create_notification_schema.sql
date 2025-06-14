-- Migration 008: Create Notification Schema
-- Creates tables for notification tokens and user preferences

-- Create notification_tokens table for Mini App notification tokens
CREATE TABLE IF NOT EXISTS notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fid INTEGER NOT NULL REFERENCES profiles(fid) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_preferences table for user notification settings
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fid INTEGER NOT NULL REFERENCES profiles(fid) ON DELETE CASCADE UNIQUE,
  messages_enabled BOOLEAN DEFAULT true,
  group_invites_enabled BOOLEAN DEFAULT true,
  events_enabled BOOLEAN DEFAULT true,
  groups_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_fid ON notification_tokens(user_fid);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_enabled ON notification_tokens(enabled);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_token ON notification_tokens(token);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_fid ON notification_preferences(user_fid);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_messages ON notification_preferences(messages_enabled);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_group_invites ON notification_preferences(group_invites_enabled);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_events ON notification_preferences(events_enabled);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_groups ON notification_preferences(groups_enabled);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER trigger_notification_tokens_updated_at
  BEFORE UPDATE ON notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- Function to store or update notification token
CREATE OR REPLACE FUNCTION store_notification_token(
  p_user_fid INTEGER,
  p_token TEXT
) RETURNS UUID AS $$
DECLARE
  token_id UUID;
BEGIN
  -- Insert or update notification token
  INSERT INTO notification_tokens (user_fid, token, enabled)
  VALUES (p_user_fid, p_token, true)
  ON CONFLICT (token) 
  DO UPDATE SET 
    user_fid = EXCLUDED.user_fid,
    enabled = true,
    updated_at = NOW()
  RETURNING id INTO token_id;
  
  RETURN token_id;
END;
$$ LANGUAGE plpgsql;

-- Function to disable notification token
CREATE OR REPLACE FUNCTION disable_notification_token(
  p_token TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notification_tokens 
  SET enabled = false, updated_at = NOW()
  WHERE token = p_token;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get enabled notification tokens for user
CREATE OR REPLACE FUNCTION get_user_notification_tokens(
  p_user_fid INTEGER
) RETURNS TABLE(token TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT nt.token
  FROM notification_tokens nt
  WHERE nt.user_fid = p_user_fid 
    AND nt.enabled = true;
END;
$$ LANGUAGE plpgsql;

-- Function to create default notification preferences
CREATE OR REPLACE FUNCTION create_default_notification_preferences(
  p_user_fid INTEGER
) RETURNS UUID AS $$
DECLARE
  pref_id UUID;
BEGIN
  INSERT INTO notification_preferences (
    user_fid,
    messages_enabled,
    group_invites_enabled,
    events_enabled,
    groups_enabled
  )
  VALUES (
    p_user_fid,
    true,
    true,
    true,
    true
  )
  ON CONFLICT (user_fid) DO NOTHING
  RETURNING id INTO pref_id;
  
  RETURN pref_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
  p_user_fid INTEGER,
  p_messages_enabled BOOLEAN DEFAULT NULL,
  p_group_invites_enabled BOOLEAN DEFAULT NULL,
  p_events_enabled BOOLEAN DEFAULT NULL,
  p_groups_enabled BOOLEAN DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Create preferences if they don't exist
  INSERT INTO notification_preferences (user_fid)
  VALUES (p_user_fid)
  ON CONFLICT (user_fid) DO NOTHING;
  
  -- Update preferences
  UPDATE notification_preferences
  SET 
    messages_enabled = COALESCE(p_messages_enabled, messages_enabled),
    group_invites_enabled = COALESCE(p_group_invites_enabled, group_invites_enabled),
    events_enabled = COALESCE(p_events_enabled, events_enabled),
    groups_enabled = COALESCE(p_groups_enabled, groups_enabled),
    updated_at = NOW()
  WHERE user_fid = p_user_fid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to check if notification type is enabled for user
CREATE OR REPLACE FUNCTION is_notification_enabled(
  p_user_fid INTEGER,
  p_notification_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  is_enabled BOOLEAN := true; -- Default to enabled
BEGIN
  CASE p_notification_type
    WHEN 'messages' THEN
      SELECT messages_enabled INTO is_enabled
      FROM notification_preferences
      WHERE user_fid = p_user_fid;
    WHEN 'group_invites' THEN
      SELECT group_invites_enabled INTO is_enabled
      FROM notification_preferences
      WHERE user_fid = p_user_fid;
    WHEN 'events' THEN
      SELECT events_enabled INTO is_enabled
      FROM notification_preferences
      WHERE user_fid = p_user_fid;
    WHEN 'groups' THEN
      SELECT groups_enabled INTO is_enabled
      FROM notification_preferences
      WHERE user_fid = p_user_fid;
    ELSE
      is_enabled := false;
  END CASE;
  
  -- If no preferences found, default to enabled
  RETURN COALESCE(is_enabled, true);
END;
$$ LANGUAGE plpgsql;

-- Function to get users with notification type enabled
CREATE OR REPLACE FUNCTION get_users_with_notifications_enabled(
  p_user_fids INTEGER[],
  p_notification_type TEXT
) RETURNS INTEGER[] AS $$
DECLARE
  enabled_fids INTEGER[];
  column_name TEXT;
BEGIN
  -- Determine column name based on notification type
  CASE p_notification_type
    WHEN 'messages' THEN column_name := 'messages_enabled';
    WHEN 'group_invites' THEN column_name := 'group_invites_enabled';
    WHEN 'events' THEN column_name := 'events_enabled';
    WHEN 'groups' THEN column_name := 'groups_enabled';
    ELSE RETURN p_user_fids; -- Return all if invalid type
  END CASE;
  
  -- Get users with notifications enabled
  EXECUTE format('
    SELECT ARRAY_AGG(user_fid)
    FROM notification_preferences
    WHERE user_fid = ANY($1) AND %I = true
  ', column_name)
  INTO enabled_fids
  USING p_user_fids;
  
  -- Include users without preferences (default to enabled)
  SELECT ARRAY_AGG(fid) INTO enabled_fids
  FROM (
    SELECT unnest(p_user_fids) AS fid
    EXCEPT
    SELECT user_fid FROM notification_preferences WHERE user_fid = ANY(p_user_fids)
  ) AS users_without_prefs;
  
  -- Combine enabled users and users without preferences
  SELECT ARRAY_AGG(DISTINCT fid)
  FROM (
    SELECT unnest(COALESCE(enabled_fids, ARRAY[]::INTEGER[])) AS fid
    UNION
    SELECT unnest(p_user_fids) AS fid
    WHERE NOT EXISTS (
      SELECT 1 FROM notification_preferences 
      WHERE user_fid = ANY(p_user_fids)
    )
  ) AS combined_fids
  INTO enabled_fids;
  
  RETURN COALESCE(enabled_fids, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE notification_tokens IS 'Stores notification tokens from Farcaster Mini App events';
COMMENT ON TABLE notification_preferences IS 'User preferences for different types of notifications';
COMMENT ON FUNCTION store_notification_token IS 'Store or update a notification token for a user';
COMMENT ON FUNCTION disable_notification_token IS 'Disable a notification token';
COMMENT ON FUNCTION get_user_notification_tokens IS 'Get all enabled notification tokens for a user';
COMMENT ON FUNCTION create_default_notification_preferences IS 'Create default notification preferences for a user';
COMMENT ON FUNCTION update_notification_preferences IS 'Update notification preferences for a user';
COMMENT ON FUNCTION is_notification_enabled IS 'Check if a notification type is enabled for a user';
COMMENT ON FUNCTION get_users_with_notifications_enabled IS 'Filter users by notification preferences'; 