import { NextRequest, NextResponse } from 'next/server'
import { sendGroupInvitationNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { invitationId } = await request.json()
    
    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    console.log(`📱 Processing group invitation notification for ID: ${invitationId}`)
    
    const result = await sendGroupInvitationNotification(invitationId)
    
    if (result.success) {
      return NextResponse.json(
        { message: 'Group invitation notification sent successfully', invitationId },
        { status: 200 }
      )
    } else {
      console.error('Failed to send group invitation notification:', result.error)
      return NextResponse.json(
        { error: 'Failed to send notification', details: result.error },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in group invitation notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 