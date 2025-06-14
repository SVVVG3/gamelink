import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const title = searchParams.get('title') || 'Gaming Event'
    const game = searchParams.get('game') || 'Unknown Game'
    const startTime = searchParams.get('startTime') || ''
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

    // Create SVG image
    const svg = `
      <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="800" fill="url(#bg)"/>
        
        <!-- Content -->
        <text x="600" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="60" font-weight="bold">🎮 GameLink</text>
        
        <text x="600" y="300" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">${title}</text>
        
        <text x="600" y="380" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32">${game}</text>
        
        ${formattedDate ? `<text x="600" y="450" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24">${formattedDate}</text>` : ''}
        
        <text x="600" y="550" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="20">by ${organizer}</text>
        
        <text x="600" y="650" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28">🎮 Join the Action!</text>
      </svg>
    `

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, immutable, no-transform, max-age=31536000',
      },
    })
  } catch (e) {
    console.error('Error generating OG image:', e)
    return new Response(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, { status: 500 })
  }
} 