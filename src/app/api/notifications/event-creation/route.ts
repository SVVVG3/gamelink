import { NextRequest, NextResponse } from 'next/server'
import { sendEventCreationNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json()
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    console.log(`📱 Processing event creation notification for ID: ${eventId}`)
    
    const result = await sendEventCreationNotification(eventId)
    
    if (result.success) {
      return NextResponse.json(
        { message: 'Event creation notification sent successfully', eventId },
        { status: 200 }
      )
    } else {
      console.error('Failed to send event creation notification:', result.error)
      return NextResponse.json(
        { error: 'Failed to send notification', details: result.error },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in event creation notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 