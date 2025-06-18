'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabaseClient'
import { Event, EventParticipant } from '@/types'
import EventTimer from './EventTimer'
import ParticipantTracker, { ParticipantWithProfile } from './ParticipantTracker'
import EventControls from './EventControls'
import ScoringPanel from './ScoringPanel'
import Leaderboard from './Leaderboard'
import Link from 'next/link'
import { FaArrowLeft } from 'react-icons/fa'

interface LiveEventDashboardProps {
  eventId: string
}

interface LiveEventData {
  event: Event
  participants: ParticipantWithProfile[]
}

export default function LiveEventDashboard({ eventId }: LiveEventDashboardProps) {
  const { profile, isAuthenticated, isLoading: userLoading } = useUser()
  const router = useRouter()
  const [eventData, setEventData] = useState<LiveEventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial event data
  useEffect(() => {
    async function fetchEventData() {
      try {
        // Fetch event details (using EventWithDetails to get organizer info)
        console.log(`Fetching event data for eventId: ${eventId}`)
        
        // Include user FID in query params for user-specific data
        const url = new URL(`/api/events/${eventId}`, window.location.origin)
        if (profile?.fid) {
          url.searchParams.set('userFid', profile.fid.toString())
          console.log('🔍 Live Dashboard: Current user FID:', profile.fid, 'Username:', profile.username)
        }
        
        const eventResponse = await fetch(url.toString())
        
        if (!eventResponse.ok) {
          const errorText = await eventResponse.text()
          throw new Error(`Failed to fetch event: ${eventResponse.status} - ${errorText}`)
        }
        
        const eventData = await eventResponse.json()
        const event: Event = eventData.event

        // Check if user is organizer - compare with createdBy field that stores user UUID
        
        if (!profile?.id || event.createdBy !== profile.id) {
          setError('You are not authorized to access this live dashboard. Only the event organizer can view this page.')
          return
        }

        // Check if event is live
        if (event.status !== 'live') {
          setError(`Event is not currently live (status: ${event.status})`)
          return
        }

        // Fetch participants with explicit relationship specification
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select(`
            *,
            profiles!event_participants_user_id_fkey (
              fid,
              display_name,
              username,
              pfp_url
            )
          `)
          .eq('event_id', eventId)

        if (participantsError) {
          throw participantsError
        }

        setEventData({ event, participants: participants || [] })
      } catch (err) {
        console.error('Error fetching event data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    if (!userLoading && isAuthenticated && profile) {
      fetchEventData()
    }
  }, [eventId, profile, userLoading, isAuthenticated])

  // Real-time subscription for participant updates
  useEffect(() => {
    if (!eventData) return

    const subscription = supabase
      .channel(`live-event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
          filter: `event_id=eq.${eventId}`
        },
        async (payload) => {
          // Refetch participants data with explicit relationship
          const { data: participants, error } = await supabase
            .from('event_participants')
            .select(`
              *,
              profiles!event_participants_user_id_fkey (
                fid,
                display_name,
                username,
                pfp_url
              )
            `)
            .eq('event_id', eventId)

          if (!error && participants) {
            setEventData(prev => prev ? { ...prev, participants } : null)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [eventId, eventData])

  // Loading state
  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 5rem)' }}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 max-w-2xl mx-auto">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-300">Access Denied</h3>
              <div className="mt-2 text-sm text-red-200">
                <p>{error}</p>
              </div>
            </div>
          </div>
          <div className="flex">
            <button
              onClick={() => router.back()}
              className="bg-red-800 hover:bg-red-700 text-red-100 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No event data
  if (!eventData) {
    return (
      <div className="p-4">
        <div className="text-center">
          <p className="text-gray-400">Event not found</p>
        </div>
      </div>
    )
  }

  const { event, participants } = eventData

  return (
    <div className="p-4 space-y-6">
      {/* Back Button */}
      <div className="flex items-center mb-4">
        <Link
          href={`/events/${eventId}`}
          className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors font-medium text-sm shadow-lg border border-gray-600"
        >
          <FaArrowLeft className="w-4 h-4 mr-2" />
          Back to Event
        </Link>
      </div>

      {/* Header */}
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{event.title}</h1>
            <p className="text-gray-300">Live Event Dashboard</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium">LIVE</span>
            </div>
          </div>
        </div>
        
        <EventTimer event={event} />
      </div>

      {/* Scoring and Results Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Scoring Panel */}
        <div>
          <ScoringPanel 
            participants={participants} 
            eventId={eventId}
            onScoreUpdate={(updatedParticipants: ParticipantWithProfile[]) => 
              setEventData(prev => prev ? { ...prev, participants: updatedParticipants } : null)
            }
          />
        </div>

        {/* Live Leaderboard */}
        <div>
          <Leaderboard 
            participants={participants}
            eventId={eventId}
          />
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Participant Tracker */}
        <div className="lg:col-span-2">
          <ParticipantTracker 
            participants={participants} 
            eventId={eventId}
            onParticipantUpdate={(updatedParticipants: ParticipantWithProfile[]) => 
              setEventData(prev => prev ? { ...prev, participants: updatedParticipants } : null)
            }
          />
        </div>

        {/* Event Controls */}
        <div className="lg:col-span-1">
          <EventControls 
            event={event}
            participants={participants}
            onEventUpdate={(updatedEvent: Event) => 
              setEventData(prev => prev ? { ...prev, event: updatedEvent } : null)
            }
          />
        </div>
      </div>
    </div>
  )
} 