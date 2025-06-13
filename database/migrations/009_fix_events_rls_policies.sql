-- Migration 009: Fix Events RLS Policies
-- Fix infinite recursion in event_participants RLS policies
-- Since we're using Farcaster authentication (FID-based) instead of Supabase auth,
-- we need to disable RLS temporarily and handle security at the application level

-- Disable RLS on events and event_participants tables
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants DISABLE ROW LEVEL SECURITY;

-- Drop existing policies that were causing infinite recursion
DROP POLICY IF EXISTS "Users can view public events" ON events;
DROP POLICY IF EXISTS "Users can view events they created" ON events;
DROP POLICY IF EXISTS "Users can view events they're participating in" ON events;
DROP POLICY IF EXISTS "Users can view group events if they're group members" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Event creators can update their events" ON events;
DROP POLICY IF EXISTS "Event creators can delete their events" ON events;

DROP POLICY IF EXISTS "Users can view participants of events they can see" ON event_participants;
DROP POLICY IF EXISTS "Users can register for events" ON event_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON event_participants;
DROP POLICY IF EXISTS "Event creators can manage all participants" ON event_participants;
DROP POLICY IF EXISTS "Users can cancel their own participation" ON event_participants;

-- Add comments explaining the security model
COMMENT ON TABLE events IS 'Gaming events and tournaments - Security handled at application level with Farcaster FID authentication';
COMMENT ON TABLE event_participants IS 'Event participation tracking - Security handled at application level with Farcaster FID authentication';

-- Note: In the future, we can re-enable RLS with FID-based policies if needed
-- For now, application-level security is sufficient for the MVP 