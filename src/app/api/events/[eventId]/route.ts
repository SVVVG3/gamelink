import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    console.log(`🎮 API: Fetching event details for ID: ${eventId}`)

    const supabase = await createClient()

    // Fetch event with organizer profile
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_created_by_fkey (
          id,
          fid,
          username,
          display_name,
          bio,
          pfp_url
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('❌ Error fetching event:', eventError)
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Fetch participants with their profiles
    const { data: participants, error: participantsError } = await supabase
      .from('event_participants')
      .select(`
        *,
        profile:profiles!event_participants_user_id_fkey (
          id,
          fid,
          username,
          display_name,
          bio,
          pfp_url
        )
      `)
      .eq('event_id', eventId)
      .order('registered_at', { ascending: true })

    if (participantsError) {
      console.error('❌ Error fetching participants:', participantsError)
      return NextResponse.json(
        { error: 'Failed to fetch participants' },
        { status: 500 }
      )
    }

    // Get user's participation status if authenticated
    let userParticipation = null
    
    // Try to get user FID from query params or headers for user-specific data
    const url = new URL(request.url)
    const userFid = url.searchParams.get('userFid')
    
    if (userFid) {
      console.log(`🔍 API: Looking up user with FID: ${userFid}`)
      
      // Find user's profile to get UUID
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, username, fid')
        .eq('fid', parseInt(userFid))
        .single()

      console.log(`🔍 API: Found user profile:`, userProfile)

      if (userProfile) {
        userParticipation = participants?.find((p: { user_id: string }) => p.user_id === userProfile.id) || null
        console.log(`🔍 API: User participation found:`, userParticipation)
        console.log(`🔍 API: All participants:`, participants?.map(p => ({ user_id: p.user_id, role: p.role, profile: p.profile })))
      }
    }

    // Transform the data to match our interface
    const eventWithDetails = {
      id: event.id,
      title: event.title,
      description: event.description,
      game: event.game,
      gamingPlatform: event.gaming_platform,
      eventType: event.event_type,
      skillLevel: event.skill_level,
      startTime: event.start_time,
      endTime: event.end_time,
      timezone: event.timezone,
      maxParticipants: event.max_participants,
      minParticipants: event.min_participants,
      requireApproval: event.require_approval,
      locationType: event.location_type,
      connectionDetails: event.connection_details,
      physicalLocation: event.physical_location,
      isPrivate: event.is_private,
      allowSpectators: event.allow_spectators,
      registrationDeadline: event.registration_deadline,
      status: event.status,
      createdBy: event.created_by,
      groupId: event.group_id,
      chatId: event.chat_id,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      organizer: event.organizer,
      participants: participants || [],
      participantCount: participants?.length || 0,
      userParticipation
    }

    console.log(`✅ API: Successfully fetched event "${event.title}" with ${participants?.length || 0} participants`)

    return NextResponse.json({
      event: eventWithDetails
    })

  } catch (error) {
    console.error('❌ API Error fetching event details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 