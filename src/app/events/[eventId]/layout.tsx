import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ eventId: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }): Promise<Metadata> {
  try {
    const { eventId } = await params
    const supabase = await createClient()
    
    // Fetch event data for metadata
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles:organizer_fid (
          display_name,
          username
        )
      `)
      .eq('id', eventId)
      .single()

    if (error || !event) {
      return {
        title: 'Event Not Found - GameLink',
        description: 'This event could not be found.',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gamelink-app.vercel.app'
    
    // Create Mini App Embed JSON
    const frameEmbed = {
      version: "next",
      imageUrl: `${baseUrl}/api/og/event?eventId=${eventId}`,
      button: {
        title: "🎮 Join Event",
        action: {
          type: "launch_frame",
          url: `${baseUrl}/events/${eventId}`,
          name: "GameLink",
          splashImageUrl: `${baseUrl}/logo.png`,
          splashBackgroundColor: "#667eea"
        }
      }
    }

    const eventDate = new Date(event.event_date)
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const formattedTime = eventDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    })

    return {
      title: `${event.title} - GameLink Event`,
      description: `Join ${event.title} on GameLink - ${event.game ? `Playing ${event.game}` : 'Gaming event'} on ${formattedDate} at ${formattedTime}`,
      openGraph: {
        title: `${event.title} - GameLink Event`,
        description: `Join ${event.title} on GameLink - ${event.game ? `Playing ${event.game}` : 'Gaming event'}`,
        images: [`${baseUrl}/api/og/event?eventId=${eventId}`],
        url: `${baseUrl}/events/${eventId}`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${event.title} - GameLink Event`,
        description: `Join ${event.title} on GameLink`,
        images: [`${baseUrl}/api/og/event?eventId=${eventId}`],
      },
      other: {
        'fc:frame': JSON.stringify(frameEmbed),
      },
    }
  } catch (error) {
    console.error('Error generating event metadata:', error)
    return {
      title: 'GameLink Event',
      description: 'Join gaming events on GameLink',
    }
  }
}

export default function EventLayout({ children }: Props) {
  return children
} 