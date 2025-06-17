import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateEventData } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const eventData: CreateEventData = await request.json()
    
    // Get FID from request body (sent by frontend)
    if (!eventData.createdBy) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 401 }
      )
    }

    // Verify the profile exists in our database and get the UUID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, fid')
      .eq('fid', eventData.createdBy)
      .single()

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError)
      return NextResponse.json(
        { 
          error: 'User profile not found. Please make sure you are signed in and your profile is synced.',
          details: profileError?.message 
        },
        { status: 404 }
      )
    }
    
    // Validate required fields
    if (!eventData.title?.trim()) {
      return NextResponse.json(
        { error: 'Event title is required' },
        { status: 400 }
      )
    }

    if (!eventData.game?.trim()) {
      return NextResponse.json(
        { error: 'Game is required' },
        { status: 400 }
      )
    }

    if (!eventData.startTime) {
      return NextResponse.json(
        { error: 'Start time is required' },
        { status: 400 }
      )
    }

    // Validate start time is in the future
    // Handle timezone properly - datetime-local sends local time without timezone
    const startTime = new Date(eventData.startTime)
    const now = new Date()
    
    // Get user's timezone from the event data or default to server timezone
    const userTimezone = eventData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Create a proper date object considering the user's timezone
    // For datetime-local, we assume the time is in the user's local timezone
    const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }))
    
    // Compare with a small buffer (5 minutes) to account for processing time
    const bufferMinutes = 5
    const bufferTime = bufferMinutes * 60 * 1000
    const adjustedNow = new Date(userNow.getTime() - bufferTime)
    
    if (startTime <= adjustedNow) {
      const minutesFromNow = Math.ceil((startTime.getTime() - userNow.getTime()) / (1000 * 60))
      const errorMessage = minutesFromNow <= 0 
        ? 'Start time must be in the future'
        : `Start time must be at least ${bufferMinutes} minutes in the future (currently ${minutesFromNow} minutes from now)`
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // Validate end time if provided
    if (eventData.endTime) {
      const endTime = new Date(eventData.endTime)
      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        )
      }
    }

    // Validate max participants
    const maxParticipants = eventData.maxParticipants || 8
    if (maxParticipants < 2 || maxParticipants > 1000) {
      return NextResponse.json(
        { error: 'Max participants must be between 2 and 1000' },
        { status: 400 }
      )
    }

    // Validate location-specific requirements
    if (eventData.locationType === 'online' && !eventData.connectionDetails?.trim()) {
      return NextResponse.json(
        { error: 'Connection details are required for online events' },
        { status: 400 }
      )
    }

    if (eventData.locationType === 'in_person' && !eventData.physicalLocation?.trim()) {
      return NextResponse.json(
        { error: 'Physical location is required for in-person events' },
        { status: 400 }
      )
    }

    // Prepare event data for database
    const eventTimezone = eventData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Convert datetime-local input to proper UTC timestamp
    // datetime-local sends "2025-06-16T18:45" which represents local time in user's timezone
    // We need to convert this to UTC for database storage
    
    // Simple approach: treat the datetime-local as if it's in the user's timezone
    // and convert to UTC by creating a date in that timezone
    const localTimeString = eventData.startTime.includes('T') ? eventData.startTime : eventData.startTime + 'T00:00'
    
    // Create a temporary date to get the timezone offset
    const tempDate = new Date()
    const utcTime = new Date(tempDate.toLocaleString('en-US', { timeZone: 'UTC' }))
    const userTime = new Date(tempDate.toLocaleString('en-US', { timeZone: eventTimezone }))
    const timezoneOffsetMs = utcTime.getTime() - userTime.getTime()
    
    // Apply the timezone offset to convert local time to UTC
    const localDateTime = new Date(localTimeString)
    const utcDateTime = new Date(localDateTime.getTime() + timezoneOffsetMs)
    
    console.log('🕐 Backend timezone conversion debug:', {
      receivedStartTime: eventData.startTime,
      eventTimezone,
      localTimeString,
      localDateTime: localDateTime.toISOString(),
      timezoneOffsetMs: timezoneOffsetMs / (1000 * 60 * 60) + ' hours',
      utcDateTime: utcDateTime.toISOString()
    })
    
    const eventRecord = {
      title: eventData.title.trim(),
      description: eventData.description?.trim() || null,
      game: eventData.game.trim(),
      gaming_platform: eventData.gamingPlatform || 'PC',
      event_type: eventData.eventType || 'casual',
      skill_level: eventData.skillLevel || 'any',
      start_time: utcDateTime.toISOString(),
      end_time: eventData.endTime ? new Date(new Date(eventData.endTime).getTime() + timezoneOffsetMs).toISOString() : null,
      timezone: eventTimezone,
      max_participants: maxParticipants,
      min_participants: eventData.minParticipants || 2,
      require_approval: eventData.requireApproval || false,
      location_type: eventData.locationType || 'online',
      connection_details: eventData.connectionDetails?.trim() || null,
      physical_location: eventData.physicalLocation?.trim() || null,
      is_private: eventData.isPrivate || false,
      allow_spectators: eventData.allowSpectators !== false, // Default to true
      registration_deadline: eventData.registrationDeadline || null,
      status: 'upcoming',
      created_by: profile.id,
      group_id: eventData.groupId || null
    }

    console.log('🎮 Creating event:', {
      title: eventRecord.title,
      game: eventRecord.game,
      startTime: eventRecord.start_time,
      createdBy: eventRecord.created_by
    })

    // Insert the event
    const { data: event, error: insertError } = await supabase
      .from('events')
      .insert([eventRecord])
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating event:', insertError)
      return NextResponse.json(
        { error: 'Failed to create event', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('✅ Event created successfully:', event.id)

    // Create group chat for the event
    try {
      console.log('💬 Creating group chat for event:', event.id)
      
      const chatName = `${event.title} - Event Chat`
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert([{
          name: chatName,
          type: 'group',
          created_by: profile.id,
          is_active: true
        }])
        .select()
        .single()

      if (chatError) {
        console.error('❌ Error creating event chat:', chatError)
        // Don't fail the entire event creation if chat creation fails
      } else {
        console.log('✅ Event chat created successfully:', chat.id)
        
        // Update the event with the chat_id
        const { error: updateError } = await supabase
          .from('events')
          .update({ chat_id: chat.id })
          .eq('id', event.id)

        if (updateError) {
          console.error('❌ Error linking chat to event:', updateError)
        } else {
          console.log('✅ Event linked to chat successfully')
          
          // Add the event creator to the chat
          const { error: participantError } = await supabase
            .from('chat_participants')
            .insert([{
              chat_id: chat.id,
              user_id: profile.id,
              fid: profile.fid,
              is_admin: true,
              joined_at: new Date().toISOString()
            }])

          if (participantError) {
            console.error('❌ Error adding creator to event chat:', participantError)
          } else {
            console.log('✅ Event creator added to chat successfully')
          }
        }
      }
    } catch (chatCreationError) {
      console.error('❌ Unexpected error during chat creation:', chatCreationError)
      // Continue with event creation even if chat fails
    }

    // Send notification for public events (async, don't wait for completion)
    if (!event.is_private) {
      // Construct absolute URL for server-side fetch
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('host') || 'farcaster-gamelink.vercel.app'
      const baseUrl = `${protocol}://${host}`
      
      fetch(`${baseUrl}/api/notifications/event-creation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id
        })
      }).catch(error => {
        console.warn('Failed to send event creation notification:', error)
      })
    }

    return NextResponse.json({
      success: true,
      event: event,
      message: 'Event created successfully!'
    })

  } catch (error) {
    console.error('❌ API Error creating event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const game = searchParams.get('game')
    const eventType = searchParams.get('eventType')
    const status = searchParams.get('status') // Don't default to 'upcoming' - let frontend filter
    const chatId = searchParams.get('chatId')

    console.log(`🎮 API: Fetching events${status ? ` with status: ${status}` : ' (all statuses)'}${chatId ? `, chatId: ${chatId}` : ''}`)

    // Build query for events
    let query = supabase
      .from('events')
      .select('*')

    // If chatId is provided, filter by it (for event chat lookups)
    if (chatId) {
      query = query.eq('chat_id', chatId)
    } else {
      // Only apply other filters if not looking up by chatId
      query = query
        .order('start_time', { ascending: true })
        .range(offset, offset + limit - 1)

      // Add status filter only if specifically requested
      if (status) {
        query = query.eq('status', status)
      }

      // Add filters
      if (game) {
        query = query.ilike('game', `%${game}%`)
      }

      if (eventType) {
        query = query.eq('event_type', eventType)
      }

      // Only show public events for now (TODO: add user-specific filtering)
      query = query.eq('is_private', false)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('❌ Error fetching events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    // Get participant counts for each event
    const eventsWithCounts = await Promise.all(
      (events || []).map(async (event) => {
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', event.id)

        if (participantsError) {
          console.error('Error fetching participants for event:', event.id, participantsError)
        }

        return {
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
          participantCount: participants?.length || 0
        }
      })
    )

    console.log(`✅ API: Successfully fetched ${eventsWithCounts.length} events`)

    return NextResponse.json({
      success: true,
      events: eventsWithCounts,
      count: eventsWithCounts.length
    })

  } catch (error) {
    console.error('❌ API Error fetching events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 