import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateEvent, validateEventStatusTransition, type EventStatus } from '@/lib/supabase/events'

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const requestBody = await request.json()
    const { status, userFid, completionData } = requestBody

    console.log(`🎮 API: Updating event status for ID: ${eventId}`)
    console.log(`🎮 API: Request body:`, JSON.stringify(requestBody, null, 2))
    console.log(`🎮 API: Extracted values:`, { status, userFid, completionData })

    // Validate required fields
    if (!status) {
      console.error(`❌ API: Missing status field`)
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    if (!userFid) {
      console.error(`❌ API: Missing userFid field`)
      return NextResponse.json(
        { error: 'User authentication is required' },
        { status: 401 }
      )
    }

    // Validate status value
    const validStatuses = ['draft', 'upcoming', 'live', 'completed', 'cancelled', 'archived']
    if (!validStatuses.includes(status)) {
      console.error(`❌ API: Invalid status value: ${status}`)
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile to verify authentication
    console.log(`🔍 API: Looking up user profile for FID: ${userFid}`)
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, fid, username')
      .eq('fid', parseInt(userFid))
      .single()

    if (userError || !userProfile) {
      console.error('❌ Error fetching user profile:', userError)
      return NextResponse.json(
        { error: 'User not found or not authenticated' },
        { status: 401 }
      )
    }

    console.log(`✅ API: Found user profile:`, userProfile)

    // Get current event to verify authorization and validate status transition
    console.log(`🔍 API: Fetching current event data for ID: ${eventId}`)
    const { data: currentEvent, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('❌ Error fetching event:', eventError)
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (!currentEvent) {
      console.error('❌ Event not found in database')
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    console.log(`✅ API: Found current event:`, {
      id: currentEvent.id,
      title: currentEvent.title,
      status: currentEvent.status,
      created_by: currentEvent.created_by
    })

    // Check if user is the organizer
    if (currentEvent.created_by !== userProfile.id) {
      console.error(`❌ Authorization failed: User ${userProfile.id} is not organizer of event created by ${currentEvent.created_by}`)
      return NextResponse.json(
        { error: 'Only the event organizer can update event status' },
        { status: 403 }
      )
    }

    console.log(`✅ API: Authorization successful - user is event organizer`)

    // Comprehensive status transition validation
    const currentStatus = currentEvent.status as EventStatus
    const newStatus = status as EventStatus
    
    console.log(`🔍 API: Validating status transition: ${currentStatus} → ${newStatus}`)
    console.log(`🔍 API: Event details for validation:`, {
      id: eventId,
      currentStatus,
      newStatus,
      startTime: currentEvent.start_time,
      endTime: currentEvent.end_time,
      minParticipants: currentEvent.min_participants
    })
    
    const validation = await validateEventStatusTransition(
      eventId,
      currentStatus,
      newStatus,
      currentEvent.start_time,
      currentEvent.end_time,
      currentEvent.min_participants
    )

    console.log(`🔍 API: Validation result:`, validation)

    if (!validation.isValid) {
      console.error(`❌ API: Status transition validation failed:`, validation.error)
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    console.log(`✅ API: Status transition validation passed`)

    // Update the event status using the existing utility function
    console.log(`🔍 API: Updating event status in database...`)
    const updatedEvent = await updateEvent(eventId, { status })

    if (!updatedEvent) {
      console.error(`❌ API: Failed to update event in database`)
      return NextResponse.json(
        { error: 'Failed to update event status' },
        { status: 500 }
      )
    }

    console.log(`✅ API: Event status updated successfully:`, {
      id: updatedEvent.id,
      title: updatedEvent.title,
      status: updatedEvent.status
    })

    // Send status change notification to participants (async, don't block response)
    if (['live', 'completed', 'cancelled'].includes(newStatus)) {
      try {
        console.log(`🔍 API: Sending status change notification...`)
        const { sendEventStatusChangeNotification } = await import('../../../../lib/notifications')
        await sendEventStatusChangeNotification(eventId, newStatus, currentStatus)
        console.log(`✅ API: Sent status change notification (${currentStatus} → ${newStatus}) for event ${eventId}`)
      } catch (error) {
        console.error(`❌ API: Failed to send status change notification for event ${eventId}:`, error)
        // Don't fail the API call if notification fails
      }
    }

    console.log(`✅ API: Event status update completed successfully`)
    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message: `Event status updated to ${newStatus}`
    })

  } catch (error) {
    console.error('❌ API Error updating event status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 