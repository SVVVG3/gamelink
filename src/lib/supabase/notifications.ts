import { createClient } from '@supabase/supabase-js'
import type { NotificationToken, NotificationPreferences } from '../notifications'

// Initialize Supabase client with service role key for admin operations
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Supabase environment variables are required')
  }
  
  return createClient(url, key)
}

/**
 * Store or update notification token for a user
 */
export async function storeNotificationToken(
  userFid: number,
  token: string
): Promise<{ success: boolean; tokenId?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('store_notification_token', {
        p_user_fid: userFid,
        p_token: token
      })

    if (error) {
      console.error('Error storing notification token:', error)
      return { success: false, error: error.message }
    }

    console.log(`✅ Stored notification token for FID ${userFid}`)
    return { success: true, tokenId: data }
  } catch (error: any) {
    console.error('Error storing notification token:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Disable notification token
 */
export async function disableNotificationToken(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('disable_notification_token', {
        p_token: token
      })

    if (error) {
      console.error('Error disabling notification token:', error)
      return { success: false, error: error.message }
    }

    console.log(`✅ Disabled notification token: ${token.substring(0, 10)}...`)
    return { success: true }
  } catch (error: any) {
    console.error('Error disabling notification token:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all enabled notification tokens for a user
 */
export async function getUserNotificationTokens(
  userFid: number
): Promise<string[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('get_user_notification_tokens', {
        p_user_fid: userFid
      })

    if (error) {
      console.error('Error getting user notification tokens:', error)
      return []
    }

    return data?.map((row: any) => row.token) || []
  } catch (error) {
    console.error('Error getting user notification tokens:', error)
    return []
  }
}

/**
 * Create default notification preferences for a user
 */
export async function createDefaultNotificationPreferences(
  userFid: number
): Promise<{ success: boolean; preferenceId?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('create_default_notification_preferences', {
        p_user_fid: userFid
      })

    if (error) {
      console.error('Error creating default notification preferences:', error)
      return { success: false, error: error.message }
    }

    console.log(`✅ Created default notification preferences for FID ${userFid}`)
    return { success: true, preferenceId: data }
  } catch (error: any) {
    console.error('Error creating default notification preferences:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  userFid: number,
  preferences: {
    messagesEnabled?: boolean
    groupInvitesEnabled?: boolean
    eventsEnabled?: boolean
    groupsEnabled?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('update_notification_preferences', {
        p_user_fid: userFid,
        p_messages_enabled: preferences.messagesEnabled,
        p_group_invites_enabled: preferences.groupInvitesEnabled,
        p_events_enabled: preferences.eventsEnabled,
        p_groups_enabled: preferences.groupsEnabled
      })

    if (error) {
      console.error('Error updating notification preferences:', error)
      return { success: false, error: error.message }
    }

    console.log(`✅ Updated notification preferences for FID ${userFid}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error updating notification preferences:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(
  userFid: number
): Promise<NotificationPreferences | null> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_fid', userFid)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error getting notification preferences:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting notification preferences:', error)
    return null
  }
}

/**
 * Check if notification type is enabled for a user
 */
export async function isNotificationEnabled(
  userFid: number,
  notificationType: 'messages' | 'group_invites' | 'events' | 'groups'
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('is_notification_enabled', {
        p_user_fid: userFid,
        p_notification_type: notificationType
      })

    if (error) {
      console.error('Error checking notification enabled:', error)
      return true // Default to enabled on error
    }

    return data || true
  } catch (error) {
    console.error('Error checking notification enabled:', error)
    return true // Default to enabled on error
  }
}

/**
 * Filter user FIDs by notification preferences
 */
export async function filterUsersByNotificationPreferences(
  userFids: number[],
  notificationType: 'messages' | 'group_invites' | 'events' | 'groups'
): Promise<number[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('get_users_with_notifications_enabled', {
        p_user_fids: userFids,
        p_notification_type: notificationType
      })

    if (error) {
      console.error('Error filtering users by notification preferences:', error)
      return userFids // Return all users on error (fail open)
    }

    return data || userFids
  } catch (error) {
    console.error('Error filtering users by notification preferences:', error)
    return userFids // Return all users on error (fail open)
  }
}

/**
 * Get all notification tokens for multiple users (for bulk notifications)
 */
export async function getNotificationTokensForUsers(
  userFids: number[]
): Promise<{ userFid: number; tokens: string[] }[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('notification_tokens')
      .select('user_fid, token')
      .in('user_fid', userFids)
      .eq('enabled', true)

    if (error) {
      console.error('Error getting notification tokens for users:', error)
      return []
    }

    // Group tokens by user FID
    const tokensByUser: { [key: number]: string[] } = {}
    
    data?.forEach((row: any) => {
      if (!tokensByUser[row.user_fid]) {
        tokensByUser[row.user_fid] = []
      }
      tokensByUser[row.user_fid].push(row.token)
    })

    return Object.entries(tokensByUser).map(([userFid, tokens]) => ({
      userFid: parseInt(userFid),
      tokens
    }))
  } catch (error) {
    console.error('Error getting notification tokens for users:', error)
    return []
  }
}

/**
 * Clean up expired or invalid notification tokens
 */
export async function cleanupNotificationTokens(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // Delete tokens older than 30 days that are disabled
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { error, count } = await supabase
      .from('notification_tokens')
      .delete({ count: 'exact' })
      .eq('enabled', false)
      .lt('updated_at', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('Error cleaning up notification tokens:', error)
      return { success: false, error: error.message }
    }

    const deletedCount = count || 0
    console.log(`✅ Cleaned up ${deletedCount} expired notification tokens`)
    
    return { success: true, deletedCount }
  } catch (error: any) {
    console.error('Error cleaning up notification tokens:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<{
  totalTokens: number
  enabledTokens: number
  totalUsers: number
  usersWithPreferences: number
}> {
  try {
    const supabase = getSupabaseClient()
    
    const [tokensResult, preferencesResult] = await Promise.all([
      supabase
        .from('notification_tokens')
        .select('enabled', { count: 'exact' }),
      supabase
        .from('notification_preferences')
        .select('user_fid', { count: 'exact' })
    ])

    const totalTokens = tokensResult.count || 0
    const enabledTokens = tokensResult.data?.filter(t => t.enabled).length || 0
    const usersWithPreferences = preferencesResult.count || 0

    // Get unique users with tokens
    const uniqueUsersResult = await supabase
      .from('notification_tokens')
      .select('user_fid')
      .eq('enabled', true)

    const uniqueUsers = new Set(uniqueUsersResult.data?.map(t => t.user_fid) || [])
    const totalUsers = uniqueUsers.size

    return {
      totalTokens,
      enabledTokens,
      totalUsers,
      usersWithPreferences
    }
  } catch (error) {
    console.error('Error getting notification stats:', error)
    return {
      totalTokens: 0,
      enabledTokens: 0,
      totalUsers: 0,
      usersWithPreferences: 0
    }
  }
} 