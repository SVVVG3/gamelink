'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaCalendarAlt, FaUsers, FaTrophy, FaSearch, FaFilter, FaArchive } from 'react-icons/fa'
import { Event, EventWithParticipantCount } from '@/types'
import { useUser } from '@/hooks/useUser'

interface ArchivedEventsPageProps {
  // No props needed for this page
}

export default function ArchivedEventsPage({}: ArchivedEventsPageProps) {
  const { profile, isAuthenticated, isLoading: userLoading } = useUser()
  const [events, setEvents] = useState<EventWithParticipantCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [gameFilter, setGameFilter] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'participants'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch archived events
  useEffect(() => {
    async function fetchArchivedEvents() {
      if (!isAuthenticated || !profile) return
      
      try {
        setLoading(true)
        const url = new URL('/api/events', window.location.origin)
        url.searchParams.set('status', 'archived')
        url.searchParams.set('userFid', profile.fid.toString())
        
        const response = await fetch(url.toString())
        if (!response.ok) {
          throw new Error('Failed to fetch archived events')
        }
        
        const data = await response.json()
        setEvents(data.events || [])
      } catch (err) {
        console.error('Error fetching archived events:', err)
        setError(err instanceof Error ? err.message : 'Failed to load archived events')
      } finally {
        setLoading(false)
      }
    }

    fetchArchivedEvents()
  }, [isAuthenticated, profile])

  // Filter and sort events
  const filteredEvents = events
    .filter(event => {
      const matchesSearch = !searchTerm || 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.game?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesGame = !gameFilter || event.game === gameFilter
      
      return matchesSearch && matchesGame
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'participants':
          comparison = a.participantCount - b.participantCount
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Get unique games for filter
  const uniqueGames = Array.from(new Set(events.map(e => e.game).filter(Boolean)))

  // Loading state
  if (userLoading || loading) {
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
              <h3 className="text-sm font-medium text-red-300">Error Loading Archived Events</h3>
              <div className="mt-2 text-sm text-red-200">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/events"
            className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors font-medium text-sm shadow-lg border border-gray-600"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Link>
          
          <div className="flex items-center space-x-2">
            <FaArchive className="w-6 h-6 text-gray-400" />
            <h1 className="text-2xl font-bold text-white">Archived Events</h1>
          </div>
        </div>
        
        <div className="text-sm text-gray-400">
          {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Game Filter */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">All Games</option>
              {uniqueGames.map(game => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'participants')}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="participants">Sort by Participants</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <FaArchive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            {events.length === 0 ? 'No Archived Events' : 'No Events Match Your Filters'}
          </h3>
          <p className="text-gray-400 mb-6">
            {events.length === 0 
              ? 'You haven\'t archived any events yet. Completed events can be archived from the event details page.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          {events.length === 0 && (
            <Link
              href="/events"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <FaCalendarAlt className="w-4 h-4 mr-2" />
              Browse Active Events
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div key={event.id} className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
              {/* Event Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white line-clamp-2">
                    {event.title}
                  </h3>
                  <span className="ml-2 px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full flex-shrink-0">
                    ARCHIVED
                  </span>
                </div>
                
                {event.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {/* Event Details */}
                <div className="space-y-2 mb-4">
                  {event.game && (
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="font-medium">Game:</span>
                      <span className="ml-2">{event.game}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-300">
                    <FaCalendarAlt className="w-4 h-4 mr-2" />
                    <span>{new Date(event.startTime).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-300">
                    <FaUsers className="w-4 h-4 mr-2" />
                    <span>{event.participantCount} participants</span>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href={`/events/${event.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-lg transition-colors border border-gray-600"
                >
                  <FaTrophy className="w-4 h-4 mr-2" />
                  View Results
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 