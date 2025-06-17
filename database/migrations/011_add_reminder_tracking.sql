-- Add reminder tracking fields to events table
-- This prevents duplicate reminder notifications

ALTER TABLE events 
ADD COLUMN reminder_24h_sent_at TIMESTAMPTZ,
ADD COLUMN reminder_1h_sent_at TIMESTAMPTZ,
ADD COLUMN reminder_starting_sent_at TIMESTAMPTZ;

-- Add indexes for efficient querying
CREATE INDEX idx_events_reminder_24h_sent_at ON events(reminder_24h_sent_at);
CREATE INDEX idx_events_reminder_1h_sent_at ON events(reminder_1h_sent_at);
CREATE INDEX idx_events_reminder_starting_sent_at ON events(reminder_starting_sent_at);

-- Add comment explaining the purpose
COMMENT ON COLUMN events.reminder_24h_sent_at IS 'Timestamp when 24-hour reminder was sent';
COMMENT ON COLUMN events.reminder_1h_sent_at IS 'Timestamp when 1-hour reminder was sent';
COMMENT ON COLUMN events.reminder_starting_sent_at IS 'Timestamp when starting reminder was sent'; 