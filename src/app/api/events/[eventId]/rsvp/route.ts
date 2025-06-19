import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { fid, role = 'participant' } = await request.json()

    console.log(`🎮 API: User ${fid} joining event ${eventId} as ${role}`)

    if (!fid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get user profile UUID from FID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, fid')
      .eq('fid', fid)
      .single()

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if event exists and get details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      console.error('Event lookup error:', eventError)
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if user is already registered
    const { data: existingParticipation } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', profile.id)
      .single()

    if (existingParticipation) {
      return NextResponse.json(
        { error: 'You are already registered for this event' },
        { status: 400 }
      )
    }

    // Check event capacity (only for participants, not spectators)
    if (role === 'participant') {
      const { data: currentParticipants } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('role', 'participant')

      if (currentParticipants && currentParticipants.length >= event.max_participants) {
        return NextResponse.json(
          { error: 'Event is full' },
          { status: 400 }
        )
      }
    }

    // Check if spectators are allowed
    if (role === 'spectator' && !event.allow_spectators) {
      return NextResponse.json(
        { error: 'Spectators are not allowed for this event' },
        { status: 400 }
      )
    }

    // Determine initial status based on event settings
    const initialStatus = event.require_approval ? 'pending_approval' : 'confirmed'

    // Create participation record
    const participationData = {
      event_id: eventId,
      user_id: profile.id,
      role: role,
      status: initialStatus,
      registered_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString()
    }

    const { data: participation, error: insertError } = await supabase
      .from('event_participants')
      .insert([participationData])
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating participation:', insertError)
      return NextResponse.json(
        { error: 'Failed to join event', details: insertError.message },
        { status: 500 }
      )
    }

    console.log(`✅ User ${fid} successfully joined event ${eventId} as ${role}`)

    // Auto-join event chat for players (but not spectators)
    let chatJoinResult = null
    if (role === 'participant' && event.chat_id) {
      try {
        console.log(`🎮 Auto-joining user ${fid} to event chat ${event.chat_id}`)
        
        // Check if user is already in the chat
        const { data: existingChatParticipant } = await supabase
          .from('chat_participants')
          .select('id')
          .eq('chat_id', event.chat_id)
          .eq('user_id', profile.id)
          .is('left_at', null)
          .single()

        if (!existingChatParticipant) {
          // Add user to the event chat
          const { error: chatJoinError } = await supabase
            .from('chat_participants')
            .insert([{
              chat_id: event.chat_id,
              user_id: profile.id,
              fid: profile.fid,
              is_admin: false, // Players are not admins (only organizers are)
              joined_at: new Date().toISOString()
            }])

          if (chatJoinError) {
            console.error('⚠️ Failed to auto-join event chat (non-blocking):', chatJoinError)
            // Don't fail the RSVP if chat join fails
          } else {
            console.log(`✅ User ${fid} auto-joined event chat ${event.chat_id}`)
            chatJoinResult = { chatId: event.chat_id, autoJoined: true }
          }
        } else {
          console.log(`ℹ️ User ${fid} already in event chat ${event.chat_id}`)
          chatJoinResult = { chatId: event.chat_id, autoJoined: false, alreadyInChat: true }
        }
      } catch (chatError) {
        console.error('⚠️ Error during auto-join event chat (non-blocking):', chatError)
        // Don't fail the RSVP if chat operations fail
      }
    }

    return NextResponse.json({
      success: true,
      participation: participation,
      message: event.require_approval 
        ? 'Registration submitted for approval' 
        : 'Successfully joined event!',
      chat: chatJoinResult
    })

  } catch (error) {
    console.error('❌ API Error joining event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { fid } = await request.json()

    console.log(`🎮 API: User ${fid} leaving event ${eventId}`)

    if (!fid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get user profile UUID from FID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, fid')
      .eq('fid', fid)
      .single()

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is registered for this event
    const { data: participation, error: participationError } = await supabase
      .from('event_participants')
      .select('*, events!inner(created_by)')
      .eq('event_id', eventId)
      .eq('user_id', profile.id)
      .single()

    if (participationError || !participation) {
      return NextResponse.json(
        { error: 'You are not registered for this event' },
        { status: 400 }
      )
    }

    // Prevent organizer from leaving their own event
    if (participation.role === 'organizer') {
      return NextResponse.json(
        { error: 'Event organizers cannot leave their own events' },
        { status: 400 }
      )
    }

    // Delete participation record
    const { error: deleteError } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', profile.id)

    if (deleteError) {
      console.error('❌ Error leaving event:', deleteError)
      return NextResponse.json(
        { error: 'Failed to leave event', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log(`✅ User ${fid} successfully left event ${eventId}`)

    return NextResponse.json({
      success: true,
      message: 'Successfully left event'
    })

  } catch (error) {
    console.error('❌ API Error leaving event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 