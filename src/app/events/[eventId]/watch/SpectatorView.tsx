'use client'

import { useState, useEffect } from 'react'
import { Event } from '@/types'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { FaArrowLeft, FaUsers, FaClock, FaTrophy, FaEye } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import EventTimer from '../live/EventTimer'
import Leaderboard from '../live/Leaderboard'
import { ParticipantWithProfile } from '../live/ParticipantTracker'

interface SpectatorViewProps {
  eventId: string
}

interface EventData {
  event: Event
  participants: ParticipantWithProfile[]
}

export default function SpectatorView({ eventId }: SpectatorViewProps) {
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true)
        
        // Fetch event and participants data
        const response = await fetch(`/api/events/${eventId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch event data')
        }
        
        const data = await response.json()
        setEventData(data)
      } catch (error) {
        console.error('Error fetching event data:', error)
        setError('Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    fetchEventData()
  }, [eventId])

  // Set up real-time subscriptions for live updates
  useEffect(() => {
    if (!eventData) return

    const participantChannel = supabase
      .channel(`spectator_participants_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
          filter: `event_id=eq.${eventId}`
        },
        async () => {
          // Refetch participant data when changes occur
          try {
            const response = await fetch(`/api/events/${eventId}`)
            if (response.ok) {
              const data = await response.json()
              setEventData(data)
            }
          } catch (error) {
            console.error('Error refetching participant data:', error)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(participantChannel)
    }
  }, [eventData, eventId, supabase])

  if (loading) {
    return <SpectatorViewSkeleton />
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-8 text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-300 mb-2">Event Not Found</h2>
          <p className="text-red-200 mb-6">
            {error || 'The event you\'re looking for doesn\'t exist or is not available for viewing.'}
          </p>
          <button
            onClick={() => router.push('/events')}
            className="flex items-center justify-center w-full px-4 py-2 bg-red-800 hover:bg-red-700 text-red-100 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </button>
        </div>
      </div>
    )
  }

  const { event, participants } = eventData

  // Calculate spectator statistics
  const totalParticipants = participants.length
  const attendedParticipants = participants.filter(p => p.status === 'attended').length
  const rankedParticipants = participants.filter(p => p.score !== null || p.placement !== null).length
  const spectatorCount = Math.floor(Math.random() * 50) + 10 // Simulated spectator count

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="p-4 space-y-4">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push(`/events/${eventId}`)}
              className="flex items-center text-gray-300 hover:text-white transition-colors"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back to Event
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-400 text-sm">
                <FaEye className="w-4 h-4 mr-1" />
                {spectatorCount} watching
              </div>
              
              {event.status === 'live' && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-red-400 font-medium text-sm">LIVE</span>
                </div>
              )}
            </div>
          </div>

          {/* Event Info */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center">
                <FaUsers className="w-4 h-4 mr-1" />
                {totalParticipants} participants
              </div>
              {event.game && (
                <div>🎮 {event.game}</div>
              )}
              {event.status === 'live' && attendedParticipants > 0 && (
                <div className="flex items-center">
                  <FaTrophy className="w-4 h-4 mr-1" />
                  {attendedParticipants} competing
                </div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              event.status === 'live' 
                ? 'bg-green-900/50 text-green-300 border border-green-700'
                : event.status === 'upcoming'
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : event.status === 'completed'
                ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                : 'bg-gray-700 text-gray-300'
            }`}>
              {event.status === 'live' && '🔴 '}
              {event.status === 'upcoming' && '⏰ '}
              {event.status === 'completed' && '✅ '}
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Event Timer */}
        {(event.status === 'live' || event.status === 'upcoming') && (
          <EventTimer event={event} />
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{totalParticipants}</div>
              <div className="text-sm text-gray-400">Total Participants</div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{attendedParticipants}</div>
              <div className="text-sm text-gray-400">Present</div>
            </div>
          </div>
          
          {event.status === 'live' && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{rankedParticipants}</div>
                <div className="text-sm text-gray-400">Ranked</div>
              </div>
            </div>
          )}
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{spectatorCount}</div>
              <div className="text-sm text-gray-400">Spectators</div>
            </div>
          </div>
        </div>

        {/* Live Leaderboard */}
        {(event.status === 'live' || event.status === 'completed') && rankedParticipants > 0 && (
          <Leaderboard 
            participants={participants}
            eventId={eventId}
          />
        )}

        {/* Participant List (if no rankings yet) */}
        {event.status === 'live' && rankedParticipants === 0 && attendedParticipants > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">
                👥 Competing Participants ({attendedParticipants})
              </h2>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <div className="divide-y divide-gray-700">
                {participants
                  .filter(p => p.status === 'attended')
                  .map((participant, index) => (
                    <div key={participant.id} className="p-4 hover:bg-gray-700/30 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <img
                          className="h-10 w-10 rounded-full ring-2 ring-gray-600"
                          src={participant.profiles.pfp_url || '/default-avatar.png'}
                          alt={participant.profiles.display_name || 'User'}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-medium text-white truncate">
                            {participant.profiles.display_name || participant.profiles.username}
                            {participant.role === 'organizer' && (
                              <span className="ml-2 text-yellow-400 text-sm">👑</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400 truncate">
                            @{participant.profiles.username}
                          </div>
                        </div>
                        <div className="text-sm text-green-400 font-medium">
                          Competing
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Event Description */}
        {event.description && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">About This Event</h3>
            <p className="text-gray-300 leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* Chat Access */}
        {event.chatId && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">💬 Event Discussion</h3>
            <p className="text-gray-400 mb-4">
              Join the conversation with other participants and spectators!
            </p>
            <button
              onClick={() => router.push(`/messages/${event.chatId}`)}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Join Event Chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SpectatorViewSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 p-4 space-y-6">
      {/* Header Skeleton */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="animate-pulse text-center space-y-2">
              <div className="h-8 bg-gray-700 rounded w-12 mx-auto"></div>
              <div className="h-4 bg-gray-700 rounded w-20 mx-auto"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                </div>
                <div className="h-6 w-16 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 