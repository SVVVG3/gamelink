import { NextRequest, NextResponse } from 'next/server'
import { getMutualFollowers, refreshMutualFollowers } from '../../../../lib/farcaster'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fidParam = searchParams.get('fid')
    const useCache = searchParams.get('useCache') !== 'false'

    if (!fidParam) {
      return NextResponse.json(
        { error: 'FID parameter is required' },
        { status: 400 }
      )
    }

    const fid = parseInt(fidParam)
    if (isNaN(fid) || fid <= 0) {
      return NextResponse.json(
        { error: 'Invalid FID parameter' },
        { status: 400 }
      )
    }

    console.log(`🔍 API: Fetching mutual followers for FID ${fid}, useCache: ${useCache}`)

    const mutualFollowers = useCache 
      ? await getMutualFollowers(fid)
      : await refreshMutualFollowers(fid)

    console.log(`✅ API: Successfully fetched ${mutualFollowers.length} mutual followers`)

    return NextResponse.json({
      success: true,
      data: mutualFollowers,
      fid,
      useCache,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ API: Error fetching mutual followers:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch mutual followers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fid } = body

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required in request body' },
        { status: 400 }
      )
    }

    if (isNaN(fid) || fid <= 0) {
      return NextResponse.json(
        { error: 'Invalid FID' },
        { status: 400 }
      )
    }

    console.log(`🔄 API: Refreshing mutual followers for FID ${fid}`)

    const mutualFollowers = await refreshMutualFollowers(fid)

    console.log(`✅ API: Successfully refreshed ${mutualFollowers.length} mutual followers`)

    return NextResponse.json({
      success: true,
      data: mutualFollowers,
      fid,
      refreshed: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ API: Error refreshing mutual followers:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to refresh mutual followers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 