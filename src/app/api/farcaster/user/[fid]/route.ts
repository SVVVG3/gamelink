import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'

const client = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY! })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid: fidParam } = await params
    const fid = parseInt(fidParam)
    
    if (!fid || isNaN(fid)) {
      return NextResponse.json(
        { error: 'Invalid FID provided' },
        { status: 400 }
      )
    }

    console.log('🔍 API: Fetching user profile for FID:', fid)

    // Fetch user profile from Neynar
    const response = await client.fetchBulkUsers({ fids: [fid] })
    
    if (!response.users || response.users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = response.users[0]
    
    // Return formatted user data
    const userData = {
      fid: user.fid,
      username: user.username,
      display_name: user.display_name,
      displayName: user.display_name, // Add camelCase version for compatibility
      bio: user.profile?.bio?.text || '',
      pfp_url: user.pfp_url,
      pfpUrl: user.pfp_url, // Add camelCase version for compatibility
      follower_count: user.follower_count,
      following_count: user.following_count,
      verified_addresses: user.verified_addresses
    }

    console.log('✅ API: Successfully fetched user profile for:', user.username)

    return NextResponse.json(userData)
  } catch (error) {
    console.error('❌ API: Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
} 