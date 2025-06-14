import { NextRequest, NextResponse } from 'next/server'
import { sendMessageNotification } from '@/lib/notifications-neynar'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing message notification with mock data')
    
    // Mock data simulating KatKartel sending you a message
    const mockChatParticipantFids = [466111, 481970] // You and KatKartel (correct FID)
    const mockSenderFid = 481970 // KatKartel's correct FID
    const mockSenderName = "KatKartel"
    const mockMessagePreview = "Hey! Just testing the notification system with correct FID"
    const mockChatId = "test-chat-123"

    console.log('📱 Sending mock message notification:', {
      participants: mockChatParticipantFids,
      sender: mockSenderFid,
      senderName: mockSenderName,
      preview: mockMessagePreview
    })

    // Send notification via Neynar
    const result = await sendMessageNotification(
      mockChatParticipantFids,
      mockSenderFid,
      mockSenderName,
      mockMessagePreview,
      mockChatId
    )
    
    if (result.success) {
      console.log('✅ Mock message notification sent successfully')
      return NextResponse.json({
        success: true,
        message: 'Mock message notification sent successfully',
        details: {
          participants: mockChatParticipantFids,
          sender: mockSenderFid,
          recipients: mockChatParticipantFids.filter(fid => fid !== mockSenderFid)
        }
      })
    } else {
      console.error('❌ Mock message notification failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        details: {
          participants: mockChatParticipantFids,
          sender: mockSenderFid
        }
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('❌ Error in debug message notification:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
} 