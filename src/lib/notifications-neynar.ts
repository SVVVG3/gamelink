import { NeynarAPIClient } from '@neynar/nodejs-sdk'

// Initialize Neynar client
let neynarClient: NeynarAPIClient | null = null

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

export interface NotificationFilters {
  exclude_fids?: number[]
  following_fid?: number
  minimum_user_score?: number
  near_location?: {
    latitude: number
    longitude: number
    radius?: number // distance in meters, defaults to 50km
  }
}

export interface NotificationPayload {
  title: string
  body: string
  target_url: string
}

/**
 * Send notification to all users with notifications enabled
 */
export async function sendNotificationToAll(
  notification: NotificationPayload,
  filters?: NotificationFilters
): Promise<{ success: boolean; error?: string; response?: any }> {
  try {
    console.log('📢 Sending notification to all users via Neynar:', {
      title: notification.title,
      body: notification.body.substring(0, 50) + '...',
      filters
    })

    const client = getNeynarClient()
    
    const response = await client.publishFrameNotifications({
      targetFids: [], // Empty array = all users with notifications enabled
      filters: filters || {},
      notification
    })

    console.log('✅ Notification sent successfully via Neynar:', response)
    
    return {
      success: true,
      response
    }
    
  } catch (error) {
    console.error('❌ Error sending notification via Neynar:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification'
    }
  }
}

/**
 * Send notification to specific FIDs
 */
export async function sendNotificationToFids(
  fids: number[],
  notification: NotificationPayload,
  filters?: NotificationFilters
): Promise<{ success: boolean; error?: string; response?: any }> {
  try {
    console.log(`📢 Sending notification to ${fids.length} specific FIDs via Neynar:`, {
      fids: fids.slice(0, 5), // Log first 5 FIDs
      title: notification.title,
      body: notification.body.substring(0, 50) + '...',
      filters
    })

    const client = getNeynarClient()
    
    const response = await client.publishFrameNotifications({
      targetFids: fids,
      filters: filters || {},
      notification
    })

    console.log('✅ Notification sent successfully to specific FIDs via Neynar:', response)
    
    return {
      success: true,
      response
    }
    
  } catch (error) {
    console.error('❌ Error sending notification to specific FIDs via Neynar:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification'
    }
  }
}

/**
 * Send notification about a new message in a chat
 */
export async function sendMessageNotification(
  chatParticipantFids: number[],
  senderFid: number,
  senderName: string,
  messagePreview: string,
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Exclude the sender from receiving the notification
    const recipientFids = chatParticipantFids.filter(fid => fid !== senderFid)
    
    if (recipientFids.length === 0) {
      console.log('ℹ️ No recipients for message notification (sender was only participant)')
      return { success: true }
    }

    const notification: NotificationPayload = {
      title: `New message from ${senderName}`,
      body: messagePreview.length > 100 ? messagePreview.substring(0, 97) + '...' : messagePreview,
      target_url: `https://farcaster-gamelink.vercel.app/messages/${chatId}`
    }

    const result = await sendNotificationToFids(recipientFids, notification)
    
    if (result.success) {
      console.log(`✅ Message notification sent to ${recipientFids.length} participants`)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Error sending message notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message notification'
    }
  }
}

/**
 * Send notification about a new event
 */
export async function sendEventNotification(
  eventTitle: string,
  eventDescription: string,
  eventId: string,
  organizerName: string,
  filters?: NotificationFilters
): Promise<{ success: boolean; error?: string }> {
  try {
    const notification: NotificationPayload = {
      title: `New Event: ${eventTitle.substring(0, 35)}${eventTitle.length > 35 ? '...' : ''}`,
      body: `${organizerName} created a new gaming event!`,
      target_url: `https://farcaster-gamelink.vercel.app/events/${eventId}`
    }

    // Use filters for mutual follower targeting
    const result = await sendNotificationToAll(notification, filters)
    
    if (result.success) {
      console.log(`✅ Event notification sent for: ${eventTitle}`, {
        filters,
        organizer: organizerName
      })
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Error sending event notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send event notification'
    }
  }
}

/**
 * Send notification about a new public group created by mutual followers
 */
export async function sendGroupCreationNotification(
  groupName: string,
  groupDescription: string,
  groupId: string,
  creatorName: string,
  filters?: NotificationFilters
): Promise<{ success: boolean; error?: string }> {
  try {
    const notification: NotificationPayload = {
      title: `New Group: ${groupName.substring(0, 40)}${groupName.length > 40 ? '...' : ''}`,
      body: `${creatorName} created a new gaming group!`,
      target_url: `https://farcaster-gamelink.vercel.app/groups/${groupId}`
    }

    // Use filters for mutual follower targeting
    const result = await sendNotificationToAll(notification, filters)
    
    if (result.success) {
      console.log(`✅ Group creation notification sent for: ${groupName}`, {
        filters,
        creator: creatorName
      })
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Error sending group creation notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send group creation notification'
    }
  }
}

/**
 * Send notification about a group invitation
 */
export async function sendGroupInvitationNotification(
  inviteeFid: number,
  groupName: string,
  groupId: string,
  inviterName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const notification: NotificationPayload = {
      title: `Group Invite: ${groupName.substring(0, 35)}${groupName.length > 35 ? '...' : ''}`,
      body: `${inviterName} invited you to join!`,
      target_url: `https://farcaster-gamelink.vercel.app/groups/${groupId}`
    }

    const result = await sendNotificationToFids([inviteeFid], notification)
    
    if (result.success) {
      console.log(`✅ Group invitation notification sent to FID ${inviteeFid} for group: ${groupName}`)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Error sending group invitation notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send group invitation notification'
    }
  }
} 