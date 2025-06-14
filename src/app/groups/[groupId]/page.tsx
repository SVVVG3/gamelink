import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import GroupDetailsClient from './GroupDetailsClient'

interface Props {
  params: Promise<{ groupId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
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
        )
      `)
      .eq('id', groupId)
      .single()

    // Get member count separately
    let memberCount = 0
    if (group) {
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
      memberCount = count || 0
    }

    if (error || !group) {
      return {
        title: 'Group Not Found - GameLink',
        description: 'This group could not be found.',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'
    
    // Create Mini App Embed JSON
    const frameEmbed = {
      version: "next",
      imageUrl: `${baseUrl}/gamelinkEmbed.png`,
      button: {
        title: "👥 Join Group",
        action: {
          type: "launch_frame",
          url: `${baseUrl}/groups/${groupId}`,
          name: "GameLink",
          splashImageUrl: `${baseUrl}/gamelinkSplashImage.png`,
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
        images: [`${baseUrl}/gamelinkEmbed.png`],
        url: `${baseUrl}/groups/${groupId}`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${group.name} - GameLink Group`,
        description: `Join ${group.name} on GameLink`,
        images: [`${baseUrl}/gamelinkEmbed.png`],
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

export default function GroupDetailsPage({ params }: Props) {
  return <GroupDetailsClient params={params} />
} 