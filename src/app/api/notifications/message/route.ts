import { NextRequest, NextResponse } from 'next/server'
import { sendMessageNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { messageId } = await request.json()
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    console.log(`📱 Processing message notification for ID: ${messageId}`)
    
    const result = await sendMessageNotification(messageId)
    
    if (result.success) {
      return NextResponse.json(
        { message: 'Message notification sent successfully', messageId },
        { status: 200 }
      )
    } else {
      console.error('Failed to send message notification:', result.error)
      return NextResponse.json(
        { error: 'Failed to send notification', details: result.error },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in message notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 