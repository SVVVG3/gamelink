import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEventNotification } from '@/lib/notifications-neynar'

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json()
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    console.log(`📱 Processing event creation notification for ID: ${eventId} via Neynar`)
    
    const supabase = await createClient()
    
    // Get event details with creator info
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        created_by,
        is_private,
        profiles!events_created_by_fkey (
          fid,
          display_name,
          username
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      console.error('Error fetching event:', eventError)
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Only send notifications for public events
    if (event.is_private) {
      console.log('ℹ️ Skipping notification for private event')
      return NextResponse.json(
        { message: 'Private event - no notification sent', eventId },
        { status: 200 }
      )
    }

    // Fix: profiles is an object, not an array
    const creatorProfile = event.profiles as any
    const creatorName = creatorProfile?.display_name || 
                       creatorProfile?.username || 
                       `User ${creatorProfile?.fid}`

    console.log('📊 Event creator info:', {
      event_id: event.id,
      event_title: event.title,
      creator_fid: creatorProfile?.fid,
      creator_name: creatorName,
      creator_profile_debug: creatorProfile
    })

    // Send notification via Neynar with mutual follower filtering
    const result = await sendEventNotification(
      event.title,
      event.description || '',
      event.id,
      creatorName,
      {
        following_fid: creatorProfile?.fid // Only send to mutual followers of the creator
      }
    )
    
    if (result.success) {
      console.log(`✅ Event creation notification sent via Neynar for event ${eventId}`)
      return NextResponse.json(
        { message: 'Event creation notification sent successfully via Neynar', eventId },
        { status: 200 }
      )
    } else {
      console.error('Failed to send event creation notification via Neynar:', result.error)
      return NextResponse.json(
        { error: 'Failed to send notification', details: result.error },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in event creation notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 