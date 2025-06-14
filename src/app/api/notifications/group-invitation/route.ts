import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGroupInvitationNotification } from '@/lib/notifications-neynar'

export async function POST(request: NextRequest) {
  try {
    const { invitationId } = await request.json()
    
    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    console.log(`📱 Processing group invitation notification for ID: ${invitationId} via Neynar`)
    
    const supabase = await createClient()
    
    // Get invitation details with group and inviter info
    const { data: invitation, error: invitationError } = await supabase
      .from('group_invitations')
      .select(`
        id,
        group_id,
        inviter_id,
        invitee_id,
        groups!group_invitations_group_id_fkey (
          id,
          name
        ),
        inviter:profiles!group_invitations_inviter_id_fkey (
          fid,
          display_name,
          username
        ),
        invitee:profiles!group_invitations_invitee_id_fkey (
          fid,
          display_name,
          username
        )
      `)
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      console.error('Error fetching invitation:', invitationError)
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const group = invitation.groups?.[0]
    const inviterProfile = invitation.inviter?.[0]
    const inviteeProfile = invitation.invitee?.[0]

    if (!group || !inviterProfile || !inviteeProfile) {
      console.error('Missing required data for invitation notification')
      return NextResponse.json(
        { error: 'Incomplete invitation data' },
        { status: 400 }
      )
    }

    const inviterName = inviterProfile.display_name || 
                       inviterProfile.username || 
                       `User ${inviterProfile.fid}`

    // Send notification via Neynar to the invitee
    const result = await sendGroupInvitationNotification(
      inviteeProfile.fid,
      group.name,
      group.id,
      inviterName
    )
    
    if (result.success) {
      console.log(`✅ Group invitation notification sent via Neynar for invitation ${invitationId}`)
      return NextResponse.json(
        { message: 'Group invitation notification sent successfully via Neynar', invitationId },
        { status: 200 }
      )
    } else {
      console.error('Failed to send group invitation notification via Neynar:', result.error)
      return NextResponse.json(
        { error: 'Failed to send notification', details: result.error },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in group invitation notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 