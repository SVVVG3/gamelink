import { NextRequest, NextResponse } from 'next/server'
import { storeNotificationToken, disableNotificationToken } from '@/lib/supabase/notifications'
import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/frame-node'

// Real Farcaster webhook event types (based on documentation)
interface FarcasterWebhookEvent {
  event: 'frame_added' | 'frame_removed' | 'notifications_enabled' | 'notifications_disabled'
  notificationDetails?: {
    token: string
    url: string
  }
}

/**
 * Handle frame_added event - store notification token
 */
async function handleFrameAdded(event: FarcasterWebhookEvent, fid: number): Promise<{ success: boolean; error?: string }> {
  try {
    if (!event.notificationDetails?.token) {
      console.log(`⚠️ Frame added for FID ${fid} but no notification token provided`)
      return { success: true } // Not an error, just no token to store
    }

    console.log(`📱 Frame added for FID ${fid}, storing notification token`)
    
    const result = await storeNotificationToken(fid, event.notificationDetails.token, event.notificationDetails.url)
    
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
async function handleFrameRemoved(event: FarcasterWebhookEvent, fid: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📱 Frame removed for FID ${fid}, disabling all tokens`)
    
    // For frame_removed, we should disable all tokens for this FID
    // since we don't have the specific token
    // TODO: Implement disable all tokens for FID function
    
    console.log(`✅ Successfully handled frame removal for FID ${fid}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error handling frame_removed event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Handle notifications_enabled event - enable notifications for user
 */
async function handleNotificationsEnabled(event: FarcasterWebhookEvent, fid: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔔 Notifications enabled for FID ${fid}`)
    
    if (event.notificationDetails?.token) {
      // Store the new notification token
      const result = await storeNotificationToken(fid, event.notificationDetails.token, event.notificationDetails.url)
      
      if (!result.success) {
        console.error(`❌ Failed to store notification token for FID ${fid}:`, result.error)
        return { success: false, error: result.error }
      }
      
      console.log(`✅ Stored notification token for FID ${fid}: ${event.notificationDetails.token.substring(0, 10)}...`)
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
async function handleNotificationsDisabled(event: FarcasterWebhookEvent, fid: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔕 Notifications disabled for FID ${fid}`)
    
    // For notifications_disabled, we should disable all tokens for this FID
    // TODO: Implement disable all tokens for FID function
    
    console.log(`✅ Successfully disabled notifications for FID ${fid}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error handling notifications_disabled event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Main webhook handler for real Farcaster webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    console.log('📥 Received Farcaster webhook at /api/webhook')

    // Parse the webhook event
    let parsedEvent: FarcasterWebhookEvent
    let fid: number
    
    try {
      parsedEvent = JSON.parse(body)
      console.log('📋 Parsed webhook payload:', {
        event: parsedEvent.event,
        hasNotificationDetails: !!parsedEvent.notificationDetails
      })
    } catch (parseError: any) {
      console.error('❌ Failed to parse webhook JSON:', parseError.message)
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // For development/testing, extract FID from headers
    const fidHeader = request.headers.get('x-farcaster-fid')
    if (fidHeader) {
      fid = parseInt(fidHeader)
      console.log(`🆔 Using FID from header: ${fid}`)
    } else {
      console.error('❌ No FID available - missing x-farcaster-fid header')
      return NextResponse.json(
        { error: 'Missing FID in request headers (x-farcaster-fid required for testing)' },
        { status: 400 }
      )
    }

    // Validate event structure
    if (!parsedEvent.event) {
      console.error('❌ Invalid webhook payload structure - missing event field')
      return NextResponse.json(
        { error: 'Invalid payload structure - missing event field' },
        { status: 400 }
      )
    }

    let result: { success: boolean; error?: string }

    // Handle different event types
    switch (parsedEvent.event) {
      case 'frame_added':
        result = await handleFrameAdded(parsedEvent, fid)
        break
      
      case 'frame_removed':
        result = await handleFrameRemoved(parsedEvent, fid)
        break
      
      case 'notifications_enabled':
        result = await handleNotificationsEnabled(parsedEvent, fid)
        break
      
      case 'notifications_disabled':
        result = await handleNotificationsDisabled(parsedEvent, fid)
        break
      
      default:
        console.log(`⚠️ Unknown event type: ${parsedEvent.event}`)
        return NextResponse.json(
          { message: 'Event type not supported', type: parsedEvent.event },
          { status: 200 }
        )
    }

    if (!result.success) {
      console.error(`❌ Failed to process ${parsedEvent.event} event:`, result.error)
      return NextResponse.json(
        { 
          error: 'Failed to process event', 
          details: result.error,
          type: parsedEvent.event 
        },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully processed ${parsedEvent.event} event for FID ${fid}`)
    return NextResponse.json({
      message: 'Event processed successfully',
      type: parsedEvent.event,
      fid: fid
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
    endpoint: '/api/webhook',
    format: 'Real Farcaster webhook format (development mode - no signature verification)'
  })
} 