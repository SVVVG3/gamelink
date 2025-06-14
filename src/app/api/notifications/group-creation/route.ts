import { NextRequest, NextResponse } from 'next/server'
import { sendGroupCreationNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { groupId } = await request.json()
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      )
    }

    console.log(`📱 Processing group creation notification for ID: ${groupId}`)
    
    const result = await sendGroupCreationNotification(groupId)
    
    if (result.success) {
      return NextResponse.json(
        { message: 'Group creation notification sent successfully', groupId },
        { status: 200 }
      )
    } else {
      console.error('Failed to send group creation notification:', result.error)
      return NextResponse.json(
        { error: 'Failed to send notification', details: result.error },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in group creation notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 