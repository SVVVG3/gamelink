import { NextRequest, NextResponse } from 'next/server'
import { sendFarcasterNotification } from '@/lib/supabase/notifications'

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json()
    
    if (!fid) {
      return NextResponse.json({ error: 'FID is required' }, { status: 400 })
    }

    console.log(`🧪 Testing notification system for FID: ${fid}`)
    
    const result = await sendFarcasterNotification(
      [fid],
      "🎮 GameLink Test Notification",
      "Testing the complete notification system - if you see this, everything works!",
      "https://farcaster-gamelink.vercel.app",
      `test-system-${Date.now()}`
    )
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Notification sent successfully' : 'Failed to send notification',
      details: result.results || result.error,
      fid
    })
    
  } catch (error: any) {
    console.error('❌ Error testing notification system:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 