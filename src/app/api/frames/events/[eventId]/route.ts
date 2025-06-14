import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = await createClient()
    
    // Parse the frame action data
    const body = await request.json()
    const { untrustedData } = body
    
    if (!untrustedData?.fid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 400 }
      )
    }

    const userFid = untrustedData.fid
    
    // Get the event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        profiles!events_created_by_fkey (
          id,
          fid,
          username,
          display_name,
          pfp_url
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get or create user profile
    let { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, fid, username')
      .eq('fid', userFid)
      .single()

    if (profileError || !userProfile) {
      // If profile doesn't exist, we can't proceed with RSVP
      // Return a frame that prompts them to sign up first
      return NextResponse.json({
        type: 'frame',
        data: {
          version: 'next',
          image: generateEventImage(event, 'signup_required'),
          buttons: [
            {
              label: '🎮 Sign Up for GameLink',
              action: 'link',
              target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/auth/login`
            }
          ]
        }
      })
    }

    // Check if user is already participating
    const { data: existingParticipation } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('profile_id', userProfile.id)
      .single()

    // Handle the action based on button pressed
    const buttonIndex = untrustedData.buttonIndex || 1
    
    if (buttonIndex === 1) {
      // Join/Leave Event button
      if (existingParticipation) {
        // User is already participating - remove them
        const { error: deleteError } = await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('profile_id', userProfile.id)

        if (deleteError) {
          return NextResponse.json(
            { error: 'Failed to leave event' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          type: 'frame',
          data: {
            version: 'next',
            image: generateEventImage(event, 'left'),
            buttons: [
              {
                label: '🎮 Join Event',
                action: 'post'
              },
              {
                label: '📅 View Details',
                action: 'link',
                target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/events/${eventId}`
              }
            ]
          }
        })
      } else {
        // User is not participating - add them
        const { error: insertError } = await supabase
          .from('event_participants')
          .insert([{
            event_id: eventId,
            profile_id: userProfile.id,
            role: 'participant',
            status: event.require_approval ? 'pending' : 'confirmed'
          }])

        if (insertError) {
          return NextResponse.json(
            { error: 'Failed to join event' },
            { status: 500 }
          )
        }

        const status = event.require_approval ? 'pending' : 'joined'
        return NextResponse.json({
          type: 'frame',
          data: {
            version: 'next',
            image: generateEventImage(event, status),
            buttons: [
              {
                label: '❌ Leave Event',
                action: 'post'
              },
              {
                label: '📅 View Details',
                action: 'link',
                target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/events/${eventId}`
              }
            ]
          }
        })
      }
    } else if (buttonIndex === 2) {
      // View Details button - redirect to app
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/events/${eventId}`
      )
    }

    // Default response - show event details
    return NextResponse.json({
      type: 'frame',
      data: {
        version: 'next',
        image: generateEventImage(event, existingParticipation ? 'participating' : 'not_participating'),
        buttons: [
          {
            label: existingParticipation ? '❌ Leave Event' : '🎮 Join Event',
            action: 'post'
          },
          {
            label: '📅 View Details',
            action: 'link',
            target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/events/${eventId}`
          }
        ]
      }
    })

  } catch (error) {
    console.error('Frame action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = await createClient()
    
    // Get the event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        profiles!events_created_by_fkey (
          id,
          fid,
          username,
          display_name,
          pfp_url
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Return initial frame
    return NextResponse.json({
      type: 'frame',
      data: {
        version: 'next',
        image: generateEventImage(event, 'initial'),
        buttons: [
          {
            label: '🎮 Join Event',
            action: 'post'
          },
          {
            label: '📅 View Details',
            action: 'link',
            target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/events/${eventId}`
          }
        ]
      }
    })

  } catch (error) {
    console.error('Frame GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateEventImage(event: any, status: string): string {
  // Generate a dynamic image URL for the event frame
  // This would typically use a service like Vercel OG or a custom image generation endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'
  
  const params = new URLSearchParams({
    title: event.title,
    game: event.game,
    startTime: event.start_time,
    status: status,
    organizer: event.profiles?.display_name || event.profiles?.username || 'Unknown'
  })
  
  return `${baseUrl}/api/og/event?${params.toString()}`
} 