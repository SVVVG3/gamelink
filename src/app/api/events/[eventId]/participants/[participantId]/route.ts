import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    eventId: string
    participantId: string
  }>
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { eventId, participantId } = await params
    const { status, score, placement, userFid, updateType } = await request.json()

    console.log(`🎮 API: Updating participant for ID: ${participantId}`, { 
      status, score, placement, userFid, updateType 
    })

    // Validate status if provided
    if (status) {
      const validStatuses = ['registered', 'confirmed', 'attended', 'no_show', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
          { status: 400 }
        )
      }
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
      .select('id, fid, username')
      .eq('fid', parseInt(userFid))
      .single()

    if (userError || !profile) {
      console.error('❌ Error fetching user profile:', userError)
      return NextResponse.json(
        { error: 'User not found or not authenticated' },
        { status: 401 }
      )
    }

    // Verify user is the event organizer
    const { data: event } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.created_by !== profile.id) {
      return NextResponse.json(
        { error: 'Only event organizers can update participant status' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    // Add fields that are being updated
    if (status !== undefined) updateData.status = status
    if (score !== undefined) updateData.score = score
    if (placement !== undefined) updateData.placement = placement

    // Update participant
    const { data: updatedParticipant, error } = await supabase
      .from('event_participants')
      .update(updateData)
      .eq('id', participantId)
      .eq('event_id', eventId)
      .select(`
        id, status, role, score, placement, created_at, updated_at,
        profiles!event_participants_user_id_fkey (
          fid, display_name, username, pfp_url
        )
      `)
      .single()

    if (error) {
      console.error('Error updating participant:', error)
      return NextResponse.json(
        { error: 'Failed to update participant' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      participant: updatedParticipant
    })

  } catch (error) {
    console.error('Error in participant update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 