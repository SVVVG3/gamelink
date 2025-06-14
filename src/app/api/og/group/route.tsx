import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const name = searchParams.get('name') || 'Gaming Group'
    const description = searchParams.get('description') || 'Join our gaming community!'
    const memberCount = searchParams.get('memberCount') || '0'
    const creator = searchParams.get('creator') || 'GameLink'

    // Create SVG image
    const svg = `
      <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="800" fill="url(#bg)"/>
        
        <!-- Content -->
        <text x="600" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="60" font-weight="bold">👥 GameLink</text>
        
        <text x="600" y="300" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">${name}</text>
        
        <text x="600" y="380" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24">${description}</text>
        
        <text x="600" y="450" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28">${memberCount} ${parseInt(memberCount) === 1 ? 'Member' : 'Members'}</text>
        
        <text x="600" y="550" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="20">by ${creator}</text>
        
        <text x="600" y="650" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28">🎮 Join the Squad!</text>
      </svg>
    `

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, immutable, no-transform, max-age=31536000',
      },
    })
  } catch (e) {
    console.error('Error generating group OG image:', e)
    return new Response(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, { status: 500 })
  }
} 