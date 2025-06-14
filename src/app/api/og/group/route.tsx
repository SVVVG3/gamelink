import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return new NextResponse('Group ID is required', { status: 400 });
    }

    // Fetch group data
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

    // Create SVG image
    const canvas = `
      <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#48bb78;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#38a169;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="800" fill="url(#bg)"/>
        
        <!-- Content Container -->
        <rect x="80" y="80" width="1040" height="640" fill="rgba(255,255,255,0.95)" rx="20"/>
        
        <!-- Header -->
        <text x="600" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#2d3748">
          👥 GameLink Group
        </text>
        
        <!-- Group Name -->
        <text x="600" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="600" fill="#4a5568">
          ${group.name.length > 40 ? group.name.substring(0, 40) + '...' : group.name}
        </text>
        
        <!-- Description -->
        ${group.description ? `
        <text x="600" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#718096">
          ${group.description.length > 60 ? group.description.substring(0, 60) + '...' : group.description}
        </text>
        ` : ''}
        
        <!-- Member Count -->
        <text x="600" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#718096">
          👥 ${memberCount} ${memberCount === 1 ? 'Member' : 'Members'}
        </text>
        
        <!-- Created Date -->
        <text x="600" y="480" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#a0aec0">
          Created ${new Date(group.created_at).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })}
        </text>
        
        <!-- Creator -->
        <text x="600" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#a0aec0">
          by ${group.profiles?.display_name || group.profiles?.username || 'Anonymous'}
        </text>
        
        <!-- CTA -->
        <rect x="450" y="580" width="300" height="60" fill="#48bb78" rx="30"/>
        <text x="600" y="620" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="600" fill="white">
          Join Group
        </text>
      </svg>
    `;

    return new NextResponse(canvas, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, immutable, no-transform, max-age=300',
      },
    });

  } catch (error) {
    console.error('Error generating group OG image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 