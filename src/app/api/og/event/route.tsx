import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const title = searchParams.get('title') || 'Gaming Event'
    const game = searchParams.get('game') || 'Unknown Game'
    const startTime = searchParams.get('startTime') || ''
    const status = searchParams.get('status') || 'initial'
    const organizer = searchParams.get('organizer') || 'GameLink'

    // Format the date
    let formattedDate = ''
    if (startTime) {
      try {
        const date = new Date(startTime)
        formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      } catch (e) {
        formattedDate = 'Date TBD'
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#3b82f6',
            color: 'white',
            fontFamily: 'system-ui',
          }}
        >
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎮</div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
            {title}
          </div>
          <div style={{ fontSize: '32px', marginBottom: '20px' }}>
            {game}
          </div>
          {formattedDate && (
            <div style={{ fontSize: '24px', marginBottom: '20px' }}>
              {formattedDate}
            </div>
          )}
          <div style={{ fontSize: '20px' }}>
            by {organizer}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 800,
      }
    )
  } catch (e) {
    console.error('Error generating OG image:', e)
    return new Response(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, { status: 500 })
  }
} 