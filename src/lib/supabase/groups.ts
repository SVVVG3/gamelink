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

    // Get member counts for all groups
    const groupIds = memberships.map((m: any) => m.groups.id)
    const memberCounts = await Promise.all(
      groupIds.map(async (groupId: string) => {
        const count = await getGroupMemberCount(groupId)
        return { groupId, count }
      })
    )

    const memberCountMap = new Map(memberCounts.map(({ groupId, count }) => [groupId, count]))

    return memberships.map((membership: any) => ({
      ...membership.groups,
      memberCount: memberCountMap.get(membership.groups.id) || 1,
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
export async function getPublicGroups(options?: { 
  limit?: number; 
  offset?: number; 
  userId?: string; 
}): Promise<GroupWithMemberCount[]> {
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

    let filteredGroups = groups

    // Filter out groups the user is already a member of or was removed from
    if (options?.userId) {
      // Get user's current memberships
      const { data: memberships } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', options.userId)
        .eq('status', 'active')

      const memberGroupIds = new Set(memberships?.map(m => m.group_id) || [])

      // Get groups the user was removed from
      const { data: removals } = await supabase
        .from('group_removals')
        .select('group_id')
        .eq('user_id', options.userId)

      const removedGroupIds = new Set(removals?.map(r => r.group_id) || [])

      // Filter out both member groups and removed groups
      filteredGroups = groups.filter(group => 
        !memberGroupIds.has(group.id) && !removedGroupIds.has(group.id)
      )
    }

    // Get member counts for filtered groups
    const memberCounts = await Promise.all(
      filteredGroups.map(async (group: any) => {
        const count = await getGroupMemberCount(group.id)
        return { groupId: group.id, count }
      })
    )

    const memberCountMap = new Map(memberCounts.map(({ groupId, count }) => [groupId, count]))

    return filteredGroups.map((group: any) => ({
      ...group,
      memberCount: memberCountMap.get(group.id) || 1,
      isUserMember: false,
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
    console.log('🔍 getGroupById: Starting query', { groupId, includeMembers })
    
    let query = supabase
      .from('groups')
      .select(`
        id,
        name,
        description,
        avatar_url,
        is_private,
        max_members,
        allow_member_invites,
        require_admin_approval,
        primary_game,
        gaming_platform,
        skill_level,
        created_by,
        created_at,
        updated_at,
        group_memberships!inner(
          id,
          group_id,
          user_id,
          role,
          status,
          invited_by,
          invite_message,
          joined_at,
          last_active_at,
          created_at,
          updated_at,
          profile:profiles!group_memberships_user_id_fkey(
            id,
            fid,
            username,
            display_name,
            bio,
            pfp_url,
            created_at,
            updated_at
          )
        )
      `)
      .eq('id', groupId)
      .eq('group_memberships.status', 'active')
      .single()

    const { data: group, error } = await query
    
    console.log('🔍 getGroupById: Query result', { 
      hasData: !!group, 
      error: error?.message,
      createdBy: group?.created_by,
      memberCount: group?.group_memberships?.length 
    })

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('🔍 getGroupById: Group not found')
        return null // Not found
      }
      console.error('🔍 getGroupById: Database error:', error)
      throw error
    }

    if (!group) {
      console.log('🔍 getGroupById: No group data returned')
      return null
    }

    // Transform the data to match our expected structure
    const members = (group.group_memberships || []).map((membership: any) => ({
      id: membership.id,
      groupId: membership.group_id,
      userId: membership.user_id,
      role: membership.role,
      status: membership.status,
      invitedBy: membership.invited_by,
      inviteMessage: membership.invite_message,
      joinedAt: membership.joined_at,
      lastActiveAt: membership.last_active_at,
      createdAt: membership.created_at,
      updatedAt: membership.updated_at,
      profile: membership.profile || {}
    }))

    const result = {
      id: group.id,
      name: group.name,
      description: group.description,
      avatarUrl: group.avatar_url,
      isPrivate: group.is_private,
      maxMembers: group.max_members,
      allowMemberInvites: group.allow_member_invites,
      requireAdminApproval: group.require_admin_approval,
      primaryGame: group.primary_game,
      gamingPlatform: group.gaming_platform,
      skillLevel: group.skill_level,
      createdBy: group.created_by,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      members,
      memberCount: members.length
    }
    
    console.log('🔍 getGroupById: Transformed result', { 
      id: result.id,
      name: result.name,
      createdBy: result.createdBy,
      memberCount: result.memberCount 
    })

    return result
  } catch (error) {
    console.error('🔍 getGroupById: Error in getGroupById:', error)
    throw error
  }
}

/**
 * Create a new group
 */
export async function createGroup(groupData: CreateGroupData, createdBy: string): Promise<Group> {
  try {
    // Validate field lengths to prevent constraint violations
    if (groupData.name && groupData.name.length > 100) {
      throw new Error('Group name must be 100 characters or less')
    }
    if (groupData.primaryGame && groupData.primaryGame.length > 100) {
      throw new Error('Primary game name must be 100 characters or less')
    }
    if (groupData.gamingPlatform && groupData.gamingPlatform.length > 50) {
      throw new Error('Gaming platform must be 50 characters or less')
    }
    if (groupData.skillLevel && groupData.skillLevel.length > 20) {
      throw new Error('Skill level must be 20 characters or less')
    }

    // Create the group
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: groupData.name?.trim(),
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
      
      // Handle specific constraint violations with user-friendly messages
      if (error.code === '23505') {
        if (error.message.includes('unique_group_name_per_creator')) {
          throw new Error('You already have a group with this name. Please choose a different name.')
        }
        if (error.message.includes('unique_user_per_group')) {
          throw new Error('You are already a member of this group.')
        }
        throw new Error('A group with these details already exists.')
      }
      
      // Handle other common errors
      if (error.code === '23514') {
        if (error.message.includes('groups_name_check')) {
          throw new Error('Group name cannot be empty.')
        }
        if (error.message.includes('groups_skill_level_check')) {
          throw new Error('Invalid skill level. Please select a valid option.')
        }
        if (error.message.includes('groups_max_members_check')) {
          throw new Error('Maximum members must be between 1 and 1000.')
        }
      }
      
      if (error.code === '23502') {
        throw new Error('Required fields are missing. Please fill in all required information.')
      }
      
      if (error.code === '23503') {
        throw new Error('Invalid user account. Please sign in again.')
      }
      
      // Generic fallback
      throw new Error('Failed to create group. Please try again.')
    }

    // Create the group chat (creator is automatically added as admin via database trigger)
    await getOrCreateGroupChat(group.id, createdBy)

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
        profiles!group_memberships_user_id_fkey(*)
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
    // Check if user was previously removed from this group
    const wasRemoved = await wasUserRemovedFromGroup(groupId, userId)
    
    // If user was removed and this is not an invitation, prevent joining
    if (wasRemoved && !invitedBy) {
      throw new Error('You cannot rejoin this group. Please contact an admin for an invitation.')
    }
    
    // If user was removed but is being invited back, clear the removal record
    if (wasRemoved && invitedBy) {
      await clearGroupRemoval(groupId, userId)
    }

    // Check if user is already a member
    const { data: existingMembership, error: checkError } = await supabase
      .from('group_memberships')
      .select('id, role, status')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        // User is already an active member, just return the existing membership
        return existingMembership as GroupMembership
      } else {
        // User exists but is inactive, update their status
        const { data: updatedMembership, error: updateError } = await supabase
          .from('group_memberships')
          .update({ 
            status: 'active', 
            role,
            updated_at: new Date().toISOString() 
          })
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating existing membership:', updateError)
          throw updateError
        }
        return updatedMembership
      }
    }

    // Add user to group
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

    // Get user's FID for chat participation
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fid')
      .eq('id', userId)
      .single()

    if (profile?.fid) {
      // Add user to group chat (if it exists)
      try {
        await addMemberToGroupChat(groupId, userId, profile.fid)
      } catch (chatError) {
        console.warn('Failed to add member to group chat:', chatError)
        // Don't fail the entire operation if chat addition fails
      }
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
 * Remove a user from a group and track the removal
 */
export async function removeGroupMember(groupId: string, userId: string, removedBy?: string): Promise<void> {
  try {
    // Remove user from group
    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing group member:', error)
      throw error
    }

    // Clean up old invitation records to prevent unique constraint issues when re-inviting
    // We keep declined invitations for audit purposes, but remove accepted ones since they're no longer relevant
    const { error: inviteCleanupError } = await supabase
      .from('group_invitations')
      .delete()
      .eq('group_id', groupId)
      .eq('invitee_id', userId)
      .eq('status', 'accepted')

    if (inviteCleanupError) {
      console.warn('Failed to clean up old invitation records:', inviteCleanupError)
      // Don't fail the entire operation if invitation cleanup fails
    } else {
      console.log('✅ Cleaned up old accepted invitation records for removed user')
    }

    // Track the removal to prevent rejoining without invitation
    const { error: trackError } = await supabase
      .from('group_removals')
      .insert({
        group_id: groupId,
        user_id: userId,
        removed_by: removedBy,
        removed_at: new Date().toISOString()
      })

    if (trackError) {
      console.warn('Failed to track group removal:', trackError)
      // Don't fail the entire operation if tracking fails
    }

    // Remove user from group chat
    try {
      await removeMemberFromGroupChat(groupId, userId)
    } catch (chatError) {
      console.warn('Failed to remove member from group chat:', chatError)
      // Don't fail the entire operation if chat removal fails
    }

    console.log('✅ Successfully removed group member and cleaned up related records')
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

/**
 * Check if a user was previously removed from a group
 */
export async function wasUserRemovedFromGroup(groupId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('group_removals')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return false // Not found
      console.error('Error checking group removal:', error)
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error in wasUserRemovedFromGroup:', error)
    throw error
  }
}

/**
 * Clear a user's removal record (used when they're invited back)
 */
export async function clearGroupRemoval(groupId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('group_removals')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error clearing group removal:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in clearGroupRemoval:', error)
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
    // First check if there's already a pending invitation
    const { data: existingInvitation, error: checkError } = await supabase
      .from('group_invitations')
      .select('id, status, expires_at')
      .eq('group_id', groupId)
      .eq('invitee_id', inviteeId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvitation) {
      throw new Error('User already has a pending invitation to this group')
    }

    // Check if user is already a member
    const { data: membership, error: memberError } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', inviteeId)
      .eq('status', 'active')
      .single()

    if (membership) {
      throw new Error('User is already a member of this group')
    }

    // Note: We don't check for removal records here because admins should be able to invite removed users back

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
      
      // Provide more specific error messages
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('User already has a pending invitation to this group')
      } else if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid group or user ID')
      } else {
        throw new Error(`Failed to create invitation: ${error.message}`)
      }
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
      .gt('expires_at', new Date().toISOString())
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
    console.log('🔍 acceptGroupInvitation: Starting', { invitationId })
    
    // Get invitation details first
    const { data: invitation, error: inviteError } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invitation) {
      console.error('🔍 acceptGroupInvitation: Error fetching invitation:', inviteError)
      return false
    }

    console.log('🔍 acceptGroupInvitation: Invitation found', { 
      groupId: invitation.group_id, 
      inviteeId: invitation.invitee_id 
    })

    // Check if user is already a member
    const { data: existingMembership, error: memberError } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', invitation.group_id)
      .eq('user_id', invitation.invitee_id)
      .eq('status', 'active')
      .single()

    if (existingMembership) {
      console.log('🔍 acceptGroupInvitation: User is already a member of this group')
      return false
    }

    // Clean up any old accepted invitations to prevent unique constraint violations
    // This handles cases where users were removed after previously accepting invitations
    const { error: cleanupError } = await supabase
      .from('group_invitations')
      .delete()
      .eq('group_id', invitation.group_id)
      .eq('invitee_id', invitation.invitee_id)
      .eq('status', 'accepted')

    if (cleanupError) {
      console.warn('🔍 acceptGroupInvitation: Failed to clean up old accepted invitations:', cleanupError)
      // Continue anyway - the constraint error will be more informative
    } else {
      console.log('🔍 acceptGroupInvitation: Cleaned up old accepted invitations')
    }

    // Start transaction-like operations
    // 1. Update invitation status
    const { error: updateError } = await supabase
      .from('group_invitations')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('🔍 acceptGroupInvitation: Error updating invitation:', updateError)
      
      // Provide more helpful error message for unique constraint violations
      if (updateError.code === '23505') {
        throw new Error('Unable to accept invitation due to existing records. Please try again or contact support.')
      }
      
      throw updateError
    }

    console.log('🔍 acceptGroupInvitation: Invitation status updated')

    // 2. Add group membership using addGroupMember to handle removal checks
    try {
      await addGroupMember(
        invitation.group_id,
        invitation.invitee_id,
        'member',
        invitation.inviter_id
      )
      console.log('🔍 acceptGroupInvitation: Membership created via addGroupMember')
    } catch (membershipError) {
      console.error('🔍 acceptGroupInvitation: Error creating membership:', membershipError)
      // Try to rollback invitation status
      await supabase
        .from('group_invitations')
        .update({
          status: 'pending',
          responded_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
      
      throw membershipError
    }

    // 3. Get user's FID for chat participation
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fid')
      .eq('id', invitation.invitee_id)
      .single()

    if (profileError || !profile?.fid) {
      console.error('🔍 acceptGroupInvitation: Error getting user FID:', profileError)
      // Don't fail the whole operation, just log the error
      console.warn('🔍 acceptGroupInvitation: Could not add user to group chat - missing FID')
    } else {
      // 4. Add user to group chat
      try {
        console.log('🔍 acceptGroupInvitation: Adding user to group chat', { 
          groupId: invitation.group_id, 
          userId: invitation.invitee_id, 
          fid: profile.fid 
        })
        
        await addMemberToGroupChat(invitation.group_id, invitation.invitee_id, profile.fid)
        console.log('🔍 acceptGroupInvitation: User added to group chat successfully')
      } catch (chatError) {
        console.error('🔍 acceptGroupInvitation: Error adding user to group chat:', chatError)
        // Don't fail the whole operation, just log the error
        console.warn('🔍 acceptGroupInvitation: User joined group but could not be added to chat')
      }
    }

    console.log('🔍 acceptGroupInvitation: Successfully completed')
    return true
  } catch (error) {
    console.error('🔍 acceptGroupInvitation: Error in acceptGroupInvitation:', error)
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

// =================================
// GROUP CHAT INTEGRATION
// =================================

/**
 * Get or create a chat for a group
 */
export async function getOrCreateGroupChat(groupId: string, createdBy: string): Promise<string> {
  try {
    // First, check if a chat already exists for this group
    const { data: existingChat, error: findError } = await supabase
      .from('chats')
      .select('id')
      .eq('group_id', groupId)
      .eq('type', 'group')
      .single()

    if (existingChat) {
      return existingChat.id
    }

    // If no chat exists, create one
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      throw new Error('Group not found')
    }

    // Create the group chat
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert({
        name: group.name,
        type: 'group',
        group_id: groupId,
        created_by: createdBy,
        is_active: true
      })
      .select('id')
      .single()

    if (createError || !newChat) {
      console.error('Error creating group chat:', createError)
      throw createError || new Error('Failed to create group chat')
    }

    // Add all group members as chat participants
    await addGroupMembersToChat(newChat.id, groupId)

    return newChat.id
  } catch (error) {
    console.error('Error in getOrCreateGroupChat:', error)
    throw error
  }
}

/**
 * Add all group members to the group chat
 */
async function addGroupMembersToChat(chatId: string, groupId: string): Promise<void> {
  try {
    // Get all active group members
    const { data: members, error: membersError } = await supabase
      .from('group_memberships')
      .select(`
        user_id,
        profiles!group_memberships_user_id_fkey(fid)
      `)
      .eq('group_id', groupId)
      .eq('status', 'active')

    if (membersError || !members) {
      console.error('Error fetching group members:', membersError)
      return
    }

    // Prepare chat participants data
    const participants = members
      .filter(member => member.profiles && (member.profiles as any).fid)
      .map(member => ({
        chat_id: chatId,
        user_id: member.user_id,
        fid: (member.profiles as any).fid,
        joined_at: new Date().toISOString(),
        is_admin: false // Group admins can be handled separately if needed
      }))

    if (participants.length === 0) {
      console.warn('No valid participants found for group chat')
      return
    }

    // Insert all participants (ignore duplicates)
    const { error: participantsError } = await supabase
      .from('chat_participants')
      .upsert(participants, { 
        onConflict: 'chat_id,user_id',
        ignoreDuplicates: true 
      })

    if (participantsError) {
      console.error('Error adding participants to group chat:', participantsError)
      throw participantsError
    }
  } catch (error) {
    console.error('Error in addGroupMembersToChat:', error)
    throw error
  }
}

/**
 * Add a new group member to the existing group chat
 */
export async function addMemberToGroupChat(groupId: string, userId: string, fid: number): Promise<void> {
  try {
    // Get the group's chat ID
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('group_id', groupId)
      .eq('type', 'group')
      .single()

    if (chatError || !chat) {
      console.error('Group chat not found:', chatError)
      return
    }

    // Check if user already exists in chat_participants (including those who left)
    const { data: existingParticipant, error: checkError } = await supabase
      .from('chat_participants')
      .select('id, left_at')
      .eq('chat_id', chat.id)
      .eq('user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing chat participant:', checkError)
      throw checkError
    }

    if (existingParticipant) {
      // User exists - update their record to rejoin (clear left_at)
      const { error: updateError } = await supabase
        .from('chat_participants')
        .update({
          left_at: null,
          joined_at: new Date().toISOString() // Update joined_at to current time
        })
        .eq('id', existingParticipant.id)

      if (updateError) {
        console.error('Error updating chat participant:', updateError)
        throw updateError
      }

      console.log('✅ Re-added existing user to group chat:', { userId, fid, chatId: chat.id })
    } else {
      // User doesn't exist - create new participant record
      const { error: insertError } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: chat.id,
          user_id: userId,
          fid: fid,
          joined_at: new Date().toISOString(),
          is_admin: false
        })

      if (insertError) {
        console.error('Error adding new chat participant:', insertError)
        throw insertError
      }

      console.log('✅ Added new user to group chat:', { userId, fid, chatId: chat.id })
    }
  } catch (error) {
    console.error('Error in addMemberToGroupChat:', error)
    throw error
  }
}

/**
 * Remove a member from the group chat
 */
export async function removeMemberFromGroupChat(groupId: string, userId: string): Promise<void> {
  try {
    // Get the group's chat ID
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('group_id', groupId)
      .eq('type', 'group')
      .single()

    if (chatError || !chat) {
      console.error('Group chat not found:', chatError)
      return
    }

    // Remove the user from the chat by setting left_at timestamp
    const { error: participantError } = await supabase
      .from('chat_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('chat_id', chat.id)
      .eq('user_id', userId)

    if (participantError) {
      console.error('Error removing member from group chat:', participantError)
      throw participantError
    }
  } catch (error) {
    console.error('Error in removeMemberFromGroupChat:', error)
    throw error
  }
}

/**
 * Check if a group name already exists for a user
 */
export async function checkGroupNameExists(name: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('id')
      .eq('name', name.trim())
      .eq('created_by', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected when name doesn't exist
      console.error('Error checking group name:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error in checkGroupNameExists:', error)
    return false
  }
}

/**
 * Get profile IDs from FIDs
 */
export async function getProfileIdsByFids(fids: number[]): Promise<Map<number, string>> {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, fid')
      .in('fid', fids)

    if (error) {
      console.error('Error fetching profile IDs by FIDs:', error)
      throw error
    }

    const fidToIdMap = new Map<number, string>()
    profiles?.forEach(profile => {
      if (profile.fid) {
        fidToIdMap.set(profile.fid, profile.id)
      }
    })

    return fidToIdMap
  } catch (error) {
    console.error('Error in getProfileIdsByFids:', error)
    throw error
  }
}

/**
 * Migration function: Add existing group members to group chats
 * This fixes the issue where users who accepted invitations before the chat fix
 * are group members but not chat participants
 */
export async function migrateGroupMembersToChats(groupId: string): Promise<void> {
  try {
    console.log('🔧 migrateGroupMembersToChats: Starting migration for group', groupId)
    
    // Get all active group members
    const { data: members, error: membersError } = await supabase
      .from('group_memberships')
      .select(`
        user_id,
        profiles!group_memberships_user_id_fkey(fid)
      `)
      .eq('group_id', groupId)
      .eq('status', 'active')

    if (membersError) {
      console.error('🔧 migrateGroupMembersToChats: Error fetching members:', membersError)
      throw membersError
    }

    if (!members || members.length === 0) {
      console.log('🔧 migrateGroupMembersToChats: No members found')
      return
    }

    console.log('🔧 migrateGroupMembersToChats: Found', members.length, 'members')

    // Get or create group chat
    const groupChatId = await getOrCreateGroupChat(groupId, members[0].user_id)
    console.log('🔧 migrateGroupMembersToChats: Group chat ID:', groupChatId)

    // Add each member to the chat if they're not already a participant
    for (const member of members) {
      const profile = member.profiles as any // Type assertion to handle Supabase join
      if (!profile?.fid) {
        console.warn('🔧 migrateGroupMembersToChats: Member has no FID:', member.user_id)
        continue
      }

      try {
        // Check if user is already a chat participant
        const { data: existingParticipant, error: checkError } = await supabase
          .from('chat_participants')
          .select('id')
          .eq('chat_id', groupChatId)
          .eq('fid', profile.fid)
          .is('left_at', null)
          .single()

        if (existingParticipant) {
          console.log('🔧 migrateGroupMembersToChats: User already in chat:', profile.fid)
          continue
        }

        // Add user to chat
        const { error: addError } = await supabase
          .from('chat_participants')
          .insert({
            chat_id: groupChatId,
            fid: profile.fid,
            joined_at: new Date().toISOString()
          })

        if (addError) {
          console.error('🔧 migrateGroupMembersToChats: Error adding user to chat:', addError)
        } else {
          console.log('🔧 migrateGroupMembersToChats: Added user to chat:', profile.fid)
        }
      } catch (error) {
        console.error('🔧 migrateGroupMembersToChats: Error processing member:', error)
      }
    }

    console.log('🔧 migrateGroupMembersToChats: Migration completed for group', groupId)
  } catch (error) {
    console.error('🔧 migrateGroupMembersToChats: Migration failed:', error)
    throw error
  }
}

/**
 * Test function to verify the remove/invite back flow works correctly
 * This function simulates the complete flow of removing a user and inviting them back
 */
export async function testRemoveAndInviteBackFlow(
  groupId: string, 
  userId: string, 
  adminId: string
): Promise<{ success: boolean; steps: string[] }> {
  const steps: string[] = []
  
  try {
    steps.push('🧪 Starting remove/invite back flow test')
    
    // Step 1: Remove user from group
    steps.push('1️⃣ Removing user from group...')
    await removeGroupMember(groupId, userId, adminId)
    steps.push('✅ User removed from group')
    
    // Step 2: Verify removal was tracked
    steps.push('2️⃣ Checking removal was tracked...')
    const wasRemoved = await wasUserRemovedFromGroup(groupId, userId)
    if (!wasRemoved) {
      throw new Error('Removal was not tracked properly')
    }
    steps.push('✅ Removal tracked correctly')
    
    // Step 3: Create invitation
    steps.push('3️⃣ Creating invitation...')
    const invitation = await createGroupInvitation(groupId, adminId, userId, 'Test invitation')
    steps.push('✅ Invitation created')
    
    // Step 4: Accept invitation
    steps.push('4️⃣ Accepting invitation...')
    const accepted = await acceptGroupInvitation(invitation.id)
    if (!accepted) {
      throw new Error('Invitation acceptance failed')
    }
    steps.push('✅ Invitation accepted')
    
    // Step 5: Verify user is back in group
    steps.push('5️⃣ Verifying group membership...')
    const membership = await isGroupMember(groupId, userId)
    if (!membership.isMember) {
      throw new Error('User is not a group member after accepting invitation')
    }
    steps.push('✅ User is back in group')
    
    // Step 6: Verify removal record was cleared
    steps.push('6️⃣ Verifying removal record was cleared...')
    const stillRemoved = await wasUserRemovedFromGroup(groupId, userId)
    if (stillRemoved) {
      throw new Error('Removal record was not cleared')
    }
    steps.push('✅ Removal record cleared')
    
    // Step 7: Verify user can access chat
    steps.push('7️⃣ Verifying chat access...')
    const { data: profile } = await supabase
      .from('profiles')
      .select('fid')
      .eq('id', userId)
      .single()
    
    if (profile?.fid) {
      const { data: chatParticipant } = await supabase
        .from('chat_participants')
        .select('id, left_at')
        .eq('chat_id', (await getOrCreateGroupChat(groupId, adminId)))
        .eq('user_id', userId)
        .single()
      
      if (!chatParticipant || chatParticipant.left_at) {
        throw new Error('User is not an active chat participant')
      }
      steps.push('✅ User can access chat')
    } else {
      steps.push('⚠️ Could not verify chat access (no FID)')
    }
    
    steps.push('🎉 All tests passed! Remove/invite back flow works correctly')
    return { success: true, steps }
    
  } catch (error) {
    steps.push(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { success: false, steps }
  }
} 