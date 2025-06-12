import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, type FarcasterUser } from '../../../../lib/farcaster';
import { createClient } from '../../../../lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json();
    
    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { error: 'Valid FID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Get user data from Farcaster via Neynar
    const farcasterUser = await getUserProfile(fid);
    if (!farcasterUser) {
      return NextResponse.json(
        { error: 'Failed to fetch Farcaster user data' },
        { status: 400 }
      );
    }
    
    // Create or get existing user in Supabase
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      return NextResponse.json(
        { error: 'Failed to create user session' },
        { status: 500 }
      );
    }
    
    // Store/update Farcaster profile data
    await upsertFarcasterProfile(supabase, farcasterUser);
    
    return NextResponse.json({
      user: data.user,
      farcasterUser,
      success: true
    });
    
  } catch (error) {
    console.error('Farcaster context auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to upsert Farcaster profile
async function upsertFarcasterProfile(supabase: Awaited<ReturnType<typeof createClient>>, farcasterUser: FarcasterUser) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      fid: farcasterUser.fid,
      username: farcasterUser.username,
      display_name: farcasterUser.displayName,
      pfp_url: farcasterUser.pfpUrl,
      bio: farcasterUser.bio,
      follower_count: farcasterUser.followerCount,
      following_count: farcasterUser.followingCount,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'fid'
    });

  if (error) {
    console.error('Error upserting profile:', error);
    throw error;
  }
} 