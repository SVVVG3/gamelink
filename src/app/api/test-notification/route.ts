import { NextRequest, NextResponse } from 'next/server'
import { sendFarcasterNotification } from '@/lib/supabase/notifications'

export async function POST(request: NextRequest) {
  try {
    const { fids, title, body, targetUrl, notificationId } = await request.json()
    
    console.log('🧪 Testing Farcaster notification API with:', {
      fids,
      title,
      body,
      targetUrl,
      notificationId
    })
    
    const result = await sendFarcasterNotification(
      fids,
      title,
      body,
      targetUrl,
      notificationId
    )
    
    return NextResponse.json({
      success: result.success,
      results: result.results,
      error: result.error
    })
    
  } catch (error: any) {
    console.error('❌ Error in test notification endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test notification endpoint',
    usage: 'POST with { fids: number[], title: string, body: string, targetUrl: string, notificationId: string }'
  })
} 