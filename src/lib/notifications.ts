import { NeynarAPIClient } from '@neynar/nodejs-sdk'
import { createClient } from '@supabase/supabase-js'

// Types for notification system
export interface NotificationToken {
  id: string
  user_fid: number
  token: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  id: string
  user_fid: number
  messages_enabled: boolean
  group_invites_enabled: boolean
  events_enabled: boolean
  groups_enabled: boolean
  created_at: string
  updated_at: string
}

export interface NotificationPayload {
  title: string
  body: string
  target_url: string
  icon_url?: string
}

export interface NotificationFilters {
  following_fid?: number
  minimum_user_score?: number
}

// Initialize clients
let neynarClient: NeynarAPIClient | null = null
let supabaseClient: any = null

function getNeynarClient(): NeynarAPIClient {
  if (!neynarClient) {
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      throw new Error('NEYNAR_API_KEY environment variable is required')
    }
    neynarClient = new NeynarAPIClient({ apiKey })
  }
  return neynarClient
}

function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Supabase environment variables are required')
    }
    supabaseClient = createClient(url, key)
  }
  return supabaseClient
}

/**
 * Send notification to specific users by FID
 */
export async function sendNotificationToUsers(
  targetFids: number[],
  notification: NotificationPayload,
  filters?: NotificationFilters
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getNeynarClient()
    
    console.log(`📱 Sending notification to ${targetFids.length} users:`, {
      title: notification.title,
      targetFids: targetFids.slice(0, 5), // Log first 5 FIDs
      hasFilters: !!filters
    })

    const response = await client.publishFrameNotifications({
      targetFids,
      notification: {
        title: notification.title,
        body: notification.body,
        target_url: notification.target_url,
        ...(notification.icon_url && { icon_url: notification.icon_url })
      },
      ...(filters && { filters })
    })

    console.log('✅ Notification sent successfully:', response)
    return { success: true }
  } catch (error: any) {
    console.error('❌ Error sending notification:', error)
    return { 
      success: false, 
      error: error?.message || 'Failed to send notification' 
    }
  }
}

/**
 * Send notification to all users with notifications enabled (with optional filters)
 */
export async function sendNotificationToAll(
  notification: NotificationPayload,
  filters?: NotificationFilters
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getNeynarClient()
    
    console.log('📱 Sending notification to all users with filters:', {
      title: notification.title,
      filters
    })

    const response = await client.publishFrameNotifications({
      targetFids: [], // Empty array means all users with notifications enabled
      notification: {
        title: notification.title,
        body: notification.body,
        target_url: notification.target_url,
        ...(notification.icon_url && { icon_url: notification.icon_url })
      },
      ...(filters && { filters })
    })

    console.log('✅ Notification sent to all users successfully:', response)
    return { success: true }
  } catch (error: any) {
    console.error('❌ Error sending notification to all users:', error)
    return { 
      success: false, 
      error: error?.message || 'Failed to send notification' 
    }
  }
}

/**
 * Get notification preferences for a user
 */
export async function getUserNotificationPreferences(userFid: number): Promise<NotificationPreferences | null> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_fid', userFid)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching notification preferences:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting user notification preferences:', error)
    return null
  }
}

/**
 * Create default notification preferences for a user
 */
export async function createDefaultNotificationPreferences(userFid: number): Promise<NotificationPreferences | null> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .insert({
        user_fid: userFid,
        messages_enabled: true,
        group_invites_enabled: true,
        events_enabled: true,
        groups_enabled: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification preferences:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating default notification preferences:', error)
    return null
  }
}

/**
 * Get or create notification preferences for a user
 */
export async function getOrCreateNotificationPreferences(userFid: number): Promise<NotificationPreferences | null> {
  let preferences = await getUserNotificationPreferences(userFid)
  
  if (!preferences) {
    preferences = await createDefaultNotificationPreferences(userFid)
  }
  
  return preferences
}

/**
 * Check if user has notifications enabled for a specific type
 */
export async function isNotificationEnabled(
  userFid: number, 
  notificationType: 'messages' | 'group_invites' | 'events' | 'groups'
): Promise<boolean> {
  const preferences = await getUserNotificationPreferences(userFid)
  
  if (!preferences) {
    // Default to enabled if no preferences found
    return true
  }

  switch (notificationType) {
    case 'messages':
      return preferences.messages_enabled
    case 'group_invites':
      return preferences.group_invites_enabled
    case 'events':
      return preferences.events_enabled
    case 'groups':
      return preferences.groups_enabled
    default:
      return false
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
    
    const columnName = `${notificationType}_enabled`
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('user_fid')
      .in('user_fid', userFids)
      .eq(columnName, true)

    if (error) {
      console.error('Error filtering users by notification preferences:', error)
      // Return all users if there's an error (fail open)
      return userFids
    }

    const enabledFids = data.map((row: any) => row.user_fid)
    
    // Include users who don't have preferences set (default to enabled)
    const usersWithPreferences = data.map((row: any) => row.user_fid)
    const usersWithoutPreferences = userFids.filter(fid => !usersWithPreferences.includes(fid))
    
    return [...enabledFids, ...usersWithoutPreferences]
  } catch (error) {
    console.error('Error filtering users by notification preferences:', error)
    // Return all users if there's an error (fail open)
    return userFids
  }
}

/**
 * Get the app domain for deep links
 */
export function getAppDomain(): string {
  return process.env.MINI_APP_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://farcaster-gamelink.vercel.app'
}

/**
 * Create deep link URL for the app
 */
export function createDeepLink(path: string): string {
  const domain = getAppDomain()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${domain}${cleanPath}`
}

/**
 * Utility function to create notification payload with app branding
 */
export function createNotificationPayload(
  title: string,
  body: string,
  targetPath: string
): NotificationPayload {
  return {
    title: `🎮 ${title}`,
    body,
    target_url: createDeepLink(targetPath),
    icon_url: `${getAppDomain()}/gamelinkSplashImage.png`
  }
}

/**
 * Send notification for new message
 */
export async function sendMessageNotification(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // Get message details with chat and sender information
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_fid,
        chat_id,
        created_at,
        chats (
          id,
          type,
          name,
          group_id,
          groups (
            name
          )
        ),
        profiles!messages_sender_id_fkey (
          fid,
          username,
          display_name
        )
      `)
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      console.error('Error fetching message for notification:', messageError)
      return { success: false, error: 'Message not found' }
    }

    // Get chat participants (exclude sender)
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('fid')
      .eq('chat_id', message.chat_id)
      .neq('fid', message.sender_fid)

    if (participantsError) {
      console.error('Error fetching chat participants:', participantsError)
      return { success: false, error: 'Failed to get chat participants' }
    }

    if (!participants || participants.length === 0) {
      console.log('No participants to notify for message')
      return { success: true }
    }

    const recipientFids = participants.map((p: { fid: number }) => p.fid)
    
    // Filter by notification preferences
    const enabledFids = await filterUsersByNotificationPreferences(recipientFids, 'messages')
    
    if (enabledFids.length === 0) {
      console.log('No users have message notifications enabled')
      return { success: true }
    }

    // Create notification content
    const senderName = message.profiles?.display_name || message.profiles?.username || `User ${message.sender_fid}`
    const chatName = message.chats?.name || message.chats?.groups?.name || 'Chat'
    
    const notification = createNotificationPayload(
      'New Message',
      `${senderName} in ${chatName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
      `/messages/${message.chat_id}`
    )

    // Send notification
    const result = await sendNotificationToUsers(enabledFids, notification)
    
    if (result.success) {
      console.log(`✅ Sent message notification to ${enabledFids.length} users`)
    } else {
      console.error('❌ Failed to send message notification:', result.error)
    }

    return result
  } catch (error: any) {
    console.error('Error sending message notification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send notification for group invitation
 */
export async function sendGroupInvitationNotification(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // Get invitation details with group and inviter information
    const { data: invitation, error: invitationError } = await supabase
      .from('group_invitations')
      .select(`
        id,
        group_id,
        invitee_id,
        inviter_id,
        created_at,
        groups (
          name,
          description
        ),
        inviter:profiles!group_invitations_inviter_id_fkey (
          fid,
          username,
          display_name
        ),
        invitee:profiles!group_invitations_invitee_id_fkey (
          fid,
          username,
          display_name
        )
      `)
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      console.error('Error fetching invitation for notification:', invitationError)
      return { success: false, error: 'Invitation not found' }
    }

    // Check if user has group invitation notifications enabled
    const isEnabled = await isNotificationEnabled(invitation.invitee.fid, 'group_invites')
    
    if (!isEnabled) {
      console.log(`User ${invitation.invitee.fid} has group invitation notifications disabled`)
      return { success: true }
    }

    // Create notification content
    const inviterName = invitation.inviter?.display_name || invitation.inviter?.username || `User ${invitation.inviter?.fid}`
    const groupName = invitation.groups?.name || 'Gaming Group'
    
    const notification = createNotificationPayload(
      'Group Invitation',
      `${inviterName} invited you to join ${groupName}`,
      `/groups?tab=invitations`
    )

    // Send notification to invited user
    const result = await sendNotificationToUsers([invitation.invitee.fid], notification)
    
    if (result.success) {
      console.log(`✅ Sent group invitation notification to FID ${invitation.invitee.fid}`)
    } else {
      console.error('❌ Failed to send group invitation notification:', result.error)
    }

    return result
  } catch (error: any) {
    console.error('Error sending group invitation notification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send notification when someone creates an event (to mutual followers)
 */
export async function sendEventCreationNotification(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // Get event details with creator information
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        game,
        created_by,
        created_at,
        organizer:profiles!events_created_by_fkey (
          fid,
          username,
          display_name
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      console.error('Error fetching event for notification:', eventError)
      return { success: false, error: 'Event not found' }
    }

    // Create notification content
    const creatorName = event.organizer?.display_name || event.organizer?.username || `User ${event.organizer?.fid}`
    
    const notification = createNotificationPayload(
      'New Gaming Event!',
      `${creatorName} just created: ${event.title}${event.game ? ` (${event.game})` : ''}`,
      `/events/${event.id}`
    )

    // Send to mutual followers using Neynar filtering
    const result = await sendNotificationToAll(notification, {
      following_fid: event.organizer?.fid, // Only mutual followers
      minimum_user_score: 0.1 // Active users only
    })
    
    if (result.success) {
      console.log(`✅ Sent event creation notification to mutuals of FID ${event.organizer?.fid}`)
    } else {
      console.error('❌ Failed to send event creation notification:', result.error)
    }

    return result
  } catch (error: any) {
    console.error('Error sending event creation notification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send 24-hour reminder notification to event participants
 */
export async function sendEventReminderNotification(
  eventId: string,
  reminderType: '24h' | '1h' | 'starting'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // Get event details with participants
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        game,
        start_time,
        end_time,
        status,
        created_by,
        organizer:profiles!events_created_by_fkey (
          fid,
          username,
          display_name
        ),
        event_participants (
          user_id,
          status,
          participant:profiles!event_participants_user_id_fkey (
            fid,
            username,
            display_name
          )
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      console.error('Error fetching event for reminder notification:', eventError)
      return { success: false, error: 'Event not found' }
    }

    // Only send reminders for upcoming or live events
    if (!['upcoming', 'live'].includes(event.status)) {
      console.log(`Event ${eventId} status is ${event.status}, skipping reminder`)
      return { success: true }
    }

    // Get participants who should receive reminders (registered, confirmed, or attended)
    const eligibleParticipants = event.event_participants
      .filter((p: any) => ['registered', 'confirmed', 'attended'].includes(p.status))
      .map((p: any) => p.participant.fid)
      .filter((fid: any) => fid) // Remove any null FIDs

    if (eligibleParticipants.length === 0) {
      console.log(`No eligible participants for event ${eventId} reminder`)
      return { success: true }
    }

    // Filter participants who have event notifications enabled
    const notificationEnabledFids = await filterUsersByNotificationPreferences(
      eligibleParticipants,
      'events'
    )

    if (notificationEnabledFids.length === 0) {
      console.log(`No participants with event notifications enabled for event ${eventId}`)
      return { success: true }
    }

    // Create notification content based on reminder type
    let title: string
    let body: string
    
    const eventTitle = event.title
    const gameInfo = event.game ? ` (${event.game})` : ''
    const startTime = new Date(event.start_time)
    const timeString = startTime.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })

    switch (reminderType) {
      case '24h':
        title = '📅 Event Tomorrow!'
        body = `${eventTitle}${gameInfo} starts in 24 hours (${timeString})`
        break
      case '1h':
        title = '⏰ Event Starting Soon!'
        body = `${eventTitle}${gameInfo} starts in 1 hour (${timeString})`
        break
      case 'starting':
        title = '🎮 Event Starting Now!'
        body = `${eventTitle}${gameInfo} is starting now! Join your fellow gamers.`
        break
      default:
        return { success: false, error: 'Invalid reminder type' }
    }

    const notification = createNotificationPayload(
      title,
      body,
      `/events/${event.id}`
    )

    // Send notification to eligible participants
    const result = await sendNotificationToUsers(notificationEnabledFids, notification)
    
    if (result.success) {
      console.log(`✅ Sent ${reminderType} reminder for event ${eventId} to ${notificationEnabledFids.length} participants`)
    } else {
      console.error(`❌ Failed to send ${reminderType} reminder for event ${eventId}:`, result.error)
    }

    return result
  } catch (error: any) {
    console.error(`Error sending ${reminderType} reminder for event ${eventId}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Send status change notification to event participants
 */
export async function sendEventStatusChangeNotification(
  eventId: string,
  newStatus: string,
  oldStatus?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // Get event details with participants
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        game,
        status,
        created_by,
        organizer:profiles!events_created_by_fkey (
          fid,
          username,
          display_name
        ),
        event_participants (
          user_id,
          status,
          participant:profiles!event_participants_user_id_fkey (
            fid,
            username,
            display_name
          )
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      console.error('Error fetching event for status change notification:', eventError)
      return { success: false, error: 'Event not found' }
    }

    // Get participants who should receive status updates
    const eligibleParticipants = event.event_participants
      .filter((p: any) => ['registered', 'confirmed', 'attended'].includes(p.status))
      .map((p: any) => p.participant.fid)
      .filter((fid: any) => fid)

    if (eligibleParticipants.length === 0) {
      console.log(`No eligible participants for event ${eventId} status change notification`)
      return { success: true }
    }

    // Filter participants who have event notifications enabled
    const notificationEnabledFids = await filterUsersByNotificationPreferences(
      eligibleParticipants,
      'events'
    )

    if (notificationEnabledFids.length === 0) {
      console.log(`No participants with event notifications enabled for event ${eventId}`)
      return { success: true }
    }

    // Create notification content based on status change
    let title: string
    let body: string
    
    const eventTitle = event.title
    const gameInfo = event.game ? ` (${event.game})` : ''

    switch (newStatus) {
      case 'live':
        title = '🔴 Event is Live!'
        body = `${eventTitle}${gameInfo} has started! Join now.`
        break
      case 'completed':
        title = '✅ Event Completed'
        body = `${eventTitle}${gameInfo} has ended. Thanks for participating!`
        break
      case 'cancelled':
        title = '❌ Event Cancelled'
        body = `${eventTitle}${gameInfo} has been cancelled by the organizer.`
        break
      default:
        // Don't send notifications for other status changes
        return { success: true }
    }

    const notification = createNotificationPayload(
      title,
      body,
      `/events/${event.id}`
    )

    // Send notification to eligible participants
    const result = await sendNotificationToUsers(notificationEnabledFids, notification)
    
    if (result.success) {
      console.log(`✅ Sent status change notification (${oldStatus} → ${newStatus}) for event ${eventId} to ${notificationEnabledFids.length} participants`)
    } else {
      console.error(`❌ Failed to send status change notification for event ${eventId}:`, result.error)
    }

    return result
  } catch (error: any) {
    console.error(`Error sending status change notification for event ${eventId}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Send notification when someone creates a public group (to mutual followers)
 */
export async function sendGroupCreationNotification(
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // Get group details with creator information
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        description,
        is_private,
        created_by,
        created_at,
        creator:profiles!groups_created_by_fkey (
          fid,
          username,
          display_name
        )
      `)
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      console.error('Error fetching group for notification:', groupError)
      return { success: false, error: 'Group not found' }
    }

    // Only send notifications for public groups
    if (group.is_private) {
      console.log('Group is private, skipping notification')
      return { success: true }
    }

    // Create notification content
    const creatorName = group.creator?.display_name || group.creator?.username || `User ${group.creator?.fid}`
    
    const notification = createNotificationPayload(
      'New Gaming Group!',
      `${creatorName} just created a public group: ${group.name}`,
      `/groups/${group.id}`
    )

    // Send to mutual followers using Neynar filtering
    const result = await sendNotificationToAll(notification, {
      following_fid: group.creator?.fid, // Only mutual followers
      minimum_user_score: 0.1 // Active users only
    })
    
    if (result.success) {
      console.log(`✅ Sent group creation notification to mutuals of FID ${group.creator?.fid}`)
    } else {
      console.error('❌ Failed to send group creation notification:', result.error)
    }

    return result
  } catch (error: any) {
    console.error('Error sending group creation notification:', error)
    return { success: false, error: error.message }
  }
} 