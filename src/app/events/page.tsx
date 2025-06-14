'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import BottomNavigation from '@/components/BottomNavigation'
import { FaCalendarAlt, FaPlus, FaTrophy, FaClock, FaUsers, FaGamepad, FaMapMarkerAlt, FaGlobe } from 'react-icons/fa'
import Link from 'next/link'
import { Event } from '@/types'

interface EventWithParticipantCount extends Event {
  participantCount: number
}

export default function EventsPage() {
  const { isAuthenticated, isLoading, farcasterProfile, profile } = useUser()
  const [events, setEvents] = useState<EventWithParticipantCount[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents()
    }
  }, [isAuthenticated])

  const fetchEvents = async () => {
    try {
      setEventsLoading(true)
      setEventsError(null)

      const response = await fetch('/api/events')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events')
      }

      setEvents(data.events || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      setEventsError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setEventsLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'pc': return '🖥️'
      case 'playstation': return '🎮'
      case 'xbox': return '🎮'
      case 'nintendo switch': return '🎮'
      case 'mobile': return '📱'
      case 'cross-platform': return '🌐'
      default: return '🎮'
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'tournament': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700'
      case 'ranked': return 'text-red-400 bg-red-900/20 border-red-700'
      case 'practice': return 'text-green-400 bg-green-900/20 border-green-700'
      case 'scrimmage': return 'text-blue-400 bg-blue-900/20 border-blue-700'
      default: return 'text-purple-400 bg-purple-900/20 border-purple-700'
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center space-y-6 sm:space-y-8 max-w-md mx-auto">
          <div>
            <FaCalendarAlt className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Gaming Events
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 px-2">
              Sign in to organize and join gaming events
            </p>
          </div>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-300">Loading events...</p>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 pb-20">
      <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              🏆 Gaming Events
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              Organize tournaments and gaming sessions with friends
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {(farcasterProfile?.pfpUrl || profile?.pfp_url) && (
              <img
                src={farcasterProfile?.pfpUrl || profile?.pfp_url || ''}
                alt="Your profile"
                className="w-10 h-10 rounded-full ring-2 ring-blue-500"
              />
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="w-full">
          <Link 
            href="/events/new"
            className="flex items-center justify-center px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium w-full"
          >
            <FaPlus className="w-5 h-5 mr-3" />
            Create Event
          </Link>
        </div>

        {/* Event Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-gradient-to-r from-orange-900/50 to-orange-800/50 border border-orange-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <FaClock className="w-8 h-8 text-orange-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Quick Matches</h3>
                <p className="text-sm text-orange-200">
                  Casual gaming sessions starting soon
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <FaTrophy className="w-8 h-8 text-purple-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Tournaments</h3>
                <p className="text-sm text-purple-200">
                  Competitive events with prizes
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <FaUsers className="w-8 h-8 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Team Events</h3>
                <p className="text-sm text-green-200">
                  Coordinate with your squad
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
          
          {eventsLoading ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading events...</p>
            </div>
          ) : eventsError ? (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
              <p className="text-red-400 text-center">{eventsError}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <FaCalendarAlt className="w-12 h-12 text-gray-500 mx-auto" />
                <h3 className="text-lg font-bold text-white">
                  No Events Yet
                </h3>
                <p className="text-gray-300 text-sm">
                  Be the first to create a gaming event! Click "Create Event" above to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => {
                const startDateTime = formatDateTime(event.startTime || new Date().toISOString())
                return (
                  <Link 
                    key={event.id} 
                    href={`/events/${event.id}`}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-colors group"
                  >
                    <div className="space-y-4">
                      {/* Event Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                            {event.title}
                          </h3>
                          {event.description && (
                            <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getEventTypeColor(event.eventType || 'casual')}`}>
                          {event.eventType || 'casual'}
                        </span>
                      </div>

                      {/* Game Info */}
                      {event.game && (
                        <div className="flex items-center space-x-2">
                          <FaGamepad className="w-4 h-4 text-blue-400" />
                          <span className="text-white font-medium">{event.game}</span>
                          {event.gamingPlatform && (
                            <span className="text-gray-400 text-sm">
                              {getPlatformIcon(event.gamingPlatform || '')} {event.gamingPlatform}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Date & Time */}
                      <div className="flex items-center space-x-2">
                        <FaClock className="w-4 h-4 text-green-400" />
                        <div className="text-sm">
                          <span className="text-white font-medium">{startDateTime.date}</span>
                          <span className="text-gray-400 ml-2">{startDateTime.time}</span>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center space-x-2">
                        {event.locationType === 'online' ? (
                          <FaGlobe className="w-4 h-4 text-blue-400" />
                        ) : (
                          <FaMapMarkerAlt className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-gray-300 text-sm capitalize">
                          {event.locationType?.replace('_', ' ') || 'Unknown'}
                        </span>
                      </div>

                      {/* Participants */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                        <div className="flex items-center space-x-2">
                          <FaUsers className="w-4 h-4 text-purple-400" />
                          <span className="text-gray-300 text-sm">
                            {event.participantCount || 0}/{event.maxParticipants || 0} players
                          </span>
                        </div>
                        
                        {event.skillLevel && (
                          <span className="text-gray-400 text-xs capitalize">
                            {event.skillLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNavigation />
    </main>
  )
} 