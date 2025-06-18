-- Migration: 012_add_archived_status.sql
-- Description: Add 'archived' as a valid event status for completed events
-- Author: GameLink Development Team
-- Created: 2024-12-19

-- Add 'archived' to the status check constraint
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events 
ADD CONSTRAINT events_status_check 
CHECK (status IN ('draft', 'upcoming', 'live', 'completed', 'cancelled', 'archived'));

-- Add comment explaining the archived status
COMMENT ON COLUMN events.status IS 'Event status: draft (not published), upcoming (published, not started), live (currently running), completed (finished), cancelled (cancelled by organizer), archived (completed and archived for history)'; 