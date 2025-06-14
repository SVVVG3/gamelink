-- Migration 009: Add Message Notification Triggers
-- Creates triggers to automatically send notifications for new messages

-- Function to send message notification (calls Next.js API)
CREATE OR REPLACE FUNCTION send_message_notification(message_id UUID)
RETURNS VOID AS $$
DECLARE
  app_domain TEXT := 'https://farcaster-gamelink.vercel.app';
  api_url TEXT;
BEGIN
  -- Construct API URL
  api_url := app_domain || '/api/notifications/message';
  
  -- Make HTTP request to Next.js API (using pg_net extension if available)
  -- For now, we'll log the notification request
  RAISE NOTICE 'Message notification requested for message ID: %', message_id;
  
  -- TODO: Implement actual HTTP request when pg_net is available
  -- SELECT net.http_post(
  --   url := api_url,
  --   headers := '{"Content-Type": "application/json"}'::jsonb,
  --   body := json_build_object('messageId', message_id)::text
  -- );
END;
$$ LANGUAGE plpgsql;

-- Function to send group invitation notification
CREATE OR REPLACE FUNCTION send_group_invitation_notification(invitation_id UUID)
RETURNS VOID AS $$
DECLARE
  app_domain TEXT := 'https://farcaster-gamelink.vercel.app';
  api_url TEXT;
BEGIN
  -- Construct API URL
  api_url := app_domain || '/api/notifications/group-invitation';
  
  -- Make HTTP request to Next.js API
  RAISE NOTICE 'Group invitation notification requested for invitation ID: %', invitation_id;
  
  -- TODO: Implement actual HTTP request when pg_net is available
END;
$$ LANGUAGE plpgsql;

-- Function to send event creation notification
CREATE OR REPLACE FUNCTION send_event_creation_notification(event_id UUID)
RETURNS VOID AS $$
DECLARE
  app_domain TEXT := 'https://farcaster-gamelink.vercel.app';
  api_url TEXT;
BEGIN
  -- Construct API URL
  api_url := app_domain || '/api/notifications/event-creation';
  
  -- Make HTTP request to Next.js API
  RAISE NOTICE 'Event creation notification requested for event ID: %', event_id;
  
  -- TODO: Implement actual HTTP request when pg_net is available
END;
$$ LANGUAGE plpgsql;

-- Function to send group creation notification
CREATE OR REPLACE FUNCTION send_group_creation_notification(group_id UUID)
RETURNS VOID AS $$
DECLARE
  app_domain TEXT := 'https://farcaster-gamelink.vercel.app';
  api_url TEXT;
BEGIN
  -- Construct API URL
  api_url := app_domain || '/api/notifications/group-creation';
  
  -- Make HTTP request to Next.js API
  RAISE NOTICE 'Group creation notification requested for group ID: %', group_id;
  
  -- TODO: Implement actual HTTP request when pg_net is available
END;
$$ LANGUAGE plpgsql;

-- Trigger function for new messages
CREATE OR REPLACE FUNCTION notify_message_recipients()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify for text messages (not system messages)
  IF NEW.message_type = 'text' THEN
    -- Send notification asynchronously
    PERFORM send_message_notification(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for new group invitations
CREATE OR REPLACE FUNCTION notify_group_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification for new invitation
  PERFORM send_group_invitation_notification(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for new events
CREATE OR REPLACE FUNCTION notify_event_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification for new event
  PERFORM send_event_creation_notification(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for new groups
CREATE OR REPLACE FUNCTION notify_group_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify for public groups
  IF NEW.is_private = false THEN
    -- Send notification for new public group
    PERFORM send_group_creation_notification(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_recipients();

CREATE TRIGGER trigger_notify_group_invitation
  AFTER INSERT ON group_invitations
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_invitation();

CREATE TRIGGER trigger_notify_event_creation
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_creation();

CREATE TRIGGER trigger_notify_group_creation
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_creation();

-- Add comments for documentation
COMMENT ON FUNCTION send_message_notification IS 'Send notification for new message via API';
COMMENT ON FUNCTION send_group_invitation_notification IS 'Send notification for group invitation via API';
COMMENT ON FUNCTION send_event_creation_notification IS 'Send notification for event creation via API';
COMMENT ON FUNCTION send_group_creation_notification IS 'Send notification for group creation via API';
COMMENT ON FUNCTION notify_message_recipients IS 'Trigger function to notify message recipients';
COMMENT ON FUNCTION notify_group_invitation IS 'Trigger function to notify group invitation recipient';
COMMENT ON FUNCTION notify_event_creation IS 'Trigger function to notify event creation to mutuals';
COMMENT ON FUNCTION notify_group_creation IS 'Trigger function to notify group creation to mutuals'; 