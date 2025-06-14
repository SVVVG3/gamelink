import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'

export async function GET() {
  try {
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'NEYNAR_API_KEY not configured' }, { status: 500 })
    }

    const client = new NeynarAPIClient({ apiKey })
    
    // Fetch all notification tokens for our app
    const response = await client.fetchNotificationTokens({
      limit: 100
    })
    
    console.log('🔍 Debug: All notification tokens for app:', response)
    
    return NextResponse.json({
      success: true,
      totalTokens: response.notification_tokens?.length || 0,
      tokens: response.notification_tokens?.map(token => ({
        fid: token.fid,
        status: token.status,
        created_at: token.created_at,
        token_preview: token.token?.substring(0, 10) + '...'
      })) || [],
      rawResponse: response
    })
    
  } catch (error) {
    console.error('❌ Error fetching notification tokens:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch tokens',
      success: false
    }, { status: 500 })
  }
} 