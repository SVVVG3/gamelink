-- Create group_removals table to track when users are removed from groups
CREATE TABLE IF NOT EXISTS group_removals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  removed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  removed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one removal record per user per group
  UNIQUE(group_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_removals_group_id ON group_removals(group_id);
CREATE INDEX IF NOT EXISTS idx_group_removals_user_id ON group_removals(user_id);
CREATE INDEX IF NOT EXISTS idx_group_removals_removed_by ON group_removals(removed_by);

-- Add RLS policies
ALTER TABLE group_removals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own removal records
CREATE POLICY "Users can view their own removal records" ON group_removals
  FOR SELECT USING (user_id = auth.uid());

-- Policy: Group admins can view removal records for their groups
CREATE POLICY "Group admins can view group removal records" ON group_removals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_removals.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('admin')
      AND gm.status = 'active'
    )
  );

-- Policy: Group admins can insert removal records
CREATE POLICY "Group admins can insert removal records" ON group_removals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_removals.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('admin')
      AND gm.status = 'active'
    )
  );

-- Policy: Group admins can delete removal records (for re-inviting users)
CREATE POLICY "Group admins can delete removal records" ON group_removals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_removals.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('admin')
      AND gm.status = 'active'
    )
  ); 