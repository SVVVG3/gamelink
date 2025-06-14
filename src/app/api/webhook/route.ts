import { NextRequest, NextResponse } from 'next/server'
import { storeNotificationToken, disableNotificationToken } from '@/lib/supabase/notifications'

// Types for Farcaster webhook events
interface FarcasterWebhookEvent {
  type: 'frame_added' | 'frame_removed' | 'notifications_enabled' | 'notifications_disabled'
  data: {
    fid: number
    notificationDetails?: {
      token: string
      url: string
    }
  }
  timestamp: string
}

interface WebhookPayload {
  event: FarcasterWebhookEvent
  signature?: string
}

/**
 * Verify webhook signature (placeholder for now)
 * In production, you should verify the webhook signature from Farcaster
 */
function verifyWebhookSignature(payload: string, signature?: string): boolean {
  // TODO: Implement proper webhook signature verification
  // For now, we'll accept all requests
  // In production, verify against Farcaster's webhook secret
  return true
}

/**
 * Handle frame_added event - store notification token
 */
async function handleFrameAdded(event: FarcasterWebhookEvent): Promise<{ success: boolean; error?: string }> {
  try {
    const { fid, notificationDetails } = event.data
    
    if (!notificationDetails?.token) {
      console.log(`⚠️ Frame added for FID ${fid} but no notification token provided`)
      return { success: true } // Not an error, just no token to store
    }

    console.log(`📱 Frame added for FID ${fid}, storing notification token`)
    
    const result = await storeNotificationToken(fid, notificationDetails.token)
    
    if (!result.success) {
      console.error(`❌ Failed to store notification token for FID ${fid}:`, result.error)
      return { success: false, error: result.error }
    }

    console.log(`✅ Successfully stored notification token for FID ${fid}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error handling frame_added event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Handle frame_removed event - disable notification token
 */
async function handleFrameRemoved(event: FarcasterWebhookEvent): Promise<{ success: boolean; error?: string }> {
  try {
    const { fid, notificationDetails } = event.data
    
    if (!notificationDetails?.token) {
      console.log(`⚠️ Frame removed for FID ${fid} but no notification token provided`)
      return { success: true } // Not an error, just no token to disable
    }

    console.log(`📱 Frame removed for FID ${fid}, disabling notification token`)
    
    const result = await disableNotificationToken(notificationDetails.token)
    
    if (!result.success) {
      console.error(`❌ Failed to disable notification token for FID ${fid}:`, result.error)
      return { success: false, error: result.error }
    }

    console.log(`✅ Successfully disabled notification token for FID ${fid}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error handling frame_removed event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Handle notifications_enabled event - enable notifications for user
 */
async function handleNotificationsEnabled(event: FarcasterWebhookEvent): Promise<{ success: boolean; error?: string }> {
  try {
    const { fid, notificationDetails } = event.data
    
    console.log(`🔔 Notifications enabled for FID ${fid}`)
    
    if (notificationDetails?.token) {
      // Store the new notification token
      const result = await storeNotificationToken(fid, notificationDetails.token)
      
      if (!result.success) {
        console.error(`❌ Failed to store notification token for FID ${fid}:`, result.error)
        return { success: false, error: result.error }
      }
    }

    console.log(`✅ Successfully enabled notifications for FID ${fid}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error handling notifications_enabled event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Handle notifications_disabled event - disable notifications for user
 */
async function handleNotificationsDisabled(event: FarcasterWebhookEvent): Promise<{ success: boolean; error?: string }> {
  try {
    const { fid, notificationDetails } = event.data
    
    console.log(`🔕 Notifications disabled for FID ${fid}`)
    
    if (notificationDetails?.token) {
      // Disable the notification token
      const result = await disableNotificationToken(notificationDetails.token)
      
      if (!result.success) {
        console.error(`❌ Failed to disable notification token for FID ${fid}:`, result.error)
        return { success: false, error: result.error }
      }
    }

    console.log(`✅ Successfully disabled notifications for FID ${fid}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error handling notifications_disabled event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const payload: WebhookPayload = JSON.parse(body)
    
    console.log('📥 Received Farcaster webhook at /api/webhook:', {
      type: payload.event?.type,
      fid: payload.event?.data?.fid,
      timestamp: payload.event?.timestamp
    })

    // Verify webhook signature
    const signature = request.headers.get('x-farcaster-signature') || payload.signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Validate event structure
    if (!payload.event || !payload.event.type || !payload.event.data) {
      console.error('❌ Invalid webhook payload structure')
      return NextResponse.json(
        { error: 'Invalid payload structure' },
        { status: 400 }
      )
    }

    const { event } = payload
    let result: { success: boolean; error?: string }

    // Handle different event types
    switch (event.type) {
      case 'frame_added':
        result = await handleFrameAdded(event)
        break
      
      case 'frame_removed':
        result = await handleFrameRemoved(event)
        break
      
      case 'notifications_enabled':
        result = await handleNotificationsEnabled(event)
        break
      
      case 'notifications_disabled':
        result = await handleNotificationsDisabled(event)
        break
      
      default:
        console.log(`⚠️ Unknown event type: ${event.type}`)
        return NextResponse.json(
          { message: 'Event type not supported', type: event.type },
          { status: 200 }
        )
    }

    if (!result.success) {
      console.error(`❌ Failed to process ${event.type} event:`, result.error)
      return NextResponse.json(
        { 
          error: 'Failed to process event', 
          details: result.error,
          type: event.type 
        },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully processed ${event.type} event for FID ${event.data.fid}`)
    return NextResponse.json({
      message: 'Event processed successfully',
      type: event.type,
      fid: event.data.fid
    })

  } catch (error: any) {
    console.error('❌ Error processing Farcaster webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Handle GET requests - webhook health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Farcaster notification webhook endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoint: '/api/webhook'
  })
} 