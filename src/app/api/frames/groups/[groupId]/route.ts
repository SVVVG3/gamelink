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
      const frameHtml = generateGroupFrameHtml(group, 'signup_required', groupId)
      return new Response(frameHtml, {
        headers: {
          'Content-Type': 'text/html',
        },
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
          const frameHtml = generateGroupFrameHtml(group, 'admin_cannot_leave', groupId)
          return new Response(frameHtml, {
            headers: {
              'Content-Type': 'text/html',
            },
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

        const frameHtml = generateGroupFrameHtml(group, 'left', groupId)
        return new Response(frameHtml, {
          headers: {
            'Content-Type': 'text/html',
          },
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

          const frameHtml = generateGroupFrameHtml(group, 'request_sent', groupId)
          return new Response(frameHtml, {
            headers: {
              'Content-Type': 'text/html',
            },
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

          const frameHtml = generateGroupFrameHtml(group, 'joined', groupId)
          return new Response(frameHtml, {
            headers: {
              'Content-Type': 'text/html',
            },
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
    const status = existingMembership ? 'member' : 'not_member'
    const frameHtml = generateGroupFrameHtml(group, status, groupId)
    return new Response(frameHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
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

    // Return initial frame as HTML with meta tags
    const frameHtml = generateGroupFrameHtml(group, 'initial', groupId)
    return new Response(frameHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
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

function generateGroupFrameHtml(group: any, status: string, groupId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'
  const imageUrl = generateGroupImage(group, status)
  const frameUrl = `${baseUrl}/api/frames/groups/${groupId}`
  
  // Determine button configuration based on status
  let button1Content = '🎮 Join Group'
  let button1Action = 'post'
  let button1Target = ''
  
  if (status === 'signup_required') {
    button1Content = '🎮 Sign Up for GameLink'
    button1Action = 'link'
    button1Target = `${baseUrl}/auth/login`
  } else if (status === 'joined' || status === 'member') {
    button1Content = '❌ Leave Group'
  } else if (status === 'left') {
    button1Content = '🎮 Join Group'
  } else if (status === 'request_sent') {
    button1Content = '⏳ Request Sent'
  } else if (status === 'admin_cannot_leave') {
    button1Content = '👑 You\'re the Admin'
  }
  
  const button1Meta = button1Action === 'link' 
    ? `<meta property="fc:frame:button:1:action" content="link" />
  <meta property="fc:frame:button:1:target" content="${button1Target}" />`
    : ''
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${group.name} - GameLink Group</title>
  
  <!-- Frame metadata -->
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:post_url" content="${frameUrl}" />
  <meta property="fc:frame:button:1" content="${button1Content}" />
  ${button1Meta}
  <meta property="fc:frame:button:2" content="💬 View Group" />
  <meta property="fc:frame:button:2:action" content="link" />
  <meta property="fc:frame:button:2:target" content="${baseUrl}/groups/${groupId}" />
  
  <!-- Open Graph metadata -->
  <meta property="og:title" content="${group.name}" />
  <meta property="og:description" content="Join this gaming group on GameLink!" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:url" content="${baseUrl}/groups/${groupId}" />
</head>
<body>
  <h1>${group.name}</h1>
  <p>${group.description || 'Join our gaming community!'}</p>
  <p>Members: ${group.member_count || 0}</p>
  <a href="${baseUrl}/groups/${groupId}">View Group Details</a>
</body>
</html>`
} 