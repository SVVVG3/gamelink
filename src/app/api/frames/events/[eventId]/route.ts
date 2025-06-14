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
      const frameHtml = generateFrameHtml(event, 'signup_required', eventId)
      return new Response(frameHtml, {
        headers: {
          'Content-Type': 'text/html',
        },
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

        const frameHtml = generateFrameHtml(event, 'left', eventId)
        return new Response(frameHtml, {
          headers: {
            'Content-Type': 'text/html',
          },
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
        const frameHtml = generateFrameHtml(event, status, eventId)
        return new Response(frameHtml, {
          headers: {
            'Content-Type': 'text/html',
          },
        })
      }
    } else if (buttonIndex === 2) {
      // View Details button - redirect to app
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/events/${eventId}`
      )
    }

    // Default response - show event details
    const status = existingParticipation ? 'participating' : 'not_participating'
    const frameHtml = generateFrameHtml(event, status, eventId)
    return new Response(frameHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
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

    // Return initial frame as HTML with meta tags
    const frameHtml = generateFrameHtml(event, 'initial', eventId)
    return new Response(frameHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
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

function generateFrameHtml(event: any, status: string, eventId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'
  const imageUrl = generateEventImage(event, status)
  const frameUrl = `${baseUrl}/api/frames/events/${eventId}`
  
  // Determine button configuration based on status
  let button1Content = '🎮 Join Event'
  let button1Action = 'post'
  let button1Target = ''
  
  if (status === 'signup_required') {
    button1Content = '🎮 Sign Up for GameLink'
    button1Action = 'link'
    button1Target = `${baseUrl}/auth/login`
  } else if (status === 'joined' || status === 'participating') {
    button1Content = '❌ Leave Event'
  } else if (status === 'left') {
    button1Content = '🎮 Join Event'
  }
  
  const button1Meta = button1Action === 'link' 
    ? `<meta property="fc:frame:button:1:action" content="link" />
  <meta property="fc:frame:button:1:target" content="${button1Target}" />`
    : ''
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${event.title} - GameLink Event</title>
  
  <!-- Frame metadata -->
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:post_url" content="${frameUrl}" />
  <meta property="fc:frame:button:1" content="${button1Content}" />
  ${button1Meta}
  <meta property="fc:frame:button:2" content="📅 View Details" />
  <meta property="fc:frame:button:2:action" content="link" />
  <meta property="fc:frame:button:2:target" content="${baseUrl}/events/${eventId}" />
  
  <!-- Open Graph metadata -->
  <meta property="og:title" content="${event.title}" />
  <meta property="og:description" content="Join this gaming event on GameLink!" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:url" content="${baseUrl}/events/${eventId}" />
</head>
<body>
  <h1>${event.title}</h1>
  <p>Game: ${event.game}</p>
  <p>Join this event on GameLink!</p>
  <a href="${baseUrl}/events/${eventId}">View Event Details</a>
</body>
</html>`
} 