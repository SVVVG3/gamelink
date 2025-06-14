import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { userFid } = await request.json()

    if (!userFid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, fid')
      .eq('fid', userFid)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get event and its chat_id
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, chat_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (!event.chat_id) {
      return NextResponse.json(
        { error: 'Event does not have a group chat' },
        { status: 400 }
      )
    }

    // Verify user is a participant in the event
    const { data: participation, error: participationError } = await supabase
      .from('event_participants')
      .select('id, status, role')
      .eq('event_id', eventId)
      .eq('user_id', profile.id)
      .single()

    if (participationError || !participation) {
      return NextResponse.json(
        { error: 'You must be registered for this event to join the chat' },
        { status: 403 }
      )
    }

    // Check if user is already in the chat
    const { data: existingParticipant } = await supabase
      .from('chat_participants')
      .select('id')
      .eq('chat_id', event.chat_id)
      .eq('user_id', profile.id)
      .is('left_at', null)
      .single()

    if (existingParticipant) {
      return NextResponse.json({
        success: true,
        message: 'You are already in the event chat',
        chatId: event.chat_id
      })
    }

    // Add user to the chat
    const { error: joinError } = await supabase
      .from('chat_participants')
      .insert([{
        chat_id: event.chat_id,
        user_id: profile.id,
        fid: profile.fid,
        is_admin: participation.role === 'organizer',
        joined_at: new Date().toISOString()
      }])

    if (joinError) {
      console.error('Error adding user to event chat:', joinError)
      return NextResponse.json(
        { error: 'Failed to join event chat' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined event chat',
      chatId: event.chat_id
    })

  } catch (error) {
    console.error('Error joining event chat:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 