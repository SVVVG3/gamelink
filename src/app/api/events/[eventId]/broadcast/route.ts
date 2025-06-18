import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEventBroadcastNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{
    eventId: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { eventId } = await params
    const { message, title, userFid } = await request.json()

    console.log(`📢 API: Broadcasting message for event ID: ${eventId}`, { userFid, messageLength: message?.length })

    // Validate input
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message must be 500 characters or less' },
        { status: 400 }
      )
    }

    if (!userFid) {
      return NextResponse.json(
        { error: 'User authentication is required' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get user profile to verify authentication
    const { data: profile, error: userError } = await supabase
      .from('profiles')
      .select('id, fid, display_name, username')
      .eq('fid', parseInt(userFid))
      .single()

    if (userError || !profile) {
      console.error('❌ Error fetching user profile:', userError)
      return NextResponse.json(
        { error: 'User not found or not authenticated' },
        { status: 401 }
      )
    }

    // Get event and verify organizer
    const { data: event } = await supabase
      .from('events')
      .select('id, title, created_by, status')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.created_by !== profile.id) {
      return NextResponse.json(
        { error: 'Only event organizers can broadcast messages' },
        { status: 403 }
      )
    }

    // Get all participants for this event (excluding cancelled)
    const { data: participants, error: participantsError } = await supabase
      .from('event_participants')
      .select(`
        id, status,
        profiles!event_participants_user_id_fkey (
          fid, display_name, username
        )
      `)
      .eq('event_id', eventId)
      .neq('status', 'cancelled')

    if (participantsError) {
      console.error('Error fetching participants:', participantsError)
      return NextResponse.json(
        { error: 'Failed to fetch participants' },
        { status: 500 }
      )
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { error: 'No participants found for this event' },
        { status: 404 }
      )
    }

    // Send broadcast notification
    try {
      await sendEventBroadcastNotification(
        eventId,
        event.title,
        title || 'Event Announcement',
        message,
        profile.display_name || profile.username || 'Organizer'
      )
    } catch (notificationError) {
      console.error('Error sending broadcast notification:', notificationError)
      // Don't fail the request if notification fails, just log it
    }

    return NextResponse.json({
      success: true,
      message: 'Broadcast sent successfully',
      recipientCount: participants.length,
      recipients: participants.map((p: any) => ({
        fid: p.profiles?.fid,
        display_name: p.profiles?.display_name,
        username: p.profiles?.username,
        status: p.status
      }))
    })

  } catch (error) {
    console.error('Error in broadcast message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 