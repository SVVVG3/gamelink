import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const supabase = await createClient()
    
    // Parse the frame action data
    const body = await request.json()
    const { untrustedData } = body
    
    if (!untrustedData?.fid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 400 }
      )
    }

    const userFid = untrustedData.fid
    
    // Get the group details
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        *,
        profiles!groups_created_by_fkey (
          id,
          fid,
          username,
          display_name,
          pfp_url
        )
      `)
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Get or create user profile
    let { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, fid, username')
      .eq('fid', userFid)
      .single()

    if (profileError || !userProfile) {
      // If profile doesn't exist, return a frame that prompts them to sign up first
      return NextResponse.json({
        type: 'frame',
        data: {
          version: 'next',
          image: generateGroupImage(group, 'signup_required'),
          buttons: [
            {
              label: '🎮 Sign Up for GameLink',
              action: 'link',
              target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/auth/login`
            }
          ]
        }
      })
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('profile_id', userProfile.id)
      .single()

    // Handle the action based on button pressed
    const buttonIndex = untrustedData.buttonIndex || 1
    
    if (buttonIndex === 1) {
      // Join/Leave Group button
      if (existingMembership) {
        // User is already a member - remove them (if not admin)
        if (existingMembership.role === 'admin') {
          return NextResponse.json({
            type: 'frame',
            data: {
              version: 'next',
              image: generateGroupImage(group, 'admin_cannot_leave'),
              buttons: [
                {
                  label: '👑 You\'re the Admin',
                  action: 'post'
                },
                {
                  label: '💬 View Group',
                  action: 'link',
                  target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/groups/${groupId}`
                }
              ]
            }
          })
        }

        const { error: deleteError } = await supabase
          .from('group_memberships')
          .delete()
          .eq('group_id', groupId)
          .eq('profile_id', userProfile.id)

        if (deleteError) {
          return NextResponse.json(
            { error: 'Failed to leave group' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          type: 'frame',
          data: {
            version: 'next',
            image: generateGroupImage(group, 'left'),
            buttons: [
              {
                label: '🎮 Join Group',
                action: 'post'
              },
              {
                label: '💬 View Group',
                action: 'link',
                target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/groups/${groupId}`
              }
            ]
          }
        })
      } else {
        // User is not a member - check if group requires approval
        if (group.require_approval) {
          // Send invitation request
          const { error: inviteError } = await supabase
            .from('group_invitations')
            .insert([{
              group_id: groupId,
              invited_profile_id: userProfile.id,
              invited_by_profile_id: group.created_by, // Auto-invite by group creator
              status: 'pending',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            }])

          if (inviteError) {
            return NextResponse.json(
              { error: 'Failed to request to join group' },
              { status: 500 }
            )
          }

          return NextResponse.json({
            type: 'frame',
            data: {
              version: 'next',
              image: generateGroupImage(group, 'request_sent'),
              buttons: [
                {
                  label: '⏳ Request Sent',
                  action: 'post'
                },
                {
                  label: '💬 View Group',
                  action: 'link',
                  target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/groups/${groupId}`
                }
              ]
            }
          })
        } else {
          // Join directly
          const { error: insertError } = await supabase
            .from('group_memberships')
            .insert([{
              group_id: groupId,
              profile_id: userProfile.id,
              role: 'member',
              joined_at: new Date().toISOString()
            }])

          if (insertError) {
            return NextResponse.json(
              { error: 'Failed to join group' },
              { status: 500 }
            )
          }

          return NextResponse.json({
            type: 'frame',
            data: {
              version: 'next',
              image: generateGroupImage(group, 'joined'),
              buttons: [
                {
                  label: '❌ Leave Group',
                  action: 'post'
                },
                {
                  label: '💬 View Group',
                  action: 'link',
                  target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/groups/${groupId}`
                }
              ]
            }
          })
        }
      }
    } else if (buttonIndex === 2) {
      // View Group button - redirect to app
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/groups/${groupId}`
      )
    }

    // Default response - show group details
    return NextResponse.json({
      type: 'frame',
      data: {
        version: 'next',
        image: generateGroupImage(group, existingMembership ? 'member' : 'not_member'),
        buttons: [
          {
            label: existingMembership ? '❌ Leave Group' : '🎮 Join Group',
            action: 'post'
          },
          {
            label: '💬 View Group',
            action: 'link',
            target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/groups/${groupId}`
          }
        ]
      }
    })

  } catch (error) {
    console.error('Group frame action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const supabase = await createClient()
    
    // Get the group details
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        *,
        profiles!groups_created_by_fkey (
          id,
          fid,
          username,
          display_name,
          pfp_url
        )
      `)
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Return initial frame
    return NextResponse.json({
      type: 'frame',
      data: {
        version: 'next',
        image: generateGroupImage(group, 'initial'),
        buttons: [
          {
            label: '🎮 Join Group',
            action: 'post'
          },
          {
            label: '💬 View Group',
            action: 'link',
            target: `${process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'}/groups/${groupId}`
          }
        ]
      }
    })

  } catch (error) {
    console.error('Group frame GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateGroupImage(group: any, status: string): string {
  // Generate a dynamic image URL for the group frame
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'
  
  const params = new URLSearchParams({
    name: group.name,
    description: group.description || '',
    memberCount: group.member_count?.toString() || '0',
    status: status,
    creator: group.profiles?.display_name || group.profiles?.username || 'Unknown'
  })
  
  return `${baseUrl}/api/og/group?${params.toString()}`
} 