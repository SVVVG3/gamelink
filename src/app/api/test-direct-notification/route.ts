import { NextRequest, NextResponse } from 'next/server'
import { sendFarcasterNotification } from '@/lib/supabase/notifications'

export async function POST(request: NextRequest) {
  try {
    const { fid, title, body, targetUrl } = await request.json()
    
    if (!fid || !title || !body) {
      return NextResponse.json(
        { error: 'FID, title, and body are required' },
        { status: 400 }
      )
    }

    console.log(`📱 Testing direct notification for FID: ${fid}`)
    
    const result = await sendFarcasterNotification(
      [fid], // Array of FIDs
      title,
      body,
      targetUrl || 'https://farcaster-gamelink.vercel.app',
      `test-${Date.now()}` // Unique notification ID
    )
    
    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (error: any) {
    console.error('Error in direct notification test:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 