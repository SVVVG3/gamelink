-- Migration: 010_add_event_chat_support.sql
-- Description: Add chat support for events by linking events to group chats
-- Author: GameLink Development Team
-- Created: 2024-12-19

-- Add chat_id field to events table to link events with their group chats
ALTER TABLE events 
ADD COLUMN chat_id UUID REFERENCES chats(id) ON DELETE SET NULL;

-- Add index for the new chat_id field
CREATE INDEX IF NOT EXISTS idx_events_chat_id ON events(chat_id);

-- Add comment to document the purpose
COMMENT ON COLUMN events.chat_id IS 'Links event to its group chat for participant communication';

-- Update RLS policies to allow chat access for event participants
-- This policy allows users to view chats for events they're participating in
CREATE POLICY "Users can view event chats they participate in" ON chats
    FOR SELECT USING (
        id IN (
            SELECT chat_id FROM events 
            WHERE chat_id IS NOT NULL 
            AND id IN (
                SELECT event_id FROM event_participants 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Allow event participants to send messages in event chats
CREATE POLICY "Event participants can send messages in event chats" ON messages
    FOR INSERT WITH CHECK (
        chat_id IN (
            SELECT e.chat_id FROM events e
            JOIN event_participants ep ON e.id = ep.event_id
            WHERE e.chat_id IS NOT NULL 
            AND ep.user_id = auth.uid()
            AND ep.status IN ('registered', 'confirmed', 'attended')
        )
    );

-- Allow event participants to view messages in event chats
CREATE POLICY "Event participants can view messages in event chats" ON messages
    FOR SELECT USING (
        chat_id IN (
            SELECT e.chat_id FROM events e
            JOIN event_participants ep ON e.id = ep.event_id
            WHERE e.chat_id IS NOT NULL 
            AND ep.user_id = auth.uid()
            AND ep.status IN ('registered', 'confirmed', 'attended')
        )
    ); 