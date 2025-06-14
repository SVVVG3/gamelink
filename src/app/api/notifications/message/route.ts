import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessageNotification } from '@/lib/notifications-neynar'

export async function POST(request: NextRequest) {
  try {
    const { messageId } = await request.json()
    
    if (!messageId) {
      console.error('❌ No messageId provided to notification API')
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
      console.error('❌ Error fetching message:', messageError)
      console.error('❌ Message data:', message)
      return NextResponse.json(
        { error: 'Message not found', details: messageError },
        { status: 404 }
      )
    }

    console.log('✅ Message found:', {
      id: message.id,
      sender_fid: message.sender_fid,
      chat_id: message.chat_id,
      content_preview: message.content.substring(0, 50) + '...'
    })

    // Extract participant FIDs and sender info
    const chat = message.chats as any
    const participantFids = chat.participants.map((p: any) => p.fid)
    const senderProfile = chat.participants.find((p: any) => p.fid === message.sender_fid)
    
    // Fix: profiles is an object, not an array
    const senderName = senderProfile?.profiles?.display_name || 
                      senderProfile?.profiles?.username || 
                      `User ${message.sender_fid}`

    console.log('📊 Chat participants:', {
      all_participants: participantFids,
      sender_fid: message.sender_fid,
      sender_name: senderName,
      sender_profile_debug: senderProfile?.profiles,
      recipients: participantFids.filter((fid: number) => fid !== message.sender_fid)
    })

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
        { 
          message: 'Message notification sent successfully via Neynar', 
          messageId,
          debug: {
            participants: participantFids,
            sender: message.sender_fid,
            sender_name: senderName,
            recipients: participantFids.filter((fid: number) => fid !== message.sender_fid)
          }
        },
        { status: 200 }
      )
    } else {
      console.error('❌ Failed to send message notification via Neynar:', result.error)
      return NextResponse.json(
        { 
          error: 'Failed to send notification', 
          details: result.error,
          debug: {
            participants: participantFids,
            sender: message.sender_fid,
            sender_name: senderName
          }
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ Error in message notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 