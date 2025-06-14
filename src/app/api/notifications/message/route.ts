import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessageNotification } from '@/lib/notifications-neynar'

export async function POST(request: NextRequest) {
  try {
    const { messageId } = await request.json()
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    console.log(`📱 Processing message notification for ID: ${messageId} via Neynar`)
    
    const supabase = await createClient()
    
    // Get message details with chat participants
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_fid,
        chat_id,
        chats!inner (
          id,
          participants:chat_participants!inner (
            fid,
            profiles!inner (
              fid,
              display_name,
              username
            )
          )
        )
      `)
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      console.error('Error fetching message:', messageError)
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Extract participant FIDs and sender info
    const chat = message.chats[0] // Get the first (and only) chat
    const participantFids = chat.participants.map((p: any) => p.fid)
    const senderProfile = chat.participants.find((p: any) => p.fid === message.sender_fid)
    const senderName = senderProfile?.profiles?.[0]?.display_name || 
                      senderProfile?.profiles?.[0]?.username || 
                      `User ${message.sender_fid}`

    // Send notification via Neynar
    const result = await sendMessageNotification(
      participantFids,
      message.sender_fid,
      senderName,
      message.content,
      message.chat_id
    )
    
    if (result.success) {
      console.log(`✅ Message notification sent via Neynar for message ${messageId}`)
      return NextResponse.json(
        { message: 'Message notification sent successfully via Neynar', messageId },
        { status: 200 }
      )
    } else {
      console.error('Failed to send message notification via Neynar:', result.error)
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