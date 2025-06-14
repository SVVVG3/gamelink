import { NextRequest, NextResponse } from 'next/server'
import { 
  sendNotificationToAll, 
  sendNotificationToFids, 
  sendMessageNotification,
  sendEventNotification,
  sendGroupCreationNotification,
  sendGroupInvitationNotification
} from '@/lib/notifications-neynar'

export async function POST(request: NextRequest) {
  try {
    const { type, ...params } = await request.json()
    
    console.log(`🧪 Testing Neynar notification type: ${type}`)
    
    let result
    
    switch (type) {
      case 'test':
        result = await sendNotificationToAll({
          title: 'GameLink Notification Test',
          body: 'Success! Your notification system is now working via Neynar. You should receive this on your phone!',
          target_url: 'https://farcaster-gamelink.vercel.app'
        })
        break
        
      case 'message':
        // Test message notification
        result = await sendMessageNotification(
          [466111], // Test FID array
          466111, // Sender FID
          'Test User',
          'This is a test message notification from GameLink!',
          'test-chat-id'
        )
        break
        
      case 'event':
        // Test event notification
        result = await sendEventNotification(
          'Test Gaming Tournament',
          'Join us for an epic gaming tournament! This is a test event notification.',
          'test-event-id',
          'GameLink Test',
          {
            following_fid: 466111 // Only send to mutual followers
          }
        )
        break
        
      case 'group-creation':
        // Test group creation notification
        result = await sendGroupCreationNotification(
          'Test Gaming Squad',
          'A new gaming group has been created! Join us for epic gaming sessions.',
          'test-group-id',
          'GameLink Test',
          {
            following_fid: 466111 // Only send to mutual followers
          }
        )
        break
        
      case 'group-invitation':
        // Test group invitation notification
        result = await sendGroupInvitationNotification(
          466111, // Invitee FID
          'Test Gaming Squad',
          'test-group-id',
          'GameLink Test'
        )
        break
        
      case 'specific-fids':
        const { fids, title, body } = params
        result = await sendNotificationToFids(fids || [466111], {
          title: title || 'GameLink Test to Specific Users',
          body: body || 'This notification was sent to specific FIDs only!',
          target_url: 'https://farcaster-gamelink.vercel.app'
        })
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid notification type. Use: test, message, event, group-creation, group-invitation, or specific-fids' },
          { status: 400 }
        )
    }
    
    if (result.success) {
      console.log(`✅ ${type} notification test successful`)
      return NextResponse.json({
        success: true,
        message: `${type} notification sent successfully via Neynar!`,
        response: 'response' in result ? result.response : 'Notification sent'
      })
    } else {
      console.error(`❌ ${type} notification test failed:`, result.error)
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Error in notification test:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 