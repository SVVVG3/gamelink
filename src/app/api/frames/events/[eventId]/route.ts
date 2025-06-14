import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  // Mini App Embeds don't use POST actions like traditional Frames
  // They launch the Mini App directly, so we redirect to the event page
  const { eventId } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'
  
  return NextResponse.redirect(`${baseUrl}/events/${eventId}`)
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
  
  // Create Mini App Embed JSON according to the specification
  const miniAppEmbed = {
    version: "next",
    imageUrl: imageUrl,
    button: {
      title: "🎮 Join Event",
      action: {
        type: "launch_frame",
        name: "GameLink",
        url: `${baseUrl}/events/${eventId}`,
        splashImageUrl: `${baseUrl}/logo.png`,
        splashBackgroundColor: "#1a1a1a"
      }
    }
  }
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${event.title} - GameLink Event</title>
  
  <!-- Mini App Embed metadata -->
  <meta name="fc:frame" content='${JSON.stringify(miniAppEmbed)}' />
  
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