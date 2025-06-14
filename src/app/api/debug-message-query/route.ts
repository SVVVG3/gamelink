import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { messageId } = await request.json()
    
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    console.log(`🔍 Debugging message query for ID: ${messageId}`)
    
    const supabase = await createClient()
    
    // First, let's check if the message exists at all
    const { data: basicMessage, error: basicError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    console.log('📋 Basic message query result:', { basicMessage, basicError })

    if (basicError || !basicMessage) {
      return NextResponse.json({
        error: 'Message not found in basic query',
        details: basicError,
        messageId
      }, { status: 404 })
    }

    // Now let's check the chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', basicMessage.chat_id)
      .single()

    console.log('📋 Chat query result:', { chat, chatError })

    // Now let's check chat participants
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select(`
        fid,
        profiles!inner (
          fid,
          display_name,
          username
        )
      `)
      .eq('chat_id', basicMessage.chat_id)

    console.log('📋 Participants query result:', { participants, participantsError })

    // Now let's try the complex query that's failing
    const { data: complexMessage, error: complexError } = await supabase
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

    console.log('📋 Complex query result:', { complexMessage, complexError })

    return NextResponse.json({
      messageId,
      basicMessage,
      chat,
      participants,
      complexMessage,
      errors: {
        basicError,
        chatError,
        participantsError,
        complexError
      }
    })

  } catch (error: any) {
    console.error('❌ Error in debug message query:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
} 