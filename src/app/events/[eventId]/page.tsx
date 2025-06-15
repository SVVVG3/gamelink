import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import EventDetailsClient from './EventDetailsClient'

interface Props {
  params: Promise<{ eventId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { eventId } = await params
    const supabase = await createClient()
    
    // Fetch event data for metadata
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles:created_by (
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-gamelink.vercel.app'
    
    // Create Mini App Embed JSON
    const frameEmbed = {
      version: "next",
      imageUrl: `${baseUrl}/gamelinkEmbed.png`,
      button: {
        title: "🎮 Join Event",
        action: {
          type: "launch_frame",
          url: `${baseUrl}/events/${eventId}`,
          name: "GameLink",
          splashImageUrl: `${baseUrl}/gamelinkSplashImage.png`,
          splashBackgroundColor: "#000000"
        }
      }
    }

    const eventDate = new Date(event.start_time)
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
        images: [`${baseUrl}/gamelinkEmbed.png`],
        url: `${baseUrl}/events/${eventId}`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${event.title} - GameLink Event`,
        description: `Join ${event.title} on GameLink`,
        images: [`${baseUrl}/gamelinkEmbed.png`],
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

export default function EventDetailsPage({ params }: Props) {
  return <EventDetailsClient params={params} />
} 