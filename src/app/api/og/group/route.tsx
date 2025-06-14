import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const name = searchParams.get('name') || 'Gaming Group'
    const description = searchParams.get('description') || 'Join our gaming community!'
    const memberCount = searchParams.get('memberCount') || '0'
    const status = searchParams.get('status') || 'initial'
    const creator = searchParams.get('creator') || 'GameLink'

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
            background: '#8b5cf6',
            color: 'white',
            fontFamily: 'system-ui',
          }}
        >
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>👥</div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
            {name}
          </div>
          <div style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>
            {description}
          </div>
          <div style={{ fontSize: '28px', marginBottom: '20px' }}>
            {memberCount} {parseInt(memberCount) === 1 ? 'Member' : 'Members'}
          </div>
          <div style={{ fontSize: '20px' }}>
            by {creator}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 800,
      }
    )
  } catch (e) {
    console.error('Error generating group OG image:', e)
    return new Response(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, { status: 500 })
  }
} 