import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    console.log(`🧪 Testing Farcaster API with token: ${token}`)
    
    const payload = {
      notificationId: `test-${Date.now()}`,
      title: "🎮 GameLink Test",
      body: "Testing direct Farcaster API call",
      targetUrl: "https://farcaster-gamelink.vercel.app",
      tokens: [token]
    }
    
    console.log(`📡 Sending payload:`, payload)
    
    const response = await fetch('https://api.farcaster.xyz/v1/frame-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    const responseText = await response.text()
    console.log(`📥 Raw response (${response.status}):`, responseText)
    
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { rawText: responseText }
    }
    
    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData
    })
    
  } catch (error: any) {
    console.error('❌ Error testing Farcaster API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 