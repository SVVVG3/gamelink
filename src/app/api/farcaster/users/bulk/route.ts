import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'

const client = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const { fids } = await request.json()
    
    if (!fids || !Array.isArray(fids) || fids.length === 0) {
      return NextResponse.json({ error: 'FIDs array is required' }, { status: 400 })
    }

    console.log('🔍 API: Fetching bulk user profiles for', fids.length, 'FIDs')
    
    // Fetch user profiles from Neynar
    const response = await client.fetchBulkUsers({ fids })
    
    // Transform the response to a more convenient format
    const users: Record<number, {
      fid: number
      username: string
      display_name?: string
      pfp_url?: string
      bio?: string
    }> = {}
    
    response.users.forEach(user => {
      users[user.fid] = {
        fid: user.fid,
        username: user.username,
        display_name: user.display_name,
        pfp_url: user.pfp_url,
        bio: user.profile?.bio?.text
      }
    })
    
    console.log('✅ API: Successfully fetched', Object.keys(users).length, 'user profiles')
    
    return NextResponse.json({ users })
    
  } catch (error) {
    console.error('❌ Error in bulk users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 