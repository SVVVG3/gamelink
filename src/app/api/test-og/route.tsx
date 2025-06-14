import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 128,
            background: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Hello world!
        </div>
      ),
      {
        width: 1200,
        height: 800,
      },
    )
  } catch (e) {
    console.error('Test OG error:', e)
    return new Response(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, { status: 500 })
  }
} 