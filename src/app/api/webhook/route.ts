import { NextRequest, NextResponse } from 'next/server'
import { storeNotificationToken, disableNotificationToken, disableAllTokensForFid } from '@/lib/supabase/notifications'
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
 * Handle frame_removed event - disable all notification tokens for user
 */
async function handleFrameRemoved(event: FarcasterWebhookEvent, fid: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📱 Frame removed for FID ${fid}, disabling all tokens`)
    
    const result = await disableAllTokensForFid(fid)
    
    if (!result.success) {
      console.error(`❌ Failed to disable tokens for FID ${fid}:`, result.error)
      return { success: false, error: result.error }
    }

    console.log(`✅ Successfully disabled all tokens for FID ${fid}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error handling frame_removed event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Handle notifications_enabled event - store new notification token
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
 * Handle notifications_disabled event - disable all notification tokens for user
 */
async function handleNotificationsDisabled(event: FarcasterWebhookEvent, fid: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔕 Notifications disabled for FID ${fid}`)
    
    const result = await disableAllTokensForFid(fid)
    
    if (!result.success) {
      console.error(`❌ Failed to disable tokens for FID ${fid}:`, result.error)
      return { success: false, error: result.error }
    }

    console.log(`✅ Successfully disabled all tokens for FID ${fid}`)
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
  const timestamp = new Date().toISOString()
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const origin = request.headers.get('origin') || 'unknown'
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  try {
    const body = await request.text()
    
    // Log ALL headers for debugging
    const allHeaders = Object.fromEntries(request.headers.entries())
    
    console.log(`📥 [${timestamp}] WEBHOOK REQUEST RECEIVED:`, {
      ip,
      userAgent,
      origin,
      method: request.method,
      url: request.url,
      contentType: request.headers.get('content-type'),
      contentLength: body.length,
      allHeaders,
      bodyPreview: body.substring(0, 500) + (body.length > 500 ? '...' : ''),
      timestamp
    })

    let parsedEvent: FarcasterWebhookEvent
    let fid: number
    
    // Check if this is a development/test request with manual FID header
    const fidHeader = request.headers.get('x-farcaster-fid')
    
    if (fidHeader) {
      // Development mode - parse JSON directly and use header FID
      console.log(`🧪 Development mode: Using FID from header: ${fidHeader}`)
      
      try {
        parsedEvent = JSON.parse(body)
        fid = parseInt(fidHeader)
        
        console.log('📋 Development webhook payload:', {
          event: parsedEvent.event,
          hasNotificationDetails: !!parsedEvent.notificationDetails,
          tokenPreview: parsedEvent.notificationDetails?.token?.substring(0, 10) + '...'
        })
      } catch (parseError: any) {
        console.error('❌ Failed to parse development webhook JSON:', parseError.message)
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
      }
    } else {
      // Production mode - verify signature and extract FID from signed payload
      console.log(`🔐 Production mode: Verifying webhook signature`)
      console.log(`🔍 Raw body for verification:`, body)
      
      try {
        // Verify the webhook signature and extract the data
        const webhookData = await parseWebhookEvent(JSON.parse(body), verifyAppKeyWithNeynar)
        
        console.log('✅ Webhook signature verified successfully')
        console.log('📋 Verified webhook data:', webhookData)
        
        // Extract event and notification details from the verified data
        const eventData = webhookData as any // Type assertion for now
        
        parsedEvent = {
          event: eventData.event,
          notificationDetails: eventData.notificationDetails
        }
        fid = eventData.fid
        
      } catch (verifyError: any) {
        console.error('❌ Webhook signature verification failed:', verifyError.message)
        console.log('📄 Raw body for debugging:', body)
        console.log('🔍 Error details:', {
          name: verifyError.name,
          message: verifyError.message,
          stack: verifyError.stack
        })
        
        return NextResponse.json(
          { error: 'Webhook signature verification failed', details: verifyError.message },
          { status: 401 }
        )
      }
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
    console.error(`❌ [${timestamp}] Error processing webhook:`, error)
    console.log(`🔍 Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
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
  const timestamp = new Date().toISOString()
  console.log(`📋 [${timestamp}] Webhook health check from:`, {
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin')
  })
  
  return NextResponse.json({
    message: 'Farcaster notification webhook endpoint',
    status: 'active',
    timestamp,
    endpoint: '/api/webhook',
    format: 'Real Farcaster webhook format with signature verification',
    lastCheck: timestamp
  })
} 