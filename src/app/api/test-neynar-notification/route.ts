import { NextRequest, NextResponse } from 'next/server'
import { 
  sendNotificationToAll, 
  sendNotificationToFids,
  sendMessageNotification,
  sendEventNotification,
  type NotificationFilters 
} from '@/lib/notifications-neynar'

export async function POST(request: NextRequest) {
  try {
    const { 
      type = 'broadcast', 
      fids, 
      title, 
      body, 
      target_url,
      filters 
    } = await request.json()

    console.log(`🧪 Testing Neynar notification system - Type: ${type}`)

    let result

    switch (type) {
      case 'broadcast':
        // Test broadcast to all users
        result = await sendNotificationToAll({
          title: title || '🎮 GameLink Test Notification',
          body: body || 'Testing the new Neynar notification system! This should reach all users with notifications enabled.',
          target_url: target_url || 'https://farcaster-gamelink.vercel.app'
        }, filters)
        break

      case 'specific_fids':
        // Test notification to specific FIDs
        if (!fids || !Array.isArray(fids)) {
          return NextResponse.json(
            { error: 'fids array is required for specific_fids type' },
            { status: 400 }
          )
        }
        result = await sendNotificationToFids(fids, {
          title: title || '🎯 Targeted GameLink Notification',
          body: body || 'This notification was sent to specific users via Neynar!',
          target_url: target_url || 'https://farcaster-gamelink.vercel.app'
        }, filters)
        break

      case 'message':
        // Test message notification
        const testChatParticipants = fids || [466111, 481970] // Default test FIDs
        result = await sendMessageNotification(
          testChatParticipants,
          466111, // Sender FID
          'TestUser',
          'Hey! This is a test message notification via Neynar 🎮',
          'test-chat-123'
        )
        break

      case 'event':
        // Test event notification
        result = await sendEventNotification(
          'Test Gaming Tournament',
          'Join us for an epic gaming tournament! This is a test event created via Neynar notifications.',
          'test-event-123',
          'GameLink Team',
          filters
        )
        break

      default:
        return NextResponse.json(
          { error: 'Invalid notification type. Use: broadcast, specific_fids, message, or event' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        type,
        message: 'Notification sent successfully via Neynar!',
        response: 'response' in result ? result.response : 'Notification sent'
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          type 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in Neynar notification test:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Neynar Notification Test Endpoint',
    usage: {
      method: 'POST',
      types: [
        {
          type: 'broadcast',
          description: 'Send to all users with notifications enabled',
          example: {
            type: 'broadcast',
            title: 'Test Title',
            body: 'Test message',
            target_url: 'https://example.com',
            filters: {
              minimum_user_score: 0.5,
              exclude_fids: [123, 456]
            }
          }
        },
        {
          type: 'specific_fids',
          description: 'Send to specific FIDs',
          example: {
            type: 'specific_fids',
            fids: [466111, 481970],
            title: 'Targeted Test',
            body: 'Message for specific users'
          }
        },
        {
          type: 'message',
          description: 'Test message notification',
          example: {
            type: 'message',
            fids: [466111, 481970]
          }
        },
        {
          type: 'event',
          description: 'Test event notification',
          example: {
            type: 'event'
          }
        }
      ]
    }
  })
} 