import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  // Mini App Embeds don't use POST actions like traditional Frames
  // They launch the Mini App directly, so we redirect to the group page
  const { groupId } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'
  
  return NextResponse.redirect(`${baseUrl}/groups/${groupId}`)
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
  
  // Create Mini App Embed JSON according to the specification
  const miniAppEmbed = {
    version: "next",
    imageUrl: imageUrl,
    button: {
      title: "🎮 Join Group",
      action: {
        type: "launch_frame",
        name: "GameLink",
        url: `${baseUrl}/groups/${groupId}`,
        splashImageUrl: `${baseUrl}/logo.png`,
        splashBackgroundColor: "#1a1a1a"
      }
    }
  }
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${group.name} - GameLink Group</title>
  
  <!-- Mini App Embed metadata -->
  <meta name="fc:frame" content='${JSON.stringify(miniAppEmbed)}' />
  
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