import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ groupId: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: { params: Promise<{ groupId: string }> }): Promise<Metadata> {
  try {
    const { groupId } = await params
    const supabase = await createClient()
    
    // Fetch group data for metadata
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
      .single()

    if (error || !group) {
      return {
        title: 'Group Not Found - GameLink',
        description: 'This group could not be found.',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gamelink-app.vercel.app'
    const memberCount = group.group_members?.length || 0
    
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
    }

    return {
      title: `${group.name} - GameLink Group`,
      description: `Join ${group.name} on GameLink - ${group.description || 'Gaming group'} with ${memberCount} ${memberCount === 1 ? 'member' : 'members'}`,
      openGraph: {
        title: `${group.name} - GameLink Group`,
        description: `Join ${group.name} on GameLink - ${group.description || 'Gaming group'}`,
        images: [`${baseUrl}/api/og/group?groupId=${groupId}`],
        url: `${baseUrl}/groups/${groupId}`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${group.name} - GameLink Group`,
        description: `Join ${group.name} on GameLink`,
        images: [`${baseUrl}/api/og/group?groupId=${groupId}`],
      },
      other: {
        'fc:frame': JSON.stringify(frameEmbed),
      },
    }
  } catch (error) {
    console.error('Error generating group metadata:', error)
    return {
      title: 'GameLink Group',
      description: 'Join gaming groups on GameLink',
    }
  }
}

export default function GroupLayout({ children }: Props) {
  return children
} 