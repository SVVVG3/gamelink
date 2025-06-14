import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  // Mini App Embeds don't use POST actions like traditional Frames
  // They launch the Mini App directly, so we redirect to the group page
  const { groupId } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gamelink-app.vercel.app'
  
  return NextResponse.redirect(`${baseUrl}/groups/${groupId}`)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    // Fetch group data
    const supabase = await createClient()
    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        profiles:created_by (
          display_name,
          username
        ),
        group_members!inner (
          id
        )
      `)
      .eq('id', groupId)
      .single();

    if (error || !group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    // Count members
    const memberCount = group.group_members?.length || 0;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gamelink-app.vercel.app';
    
    // Create Mini App Embed JSON
    const frameEmbed = {
      version: "next",
      imageUrl: `${baseUrl}/api/og/group?groupId=${groupId}`,
      button: {
        title: "👥 Join Group",
        action: {
          type: "launch_frame",
          url: `${baseUrl}/groups/${groupId}`,
          name: "GameLink",
          splashImageUrl: `${baseUrl}/logo.png`,
          splashBackgroundColor: "#48bb78"
        }
      }
    };

    // Generate HTML with Mini App Embed meta tag
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${group.name} - GameLink Group</title>
          <meta name="description" content="Join ${group.name} on GameLink - ${group.description || 'Gaming group'} created by ${group.profiles?.display_name || group.profiles?.username || 'GameLink'}">
          
          <!-- Mini App Embed -->
          <meta name="fc:frame" content='${JSON.stringify(frameEmbed)}' />
          
          <!-- Open Graph fallback -->
          <meta property="og:title" content="${group.name} - GameLink Group" />
          <meta property="og:description" content="Join ${group.name} on GameLink - ${group.description || 'Gaming group'}" />
          <meta property="og:image" content="${baseUrl}/api/og/group?groupId=${groupId}" />
          <meta property="og:url" content="${baseUrl}/groups/${groupId}" />
          <meta property="og:type" content="website" />
          
          <!-- Twitter Card -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${group.name} - GameLink Group" />
          <meta name="twitter:description" content="Join ${group.name} on GameLink" />
          <meta name="twitter:image" content="${baseUrl}/api/og/group?groupId=${groupId}" />
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>👥 ${group.name}</h1>
            ${group.description ? `<p><strong>Description:</strong> ${group.description}</p>` : ''}
            <p><strong>Members:</strong> ${memberCount}</p>
            <p><strong>Created:</strong> ${new Date(group.created_at).toLocaleDateString()}</p>
            <p><strong>Creator:</strong> ${group.profiles?.display_name || group.profiles?.username || 'Anonymous'}</p>
            <a href="${baseUrl}/groups/${groupId}" style="display: inline-block; background: #48bb78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">
              Join Group on GameLink
            </a>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300',
      },
    });

  } catch (error) {
    console.error('Error generating group frame:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 