import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params
    const { userFid } = await request.json()

    if (!userFid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, fid')
      .eq('fid', userFid)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is in the chat
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('id, is_admin')
      .eq('chat_id', chatId)
      .eq('user_id', profile.id)
      .is('left_at', null)
      .single()

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'User is not a member of this chat' },
        { status: 404 }
      )
    }

    // Update the participant record to mark as left
    const { error: leaveError } = await supabase
      .from('chat_participants')
      .update({ 
        left_at: new Date().toISOString() 
      })
      .eq('id', participant.id)

    if (leaveError) {
      console.error('Error leaving chat:', leaveError)
      return NextResponse.json(
        { error: 'Failed to leave chat' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left the chat'
    })

  } catch (error) {
    console.error('Error in leave chat API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 