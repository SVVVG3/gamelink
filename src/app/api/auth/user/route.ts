import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(null);
    }
    
    // Try to get the user's Farcaster profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    return NextResponse.json({
      user,
      farcasterUser: profile || null
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(null);
  }
} 