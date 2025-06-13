-- Migration: 008_create_events_schema.sql
-- Description: Create events and event_participants tables for gaming events and tournaments
-- Author: GameLink Development Team
-- Created: 2024-12-19

-- ========================================
-- EVENTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    
    -- Event details
    game VARCHAR(100),
    gaming_platform VARCHAR(50),
    event_type VARCHAR(50) DEFAULT 'casual' CHECK (event_type IN ('casual', 'tournament', 'practice', 'scrimmage', 'ranked')),
    skill_level VARCHAR(20) CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert', 'any')),
    
    -- Scheduling
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Capacity and requirements
    max_participants INTEGER DEFAULT 10 CHECK (max_participants > 0 AND max_participants <= 1000),
    min_participants INTEGER DEFAULT 1 CHECK (min_participants > 0),
    require_approval BOOLEAN DEFAULT false,
    
    -- Location/connection details
    location_type VARCHAR(20) DEFAULT 'online' CHECK (location_type IN ('online', 'in_person', 'hybrid')),
    connection_details TEXT, -- Discord server, game lobby info, etc.
    physical_location TEXT, -- For in-person events
    
    -- Event settings
    is_private BOOLEAN DEFAULT false,
    allow_spectators BOOLEAN DEFAULT true,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'live', 'completed', 'cancelled')),
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL, -- Optional: event can be associated with a group
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time > start_time),
    CONSTRAINT valid_participant_range CHECK (min_participants <= max_participants),
    CONSTRAINT valid_registration_deadline CHECK (registration_deadline IS NULL OR registration_deadline <= start_time)
);

-- Add indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);
CREATE INDEX IF NOT EXISTS idx_events_game ON events(game);
CREATE INDEX IF NOT EXISTS idx_events_gaming_platform ON events(gaming_platform);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_skill_level ON events(skill_level);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_is_private ON events(is_private);
CREATE INDEX IF NOT EXISTS idx_events_location_type ON events(location_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_title_search ON events USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_events_description_search ON events USING gin(to_tsvector('english', description));

-- ========================================
-- EVENT PARTICIPANTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Participation details
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'attended', 'no_show', 'cancelled', 'pending_approval')),
    role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('organizer', 'moderator', 'participant', 'spectator')),
    
    -- Registration metadata
    registration_message TEXT,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance tracking (for tournaments)
    placement INTEGER, -- Final ranking/placement
    score INTEGER,
    notes TEXT,
    
    -- Timestamps
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_user_per_event UNIQUE (event_id, user_id),
    CONSTRAINT valid_placement CHECK (placement IS NULL OR placement > 0)
);

-- Add indexes for event_participants table
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status);
CREATE INDEX IF NOT EXISTS idx_event_participants_role ON event_participants(role);
CREATE INDEX IF NOT EXISTS idx_event_participants_registered_at ON event_participants(registered_at);
CREATE INDEX IF NOT EXISTS idx_event_participants_placement ON event_participants(placement);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Events table policies
CREATE POLICY "Users can view public events" ON events
    FOR SELECT USING (is_private = false);

CREATE POLICY "Users can view events they created" ON events
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can view events they're participating in" ON events
    FOR SELECT USING (
        id IN (
            SELECT event_id FROM event_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view group events if they're group members" ON events
    FOR SELECT USING (
        group_id IS NOT NULL AND
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Event creators can update their events" ON events
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Event creators can delete their events" ON events
    FOR DELETE USING (created_by = auth.uid());

-- Event participants table policies
CREATE POLICY "Users can view participants of events they can see" ON event_participants
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM events WHERE 
                is_private = false OR 
                created_by = auth.uid() OR
                id IN (SELECT event_id FROM event_participants WHERE user_id = auth.uid()) OR
                (group_id IS NOT NULL AND group_id IN (
                    SELECT group_id FROM group_memberships 
                    WHERE user_id = auth.uid() AND status = 'active'
                ))
        )
    );

CREATE POLICY "Users can register for events" ON event_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" ON event_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Event creators can manage all participants" ON event_participants
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can cancel their own participation" ON event_participants
    FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to automatically add event creator as organizer
CREATE OR REPLACE FUNCTION add_event_creator_as_organizer()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO event_participants (event_id, user_id, role, status)
    VALUES (NEW.id, NEW.created_by, 'organizer', 'confirmed');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update event participant count
CREATE OR REPLACE FUNCTION update_event_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be extended to update cached participant counts
    -- For now, we'll just return the trigger result
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to check event capacity before allowing registration
CREATE OR REPLACE FUNCTION check_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
    current_participants INTEGER;
    max_capacity INTEGER;
BEGIN
    -- Get current participant count and max capacity
    SELECT COUNT(*), e.max_participants
    INTO current_participants, max_capacity
    FROM event_participants ep
    JOIN events e ON e.id = ep.event_id
    WHERE ep.event_id = NEW.event_id 
      AND ep.status IN ('registered', 'confirmed', 'attended')
      AND e.id = NEW.event_id
    GROUP BY e.max_participants;
    
    -- Check if adding this participant would exceed capacity
    IF current_participants >= max_capacity THEN
        RAISE EXCEPTION 'Event is at full capacity (% participants)', max_capacity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get event participant count
CREATE OR REPLACE FUNCTION get_event_participant_count(event_id UUID)
RETURNS INTEGER AS $$
DECLARE
    participant_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO participant_count
    FROM event_participants
    WHERE event_participants.event_id = get_event_participant_count.event_id
      AND status IN ('registered', 'confirmed', 'attended');
    
    RETURN COALESCE(participant_count, 0);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger to add event creator as organizer
CREATE TRIGGER trigger_add_event_creator_as_organizer
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION add_event_creator_as_organizer();

-- Trigger to update event stats when participants change
CREATE TRIGGER trigger_update_event_stats_on_participation
    AFTER INSERT OR UPDATE OR DELETE ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_event_stats();

-- Trigger to check capacity before allowing registration
CREATE TRIGGER trigger_check_event_capacity
    BEFORE INSERT ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION check_event_capacity();

-- Trigger to update timestamps
CREATE TRIGGER trigger_update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trigger_update_event_participants_updated_at
    BEFORE UPDATE ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ========================================
-- PERMISSIONS
-- ========================================

-- Grant permissions to authenticated users
GRANT ALL ON events TO anon, authenticated;
GRANT ALL ON event_participants TO anon, authenticated;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE events IS 'Gaming events and tournaments - Migration 008';
COMMENT ON TABLE event_participants IS 'Event participation tracking - Migration 008';

COMMENT ON COLUMN events.event_type IS 'Type of event: casual, tournament, practice, scrimmage, ranked';
COMMENT ON COLUMN events.skill_level IS 'Required skill level for participants';
COMMENT ON COLUMN events.location_type IS 'Whether event is online, in-person, or hybrid';
COMMENT ON COLUMN events.connection_details IS 'Discord server, game lobby info, etc.';
COMMENT ON COLUMN events.status IS 'Current status: draft, upcoming, live, completed, cancelled';

COMMENT ON COLUMN event_participants.status IS 'Participation status: registered, confirmed, attended, no_show, cancelled, pending_approval';
COMMENT ON COLUMN event_participants.role IS 'Role in event: organizer, moderator, participant, spectator';
COMMENT ON COLUMN event_participants.placement IS 'Final ranking/placement in tournament'; 