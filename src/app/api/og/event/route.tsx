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

    // Create HTML page that generates an image
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              margin: 0;
              padding: 0;
              width: 1200px;
              height: 800px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              font-family: Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              width: 1040px;
              height: 640px;
              background: rgba(255,255,255,0.95);
              border-radius: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 40px;
              box-sizing: border-box;
            }
            .header {
              font-size: 48px;
              font-weight: bold;
              color: #2d3748;
              margin-bottom: 40px;
            }
            .title {
              font-size: 36px;
              font-weight: 600;
              color: #4a5568;
              margin-bottom: 30px;
              max-width: 800px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .game {
              font-size: 28px;
              color: #718096;
              margin-bottom: 20px;
            }
            .date, .time {
              font-size: 24px;
              color: #718096;
              margin-bottom: 15px;
            }
            .organizer {
              font-size: 20px;
              color: #a0aec0;
              margin-bottom: 40px;
            }
            .cta {
              background: #667eea;
              color: white;
              padding: 15px 40px;
              border-radius: 30px;
              font-size: 24px;
              font-weight: 600;
              border: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">🎮 GameLink Event</div>
            <div class="title">${event.title}</div>
            <div class="game">Game: ${event.game || 'TBD'}</div>
            <div class="date">📅 ${new Date(event.start_time).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
            <div class="time">🕐 ${new Date(event.start_time).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              timeZoneName: 'short'
            })}</div>
            <div class="organizer">Organized by ${event.profiles?.display_name || event.profiles?.username || 'Anonymous'}</div>
            <div class="cta">Join Event</div>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, immutable, no-transform, max-age=300',
      },
    });

  } catch (error) {
    console.error('Error generating event OG image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 