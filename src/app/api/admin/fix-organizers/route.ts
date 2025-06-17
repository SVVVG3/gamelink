import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/fix-organizers
 * Admin endpoint to fix existing events by adding organizers as participants
 * This fixes the issue where organizers created events before the automatic participant addition was implemented
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Admin: Starting organizer fix process...')

    const supabase = await createClient()

    // Get all events where the organizer is not yet a participant
    const { data: eventsNeedingFix, error: fetchError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        created_by,
        profiles!events_created_by_fkey (
          id,
          fid,
          username,
          display_name
        )
      `)

    if (fetchError) {
      console.error('❌ Error fetching events:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch events', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!eventsNeedingFix || eventsNeedingFix.length === 0) {
      return NextResponse.json({
        message: 'No events found',
        fixed: 0
      })
    }

    console.log(`🔍 Found ${eventsNeedingFix.length} events to check`)

    let fixedCount = 0
    let alreadyFixedCount = 0
    const errors = []

    for (const event of eventsNeedingFix) {
      try {
        // Check if organizer is already a participant
        const { data: existingParticipation, error: checkError } = await supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', event.created_by)
          .single()

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error(`❌ Error checking participation for event ${event.id}:`, checkError)
          errors.push(`Event ${event.id}: ${checkError.message}`)
          continue
        }

        if (existingParticipation) {
          console.log(`✅ Event "${event.title}" (${event.id}) - organizer already a participant`)
          alreadyFixedCount++
          continue
        }

        // Add organizer as participant
        const organizerProfile = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles
        const { error: insertError } = await supabase
          .from('event_participants')
          .insert([{
            event_id: event.id,
            user_id: event.created_by,
            fid: organizerProfile.fid,
            role: 'organizer',
            status: 'confirmed',
            registered_at: new Date().toISOString()
          }])

        if (insertError) {
          console.error(`❌ Error adding organizer for event ${event.id}:`, insertError)
          errors.push(`Event ${event.id}: ${insertError.message}`)
          continue
        }

        console.log(`✅ Fixed event "${event.title}" (${event.id}) - added organizer as participant`)
        fixedCount++

      } catch (eventError) {
        console.error(`❌ Unexpected error processing event ${event.id}:`, eventError)
        errors.push(`Event ${event.id}: ${eventError}`)
      }
    }

    const result = {
      success: true,
      message: `Organizer fix process completed`,
      totalEvents: eventsNeedingFix.length,
      fixed: fixedCount,
      alreadyFixed: alreadyFixedCount,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined
    }

    console.log('🎯 Admin: Organizer fix results:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Admin: Error in organizer fix process:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 