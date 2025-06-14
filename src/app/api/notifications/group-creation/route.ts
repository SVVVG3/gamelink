import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGroupCreationNotification } from '@/lib/notifications-neynar'

export async function POST(request: NextRequest) {
  try {
    const { groupId } = await request.json()
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      )
    }

    console.log(`📱 Processing group creation notification for ID: ${groupId} via Neynar`)
    
    const supabase = await createClient()
    
    // Get group details with creator info
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        description,
        created_by,
        is_private,
        profiles!groups_created_by_fkey (
          fid,
          display_name,
          username
        )
      `)
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      console.error('Error fetching group:', groupError)
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Only send notifications for public groups
    if (group.is_private) {
      console.log('ℹ️ Skipping notification for private group')
      return NextResponse.json(
        { message: 'Private group - no notification sent', groupId },
        { status: 200 }
      )
    }

    // Fix: profiles is an object, not an array
    const creatorProfile = group.profiles as any
    const creatorName = creatorProfile?.display_name || 
                       creatorProfile?.username || 
                       `User ${creatorProfile?.fid}`

    console.log('📊 Group creator info:', {
      group_id: group.id,
      group_name: group.name,
      creator_fid: creatorProfile?.fid,
      creator_name: creatorName,
      creator_profile_debug: creatorProfile
    })

    // Send notification via Neynar with mutual follower filtering
    const result = await sendGroupCreationNotification(
      group.name,
      group.description || '',
      group.id,
      creatorName,
      {
        following_fid: creatorProfile?.fid // Only send to mutual followers of the creator
      }
    )
    
    if (result.success) {
      console.log(`✅ Group creation notification sent via Neynar for group ${groupId}`)
      return NextResponse.json(
        { message: 'Group creation notification sent successfully via Neynar', groupId },
        { status: 200 }
      )
    } else {
      console.error('Failed to send group creation notification via Neynar:', result.error)
      return NextResponse.json(
        { error: 'Failed to send notification', details: result.error },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in group creation notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 