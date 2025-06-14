import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return new NextResponse('Event ID is required', { status: 400 });
    }

    // Fetch event data
    const supabase = await createClient();
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

    // Create a simple PNG using a data URL approach
    const canvas = `
      <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="800" fill="url(#bg)"/>
        
        <!-- Content Container -->
        <rect x="80" y="80" width="1040" height="640" fill="rgba(255,255,255,0.95)" rx="20"/>
        
        <!-- Header -->
        <text x="600" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#2d3748">
          🎮 GameLink Event
        </text>
        
        <!-- Event Title -->
        <text x="600" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="600" fill="#4a5568">
          ${event.title.length > 40 ? event.title.substring(0, 40) + '...' : event.title}
        </text>
        
        <!-- Game -->
        <text x="600" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#718096">
          Game: ${event.game || 'TBD'}
        </text>
        
        <!-- Date -->
        <text x="600" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#718096">
          📅 ${new Date(event.event_date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </text>
        
        <!-- Time -->
        <text x="600" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#718096">
          🕐 ${new Date(event.event_date).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            timeZoneName: 'short'
          })}
        </text>
        
        <!-- Organizer -->
        <text x="600" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#a0aec0">
          Organized by ${event.profiles?.display_name || event.profiles?.username || 'Anonymous'}
        </text>
        
        <!-- CTA -->
        <rect x="450" y="580" width="300" height="60" fill="#667eea" rx="30"/>
        <text x="600" y="620" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="600" fill="white">
          Join Event
        </text>
      </svg>
    `;

    return new NextResponse(canvas, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, immutable, no-transform, max-age=300',
      },
    });

  } catch (error) {
    console.error('Error generating event OG image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 