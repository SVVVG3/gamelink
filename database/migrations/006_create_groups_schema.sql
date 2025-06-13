-- Migration: 006_create_groups_schema.sql
-- Description: Create groups and memberships tables for group functionality
-- Author: GameLink Development Team
-- Created: 2024-12-19

-- ========================================
-- GROUPS TABLE
-- ========================================

CREATE TABLE groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT,
    avatar_url TEXT,
    is_private BOOLEAN DEFAULT false,
    max_members INTEGER DEFAULT 50 CHECK (max_members > 0 AND max_members <= 1000),
    
    -- Group settings
    allow_member_invites BOOLEAN DEFAULT true,
    require_admin_approval BOOLEAN DEFAULT false,
    
    -- Gaming-specific metadata
    primary_game VARCHAR(100),
    gaming_platform VARCHAR(50),
    skill_level VARCHAR(20) CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert', 'any')),
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Indexes for performance
    CONSTRAINT unique_group_name_per_creator UNIQUE (name, created_by)
);

-- Add indexes for groups table
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_primary_game ON groups(primary_game);
CREATE INDEX idx_groups_gaming_platform ON groups(gaming_platform);
CREATE INDEX idx_groups_is_private ON groups(is_private);
CREATE INDEX idx_groups_created_at ON groups(created_at);
CREATE INDEX idx_groups_name_search ON groups USING gin(to_tsvector('english', name));
CREATE INDEX idx_groups_description_search ON groups USING gin(to_tsvector('english', description));

-- ========================================
-- GROUP MEMBERSHIPS TABLE
-- ========================================

CREATE TABLE group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Membership status and role
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned', 'pending')),
    
    -- Invitation metadata
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    invite_message TEXT,
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_user_per_group UNIQUE (group_id, user_id)
);

-- Add indexes for group_memberships table
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX idx_group_memberships_role ON group_memberships(role);
CREATE INDEX idx_group_memberships_status ON group_memberships(status);
CREATE INDEX idx_group_memberships_joined_at ON group_memberships(joined_at);
CREATE INDEX idx_group_memberships_last_active ON group_memberships(last_active_at);

-- ========================================
-- GROUP INVITATIONS TABLE
-- ========================================

CREATE TABLE group_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Invitation details
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    
    -- Timestamps
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '7 days') NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_pending_invitation UNIQUE (group_id, invitee_id, status) 
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT no_self_invitation CHECK (inviter_id != invitee_id)
);

-- Add indexes for group_invitations table
CREATE INDEX idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_inviter_id ON group_invitations(inviter_id);
CREATE INDEX idx_group_invitations_invitee_id ON group_invitations(invitee_id);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);
CREATE INDEX idx_group_invitations_expires_at ON group_invitations(expires_at);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- Groups table policies
CREATE POLICY "Users can view public groups" ON groups
    FOR SELECT USING (is_private = false);

CREATE POLICY "Users can view groups they are members of" ON groups
    FOR SELECT USING (
        id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can create groups" ON groups
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group creators and admins can update groups" ON groups
    FOR UPDATE USING (
        created_by = auth.uid() OR
        id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND role IN ('admin') AND status = 'active'
        )
    );

CREATE POLICY "Group creators and admins can delete groups" ON groups
    FOR DELETE USING (
        created_by = auth.uid() OR
        id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND role IN ('admin') AND status = 'active'
        )
    );

-- Group memberships table policies
CREATE POLICY "Users can view memberships of groups they belong to" ON group_memberships
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_memberships m2 
            WHERE m2.user_id = auth.uid() AND m2.status = 'active'
        ) OR
        group_id IN (
            SELECT id FROM groups WHERE is_private = false
        )
    );

CREATE POLICY "Group admins can manage memberships" ON group_memberships
    FOR ALL USING (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND role IN ('admin') AND status = 'active'
        )
    );

CREATE POLICY "Users can leave groups" ON group_memberships
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can update their own membership" ON group_memberships
    FOR UPDATE USING (user_id = auth.uid());

-- Group invitations table policies
CREATE POLICY "Users can view their own invitations" ON group_invitations
    FOR SELECT USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Group members can create invitations" ON group_invitations
    FOR INSERT WITH CHECK (
        inviter_id = auth.uid() AND
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE user_id = auth.uid() AND status = 'active' AND
            (role IN ('admin', 'moderator') OR 
             (role = 'member' AND group_id IN (
                 SELECT id FROM groups WHERE allow_member_invites = true
             )))
        )
    );

CREATE POLICY "Users can respond to their invitations" ON group_invitations
    FOR UPDATE USING (invitee_id = auth.uid());

-- ========================================
-- DATABASE FUNCTIONS
-- ========================================

-- Function to automatically add group creator as admin
CREATE OR REPLACE FUNCTION add_group_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO group_memberships (group_id, user_id, role, status)
    VALUES (NEW.id, NEW.created_by, 'admin', 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update group member count and last activity
CREATE OR REPLACE FUNCTION update_group_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE groups 
    SET updated_at = timezone('utc'::text, now())
    WHERE id = COALESCE(NEW.group_id, OLD.group_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to handle invitation acceptance
CREATE OR REPLACE FUNCTION accept_group_invitation(invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    invitation_record group_invitations%ROWTYPE;
    membership_exists BOOLEAN;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record 
    FROM group_invitations 
    WHERE id = invitation_id AND invitee_id = auth.uid() AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if already a member
    SELECT EXISTS(
        SELECT 1 FROM group_memberships 
        WHERE group_id = invitation_record.group_id 
        AND user_id = invitation_record.invitee_id 
        AND status = 'active'
    ) INTO membership_exists;
    
    IF membership_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Accept invitation
    UPDATE group_invitations 
    SET status = 'accepted', 
        responded_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = invitation_id;
    
    -- Add membership
    INSERT INTO group_memberships (group_id, user_id, role, status, invited_by)
    VALUES (invitation_record.group_id, invitation_record.invitee_id, 'member', 'active', invitation_record.inviter_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get group member count
CREATE OR REPLACE FUNCTION get_group_member_count(group_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM group_memberships 
        WHERE group_memberships.group_id = get_group_member_count.group_id 
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger to automatically add group creator as admin
CREATE TRIGGER trigger_add_group_creator_as_admin
    AFTER INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION add_group_creator_as_admin();

-- Trigger to update group stats on membership changes
CREATE TRIGGER trigger_update_group_stats_on_membership
    AFTER INSERT OR UPDATE OR DELETE ON group_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_group_stats();

-- Trigger to update timestamps
CREATE TRIGGER trigger_update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trigger_update_group_memberships_updated_at
    BEFORE UPDATE ON group_memberships
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trigger_update_group_invitations_updated_at
    BEFORE UPDATE ON group_invitations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ========================================
-- SAMPLE DATA (FOR TESTING)
-- ========================================

-- Insert sample groups (only if profiles exist)
DO $$
DECLARE
    sample_user_id UUID;
BEGIN
    -- Get first available user for testing
    SELECT id INTO sample_user_id FROM profiles LIMIT 1;
    
    IF sample_user_id IS NOT NULL THEN
        INSERT INTO groups (name, description, primary_game, gaming_platform, skill_level, created_by) VALUES
        ('Apex Legends Squad', 'Competitive Apex Legends team looking for skilled players', 'Apex Legends', 'PC', 'advanced', sample_user_id),
        ('Casual Minecraft Builders', 'Relaxed Minecraft community for creative building', 'Minecraft', 'Any', 'any', sample_user_id),
        ('Valorant Ranked Grind', 'Serious Valorant players climbing the ranked ladder', 'Valorant', 'PC', 'intermediate', sample_user_id);
    END IF;
END $$;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

-- Add comment to track migration
COMMENT ON TABLE groups IS 'Gaming groups for organizing players and events - Migration 006';
COMMENT ON TABLE group_memberships IS 'User memberships in gaming groups - Migration 006';
COMMENT ON TABLE group_invitations IS 'Invitations to join gaming groups - Migration 006'; 