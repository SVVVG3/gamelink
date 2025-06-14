import { createClient } from '@supabase/supabase-js'

// Create server-side Supabase client with service role key
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Supabase environment variables are required')
  }
  
  return createClient(url, key)
}

// Types for notification system
export interface NotificationToken {
  id: string
  user_fid: number
  token: string
  url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  user_fid: number
  messages_enabled: boolean
  group_invites_enabled: boolean
  events_enabled: boolean
  groups_enabled: boolean
  created_at: string
  updated_at: string
}

// Real Farcaster notification payload structure
interface FarcasterNotificationPayload {
  notificationId: string
  title: string
  body: string
  targetUrl: string
  tokens: string[]
}

// Response from Farcaster notification API
interface FarcasterNotificationResponse {
  successfulTokens: string[]
  invalidTokens: string[]
  rateLimitedTokens: string[]
}

/**
 * Store a notification token for a user
 */
export async function storeNotificationToken(
  fid: number, 
  token: string, 
  url: string = 'https://api.farcaster.xyz/v1/frame-notifications'
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`💾 Storing notification token for FID ${fid}`)
    
    const supabase = getSupabaseClient()
    
    // First, disable any existing tokens for this FID to avoid duplicates
    await supabase
      .from('notification_tokens')
      .update({ is_active: false })
      .eq('user_fid', fid)
    
    // Insert the new token
    const { error } = await supabase
      .from('notification_tokens')
      .insert({
        user_fid: fid,
        token,
        url,
        is_active: true
      })
    
    if (error) {
      console.error('❌ Error storing notification token:', error)
      return { success: false, error: error.message }
    }
    
    console.log(`✅ Successfully stored notification token for FID ${fid}`)
    return { success: true }
  } catch (error: any) {
    console.error('❌ Error in storeNotificationToken:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Disable a specific notification token
 */
export async function disableNotificationToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔕 Disabling notification token: ${token.substring(0, 10)}...`)
    
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('notification_tokens')
      .update({ is_active: false })
      .eq('token', token)
    
    if (error) {
      console.error('❌ Error disabling notification token:', error)
      return { success: false, error: error.message }
    }
    
    console.log(`✅ Successfully disabled notification token`)
    return { success: true }
  } catch (error: any) {
    console.error('❌ Error in disableNotificationToken:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Disable all notification tokens for a specific FID
 */
export async function disableAllTokensForFid(fid: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔕 Disabling all notification tokens for FID ${fid}`)
    
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('notification_tokens')
      .update({ is_active: false })
      .eq('user_fid', fid)
    
    if (error) {
      console.error('❌ Error disabling tokens for FID:', error)
      return { success: false, error: error.message }
    }
    
    console.log(`✅ Successfully disabled all tokens for FID ${fid}`)
    return { success: true }
  } catch (error: any) {
    console.error('❌ Error in disableAllTokensForFid:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get active notification tokens for a user
 */
export async function getActiveTokensForFid(fid: number): Promise<{ success: boolean; tokens?: NotificationToken[]; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('notification_tokens')
      .select('*')
      .eq('user_fid', fid)
      .eq('is_active', true)
    
    if (error) {
      console.error('❌ Error fetching tokens for FID:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, tokens: data || [] }
  } catch (error: any) {
    console.error('❌ Error in getActiveTokensForFid:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(fid: number): Promise<{ success: boolean; preferences?: NotificationPreferences; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_fid', fid)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching notification preferences:', error)
      return { success: false, error: error.message }
    }
    
    // If no preferences exist, return default preferences
    if (!data) {
      const defaultPreferences: NotificationPreferences = {
        user_fid: fid,
        messages_enabled: true,
        group_invites_enabled: true,
        events_enabled: true,
        groups_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      return { success: true, preferences: defaultPreferences }
    }
    
    return { success: true, preferences: data }
  } catch (error: any) {
    console.error('❌ Error in getNotificationPreferences:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send a notification using the real Farcaster API
 */
export async function sendFarcasterNotification(
  fids: number[],
  title: string,
  body: string,
  targetUrl: string,
  notificationId: string
): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    console.log(`📤 Sending Farcaster notification to ${fids.length} users`)
    
    // Get active tokens for all FIDs
    const allTokens: { fid: number; token: string; url: string }[] = []
    
    for (const fid of fids) {
      const tokensResult = await getActiveTokensForFid(fid)
      if (tokensResult.success && tokensResult.tokens) {
        for (const tokenData of tokensResult.tokens) {
          allTokens.push({
            fid,
            token: tokenData.token,
            url: tokenData.url
          })
        }
      }
    }
    
    if (allTokens.length === 0) {
      console.log('⚠️ No active notification tokens found for any FIDs')
      return { success: true, results: { message: 'No active tokens' } }
    }
    
    console.log(`📱 Found ${allTokens.length} active tokens`)
    
    // Group tokens by URL (in case different tokens use different endpoints)
    const tokensByUrl = allTokens.reduce((acc, { token, url }) => {
      if (!acc[url]) acc[url] = []
      acc[url].push(token)
      return acc
    }, {} as Record<string, string[]>)
    
    const results: any[] = []
    
    // Send notifications to each URL endpoint
    for (const [url, tokens] of Object.entries(tokensByUrl)) {
      // Batch tokens in groups of 100 (Farcaster API limit)
      const batches = []
      for (let i = 0; i < tokens.length; i += 100) {
        batches.push(tokens.slice(i, i + 100))
      }
      
      for (const batch of batches) {
        const payload: FarcasterNotificationPayload = {
          notificationId,
          title,
          body,
          targetUrl,
          tokens: batch
        }
        
        console.log(`📡 Sending notification batch to ${url}`, {
          tokenCount: batch.length,
          title,
          notificationId
        })
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ Farcaster API error (${response.status}):`, errorText)
            results.push({
              url,
              batch: batch.length,
              success: false,
              error: `HTTP ${response.status}: ${errorText}`
            })
            continue
          }
          
          const result = await response.json()
          
          console.log(`✅ Notification API response:`, result)
          
          // Handle the response structure safely
          const successfulTokens = result.successfulTokens || []
          const invalidTokens = result.invalidTokens || []
          const rateLimitedTokens = result.rateLimitedTokens || []
          
          console.log(`📊 Notification results:`, {
            successful: successfulTokens.length,
            invalid: invalidTokens.length,
            rateLimited: rateLimitedTokens.length
          })
          
          // Disable invalid tokens
          if (invalidTokens.length > 0) {
            console.log(`🔕 Disabling ${invalidTokens.length} invalid tokens`)
            for (const invalidToken of invalidTokens) {
              await disableNotificationToken(invalidToken)
            }
          }
          
          results.push({
            url,
            batch: batch.length,
            success: true,
            result
          })
          
        } catch (fetchError: any) {
          console.error(`❌ Network error sending to ${url}:`, fetchError.message)
          results.push({
            url,
            batch: batch.length,
            success: false,
            error: fetchError.message
          })
        }
      }
    }
    
    console.log(`✅ Completed sending notifications to ${fids.length} users`)
    return { success: true, results }
    
  } catch (error: any) {
    console.error('❌ Error in sendFarcasterNotification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send a message notification
 */
export async function sendMessageNotification(
  recipientFids: number[],
  senderName: string,
  messagePreview: string,
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check notification preferences for each recipient
    const eligibleFids: number[] = []
    
    for (const fid of recipientFids) {
      const prefsResult = await getNotificationPreferences(fid)
      if (prefsResult.success && prefsResult.preferences?.messages_enabled) {
        eligibleFids.push(fid)
      }
    }
    
    if (eligibleFids.length === 0) {
      console.log('⚠️ No users have message notifications enabled')
      return { success: true }
    }
    
    const result = await sendFarcasterNotification(
      eligibleFids,
      `New message from ${senderName}`,
      messagePreview,
      `${process.env.NEXT_PUBLIC_APP_URL}/messages/${chatId}`,
      `message-${chatId}-${Date.now()}`
    )
    
    return result
  } catch (error: any) {
    console.error('❌ Error in sendMessageNotification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send a message notification by message ID (wrapper for compatibility)
 */
export async function sendMessageNotificationById(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📱 Looking up message details for ID: ${messageId}`)
    
    const supabase = getSupabaseClient()
    
    // Get message details
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        chat_id,
        sender_fid,
        content,
        created_at
      `)
      .eq('id', messageId)
      .single()
    
    if (messageError || !message) {
      console.error('❌ Error fetching message:', messageError)
      return { success: false, error: 'Message not found' }
    }
    
    // Get chat participants (recipients)
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('fid')
      .eq('chat_id', message.chat_id)
      .neq('fid', message.sender_fid) // Exclude sender
    
    if (participantsError) {
      console.error('❌ Error fetching chat participants:', participantsError)
      return { success: false, error: 'Failed to get chat participants' }
    }
    
    if (!participants || participants.length === 0) {
      console.log('⚠️ No recipients found for message notification')
      return { success: true }
    }
    
    const recipientFids = participants.map(p => p.fid)
    
    // Get sender name (you might want to fetch from profiles table)
    const senderName = `User ${message.sender_fid}` // Simplified for now
    
    // Create message preview (first 50 characters)
    const messagePreview = message.content.length > 50 
      ? message.content.substring(0, 50) + '...'
      : message.content
    
    console.log(`📤 Sending notification to ${recipientFids.length} recipients`)
    
    return await sendMessageNotification(
      recipientFids,
      senderName,
      messagePreview,
      message.chat_id
    )
    
  } catch (error: any) {
    console.error('❌ Error in sendMessageNotificationById:', error)
    return { success: false, error: error.message }
  }
} 