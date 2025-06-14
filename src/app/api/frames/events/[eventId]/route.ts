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
    const { eventId } = await params;

    // Fetch event data
    const supabase = await createClient()
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles:organizer_fid (
          display_name,
          username
        )
      `)
      .eq('id', eventId)
      .single();

    if (error || !event) {
      return new NextResponse('Event not found', { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gamelink-app.vercel.app';
    
    // Create Mini App Embed JSON
    const frameEmbed = {
      version: "next",
      imageUrl: `${baseUrl}/api/og/event?eventId=${eventId}`,
      button: {
        title: "🎮 Join Event",
        action: {
          type: "launch_frame",
          url: `${baseUrl}/events/${eventId}`,
          name: "GameLink",
          splashImageUrl: `${baseUrl}/logo.png`,
          splashBackgroundColor: "#667eea"
        }
      }
    };

    // Generate HTML with Mini App Embed meta tag
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${event.title} - GameLink Event</title>
          <meta name="description" content="Join ${event.title} on GameLink - ${event.game ? `Playing ${event.game}` : 'Gaming event'} organized by ${event.profiles?.display_name || event.profiles?.username || 'GameLink'}">
          
          <!-- Mini App Embed -->
          <meta name="fc:frame" content='${JSON.stringify(frameEmbed)}' />
          
          <!-- Open Graph fallback -->
          <meta property="og:title" content="${event.title} - GameLink Event" />
          <meta property="og:description" content="Join ${event.title} on GameLink - ${event.game ? `Playing ${event.game}` : 'Gaming event'}" />
          <meta property="og:image" content="${baseUrl}/api/og/event?eventId=${eventId}" />
          <meta property="og:url" content="${baseUrl}/events/${eventId}" />
          <meta property="og:type" content="website" />
          
          <!-- Twitter Card -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${event.title} - GameLink Event" />
          <meta name="twitter:description" content="Join ${event.title} on GameLink" />
          <meta name="twitter:image" content="${baseUrl}/api/og/event?eventId=${eventId}" />
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>🎮 ${event.title}</h1>
            <p><strong>Game:</strong> ${event.game || 'TBD'}</p>
            <p><strong>Date:</strong> ${new Date(event.event_date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date(event.event_date).toLocaleTimeString()}</p>
            <p><strong>Organizer:</strong> ${event.profiles?.display_name || event.profiles?.username || 'Anonymous'}</p>
            ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
            <a href="${baseUrl}/events/${eventId}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">
              Join Event on GameLink
            </a>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300',
      },
    });

  } catch (error) {
    console.error('Error generating event frame:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
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