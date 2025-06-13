// Groups and memberships management for GameLink
// Handles group creation, membership management, and invitations

import { createClient } from './client'
import type { 
  Group, 
  GroupMembership, 
  GroupInvitation,
  GroupWithMemberCount,
  GroupWithMembers,
  GroupInvitationWithDetails,
  GroupFilters,
  CreateGroupData,
  UpdateGroupData
} from '../../types'

// Get Supabase client
const supabase = createClient()

// =================================
// GROUP MANAGEMENT
// =================================

/**
 * Get all groups with optional filtering
 */
export async function getGroups(filters?: GroupFilters) {
  try {
    let query = supabase
      .from('groups')
      .select(`
        *,
        group_memberships!inner(count)
      `)

    // Apply filters
    if (filters?.isPrivate !== undefined) {
      query = query.eq('is_private', filters.isPrivate)
    }
    if (filters?.primaryGame) {
      query = query.ilike('primary_game', `%${filters.primaryGame}%`)
    }
    if (filters?.gamingPlatform) {
      query = query.eq('gaming_platform', filters.gamingPlatform)
    }
    if (filters?.skillLevel) {
      query = query.eq('skill_level', filters.skillLevel)
    }
    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy)
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data: groups, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching groups:', error)
      throw error
    }

    return groups || []
  } catch (error) {
    console.error('Error in getGroups:', error)
    throw error
  }
}

/**
 * Get groups user is a member of
 */
export async function getUserGroups(userId: string): Promise<GroupWithMemberCount[]> {
  try {
    const { data: memberships, error } = await supabase
      .from('group_memberships')
      .select(`
        role,
        status,
        groups!inner(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching user groups:', error)
      throw error
    }

    if (!memberships) return []

    // For now, return groups with a default member count to avoid query issues
    // We can optimize this later with a more efficient query
    return memberships.map((membership: any) => ({
      ...membership.groups,
      memberCount: 1, // Default count, will be updated in future optimization
      isUserMember: true,
      userRole: membership.role
    }))
  } catch (error) {
    console.error('Error in getUserGroups:', error)
    throw error
  }
}

/**
 * Get public groups for discovery
 */
export async function getPublicGroups(options?: { limit?: number; offset?: number }): Promise<GroupWithMemberCount[]> {
  try {
    let query = supabase
      .from('groups')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data: groups, error } = await query

    if (error) {
      console.error('Error fetching public groups:', error)
      throw error
    }

    if (!groups) return []

    // For now, return groups with a default member count to avoid query issues
    // We can optimize this later with a more efficient query
    return groups.map((group: any) => ({
      ...group,
      memberCount: 1, // Default count, will be updated in future optimization
      isUserMember: false, // We don't know user membership status in this context
      userRole: undefined
    }))
  } catch (error) {
    console.error('Error in getPublicGroups:', error)
    throw error
  }
}

/**
 * Get a specific group by ID with member details
 */
export async function getGroupById(groupId: string, includeMembers = false): Promise<GroupWithMembers | null> {
  try {
    let query = supabase
      .from('groups')
      .select(`
        *,
        group_memberships(
          *,
          profiles(*)
        )
      `)
      .eq('id', groupId)
      .single()

    const { data: group, error } = await query

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('Error fetching group:', error)
      throw error
    }

    if (!group) return null

    return {
      ...group,
      members: group.group_memberships || [],
      memberCount: group.group_memberships?.length || 0
    }
  } catch (error) {
    console.error('Error in getGroupById:', error)
    throw error
  }
}

/**
 * Create a new group
 */
export async function createGroup(groupData: CreateGroupData, createdBy: string): Promise<Group> {
  try {
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: groupData.name,
        description: groupData.description,
        avatar_url: groupData.avatarUrl,
        is_private: groupData.isPrivate || false,
        max_members: groupData.maxMembers || 50,
        allow_member_invites: groupData.allowMemberInvites !== false,
        require_admin_approval: groupData.requireAdminApproval || false,
        primary_game: groupData.primaryGame,
        gaming_platform: groupData.gamingPlatform,
        skill_level: groupData.skillLevel,
        created_by: createdBy
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating group:', error)
      throw error
    }

    return group
  } catch (error) {
    console.error('Error in createGroup:', error)
    throw error
  }
}

/**
 * Update an existing group
 */
export async function updateGroup(groupData: UpdateGroupData): Promise<Group> {
  try {
    const { data: group, error } = await supabase
      .from('groups')
      .update({
        name: groupData.name,
        description: groupData.description,
        avatar_url: groupData.avatarUrl,
        is_private: groupData.isPrivate,
        max_members: groupData.maxMembers,
        allow_member_invites: groupData.allowMemberInvites,
        require_admin_approval: groupData.requireAdminApproval,
        primary_game: groupData.primaryGame,
        gaming_platform: groupData.gamingPlatform,
        skill_level: groupData.skillLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupData.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating group:', error)
      throw error
    }

    return group
  } catch (error) {
    console.error('Error in updateGroup:', error)
    throw error
  }
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      console.error('Error deleting group:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in deleteGroup:', error)
    throw error
  }
}

// =================================
// MEMBERSHIP MANAGEMENT
// =================================

/**
 * Get group memberships for a specific group
 */
export async function getGroupMemberships(groupId: string): Promise<(GroupMembership & { profile: any })[]> {
  try {
    const { data: memberships, error } = await supabase
      .from('group_memberships')
      .select(`
        *,
        profiles(*)
      `)
      .eq('group_id', groupId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching group memberships:', error)
      throw error
    }

    return memberships || []
  } catch (error) {
    console.error('Error in getGroupMemberships:', error)
    throw error
  }
}

/**
 * Add a user to a group
 */
export async function addGroupMember(
  groupId: string, 
  userId: string, 
  role: 'admin' | 'moderator' | 'member' = 'member',
  invitedBy?: string
): Promise<GroupMembership> {
  try {
    const { data: membership, error } = await supabase
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_id: userId,
        role,
        status: 'active',
        invited_by: invitedBy
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding group member:', error)
      throw error
    }

    return membership
  } catch (error) {
    console.error('Error in addGroupMember:', error)
    throw error
  }
}

/**
 * Update a group member's role or status
 */
export async function updateGroupMembership(
  groupId: string, 
  userId: string, 
  updates: { role?: string; status?: string }
): Promise<GroupMembership> {
  try {
    const { data: membership, error } = await supabase
      .from('group_memberships')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating group membership:', error)
      throw error
    }

    return membership
  } catch (error) {
    console.error('Error in updateGroupMembership:', error)
    throw error
  }
}

/**
 * Remove a user from a group
 */
export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing group member:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in removeGroupMember:', error)
    throw error
  }
}

/**
 * Check if user is a member of a group
 */
export async function isGroupMember(groupId: string, userId: string): Promise<{ isMember: boolean; role?: string }> {
  try {
    const { data: membership, error } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return { isMember: false } // Not found
      console.error('Error checking group membership:', error)
      throw error
    }

    return { isMember: true, role: membership.role }
  } catch (error) {
    console.error('Error in isGroupMember:', error)
    throw error
  }
}

// =================================
// INVITATION MANAGEMENT
// =================================

/**
 * Create a group invitation
 */
export async function createGroupInvitation(
  groupId: string,
  inviterId: string,
  inviteeId: string,
  message?: string
): Promise<GroupInvitation> {
  try {
    const { data: invitation, error } = await supabase
      .from('group_invitations')
      .insert({
        group_id: groupId,
        inviter_id: inviterId,
        invitee_id: inviteeId,
        message,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating group invitation:', error)
      throw error
    }

    return invitation
  } catch (error) {
    console.error('Error in createGroupInvitation:', error)
    throw error
  }
}

/**
 * Get invitations for a user
 */
export async function getUserInvitations(userId: string): Promise<GroupInvitationWithDetails[]> {
  try {
    const { data: invitations, error } = await supabase
      .from('group_invitations')
      .select(`
        *,
        groups(*),
        inviter:profiles!inviter_id(*),
        invitee:profiles!invitee_id(*)
      `)
      .eq('invitee_id', userId)
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user invitations:', error)
      throw error
    }

    return invitations || []
  } catch (error) {
    console.error('Error in getUserInvitations:', error)
    throw error
  }
}

/**
 * Accept a group invitation
 */
export async function acceptGroupInvitation(invitationId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('accept_group_invitation', { invitation_id: invitationId })

    if (error) {
      console.error('Error accepting group invitation:', error)
      throw error
    }

    return data || false
  } catch (error) {
    console.error('Error in acceptGroupInvitation:', error)
    throw error
  }
}

/**
 * Decline a group invitation
 */
export async function declineGroupInvitation(invitationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('group_invitations')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (error) {
      console.error('Error declining group invitation:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in declineGroupInvitation:', error)
    throw error
  }
}

// =================================
// UTILITY FUNCTIONS
// =================================

/**
 * Get group member count
 */
export async function getGroupMemberCount(groupId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'active')

    if (error) {
      console.error('Error getting group member count:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error in getGroupMemberCount:', error)
    throw error
  }
}

/**
 * Search groups by name or description
 */
export async function searchGroups(query: string): Promise<GroupWithMemberCount[]> {
  try {
    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_memberships(count)
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error searching groups:', error)
      throw error
    }

    return (groups || []).map(group => ({
      ...group,
      memberCount: group.group_memberships?.length || 0,
      isUserMember: false // Will be determined by client
    }))
  } catch (error) {
    console.error('Error in searchGroups:', error)
    throw error
  }
} 