import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { fids } = await request.json()
    
    if (!fids || !Array.isArray(fids) || fids.length === 0) {
      return NextResponse.json({ error: 'FIDs array is required' }, { status: 400 })
    }

    console.log('🎮 API: Fetching gamertags for', fids.length, 'FIDs')
    
    const supabase = await createClient()
    
    // Fetch gamertags for all provided FIDs by joining with profiles
    const { data: gamertags, error } = await supabase
      .from('gamertags')
      .select(`
        platform,
        gamertag,
        is_public,
        profiles!inner(fid)
      `)
      .in('profiles.fid', fids)
      .order('platform')

    if (error) {
      console.error('❌ Error fetching gamertags:', error)
      return NextResponse.json({ error: 'Failed to fetch gamertags' }, { status: 500 })
    }

    // Group gamertags by FID
    const gamertagsByFid: Record<number, Array<{
      platform: string
      handle: string
      is_public?: boolean
    }>> = {}

    // Initialize all FIDs with empty arrays
    fids.forEach(fid => {
      gamertagsByFid[fid] = []
    })

    // Group the gamertags
    gamertags?.forEach((gamertag: any) => {
      const fid = gamertag.profiles.fid
      if (!gamertagsByFid[fid]) {
        gamertagsByFid[fid] = []
      }
      gamertagsByFid[fid].push({
        platform: gamertag.platform,
        handle: gamertag.gamertag,
        is_public: gamertag.is_public
      })
    })

    const totalWithGamertags = Object.values(gamertagsByFid).filter(tags => tags.length > 0).length
    console.log('✅ API: Found gamertags for', totalWithGamertags, 'out of', fids.length, 'users')

    return NextResponse.json(gamertagsByFid)
    
  } catch (error) {
    console.error('❌ Error in bulk gamertags API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 