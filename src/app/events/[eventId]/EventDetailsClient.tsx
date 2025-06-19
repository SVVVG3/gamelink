'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import BottomNavigation from '@/components/BottomNavigation'
import { 
  FaCalendarAlt, 
  FaClock, 
  FaUsers, 
  FaGamepad, 
  FaMapMarkerAlt, 
  FaTrophy,
  FaUserPlus,
  FaUserMinus,
  FaEye,
  FaCrown,
  FaArrowLeft,
  FaGlobe,
  FaLock,
  FaUnlock,
  FaComments,
  FaPlay,
  FaStop,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaArchive,
  FaShare
} from 'react-icons/fa'
import FarcasterIcon from '@/components/FarcasterIcon'
import { FaShield } from 'react-icons/fa6'
import Link from 'next/link'
import { Event, EventParticipant, Profile } from '@/types'
import { useRouter } from 'next/navigation'
import ResultsShareModal from '@/components/ResultsShareModal'
import Leaderboard from './live/Leaderboard'

interface EventWithDetails extends Event {
  participants: (EventParticipant & { profile: Profile })[]
  participantCount: number
  organizer: Profile
  userParticipation?: EventParticipant
  userInEventChat?: boolean
}

interface Props {
  params: Promise<{ eventId: string }>
}

export default function EventDetailsClient({ params }: Props) {
  const { isAuthenticated, isLoading, profile } = useUser()
  const router = useRouter()
  const [event, setEvent] = useState<EventWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [eventId, setEventId] = useState<string>('')
  const [showResultsShareModal, setShowResultsShareModal] = useState(false)

  useEffect(() => {
    const getEventId = async () => {
      const resolvedParams = await params
      setEventId(resolvedParams.eventId)
    }
    getEventId()
  }, [params])

  useEffect(() => {
    if (eventId) {
      fetchEventDetails()
    }
  }, [eventId, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEventDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Include user FID in query params for user-specific data
      const url = new URL(`/api/events/${eventId}`, window.location.origin)
      if (profile?.fid) {
        url.searchParams.set('userFid', profile.fid.toString())
        console.log('🔍 Frontend: Current user FID:', profile.fid, 'Username:', profile.username)
      }

      const response = await fetch(url.toString())
      const data = await response.json()

      console.log('🔍 Frontend: API Response:', { status: response.status, data })
      console.log('🔍 Frontend: User participation:', data.event?.userParticipation)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch event details')
      }

      if (!data.event) {
        console.error('❌ Frontend: No event data in response:', data)
        throw new Error('Event not found')
      }

      console.log('✅ Frontend: Setting event data:', data.event)
      console.log('🕐 Event timezone from API:', data.event.timezone)
      setEvent(data.event)
    } catch (err) {
      console.error('Error fetching event details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  const handleRSVP = async (action: 'join' | 'leave', role: 'participant' | 'spectator' = 'participant') => {
    if (!isAuthenticated || !profile || !event) return

    try {
      setRsvpLoading(true)
      setError(null)

      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: action === 'join' ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: profile.fid,
          role: role
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} event`)
      }

      // Refresh event details to show updated participant list
      await fetchEventDetails()
    } catch (err) {
      console.error(`Error ${action}ing event:`, err)
      setError(err instanceof Error ? err.message : `Failed to ${action} event`)
    } finally {
      setRsvpLoading(false)
    }
  }

  const handleJoinEventChat = async () => {
    if (!isAuthenticated || !profile || !event || !event.chatId) return

    try {
      setChatLoading(true)
      setError(null)

      // If user is already in the chat, navigate directly
      if (event.userInEventChat) {
        router.push(`/messages/${event.chatId}`)
        return
      }

      // Otherwise, join the chat first
      const response = await fetch(`/api/events/${eventId}/join-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid: profile.fid
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join event chat')
      }

      // Navigate to the chat
      router.push(`/messages/${data.chatId}`)
    } catch (err) {
      console.error('Error joining event chat:', err)
      setError(err instanceof Error ? err.message : 'Failed to join event chat')
    } finally {
      setChatLoading(false)
    }
  }

  const shareEventFrame = async () => {
    if (!event) return
    
    // Share the event page URL, not the frame endpoint
    const eventPageUrl = `${window.location.origin}/events/${eventId}`
    const shareText = `🎮 Join me for ${event.title}!\n\nGame: ${event.game}\nDate: ${formatDateTime(event.startTime).date} at ${formatDateTime(event.startTime).time}\n\n`
    
    // Try to use Farcaster SDK if available (Mini App context)
    try {
      const { sdk } = await import('@farcaster/frame-sdk')
      
      // Check if we're in a Mini App context by trying to get context
      const context = await sdk.context
      if (context && context.client) {
        const result = await sdk.actions.composeCast({
          text: shareText,
          embeds: [eventPageUrl]
        })
        
        if (result?.cast) {
          console.log('Cast shared successfully:', result.cast.hash)
        }
        return
      }
    } catch (error) {
      console.error('Farcaster SDK not available, using web fallback:', error)
    }
    
    // Fallback for standalone web app - open Warpcast
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(eventPageUrl)}`
    window.open(farcasterUrl, '_blank')
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Smart timezone selection:
    // - If event has a specific timezone that's not UTC, use it
    // - If event timezone is UTC or missing, use user's timezone for better UX
    const shouldUseUserTimezone = !event?.timezone || event.timezone === 'UTC'
    const timezone = shouldUseUserTimezone ? userTimezone : event.timezone
    

    
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: timezone
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
        timeZoneName: 'short'
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'organizer': return <FaCrown className="w-4 h-4 text-yellow-400" />
      case 'moderator': return <FaShield className="w-4 h-4 text-blue-400" />
      case 'spectator': return <FaEye className="w-4 h-4 text-gray-400" />
      default: return <FaGamepad className="w-4 h-4 text-green-400" />
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!isAuthenticated || !profile || !event) return

    try {
      setStatusLoading(true)
      setError(null)

      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          userFid: profile.fid
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to update event status to ${newStatus}`)
      }

      // Update the event state with the new status
      setEvent(prev => prev ? { ...prev, status: newStatus as any } : null)
      
      // Show success message briefly
      const successMessage = `Event status updated to ${newStatus}`
      console.log('✅', successMessage)
      
    } catch (err) {
      console.error(`Error updating event status to ${newStatus}:`, err)
      setError(err instanceof Error ? err.message : `Failed to update event status`)
    } finally {
      setStatusLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-400 bg-gray-800 border-gray-600'
      case 'upcoming': return 'text-blue-400 bg-blue-900/20 border-blue-700'
      case 'live': return 'text-green-400 bg-green-900/20 border-green-700'
      case 'completed': return 'text-purple-400 bg-purple-900/20 border-purple-700'
      case 'cancelled': return 'text-red-400 bg-red-900/20 border-red-700'
      default: return 'text-gray-400 bg-gray-800 border-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FaSpinner className="w-4 h-4" />
      case 'upcoming': return <FaClock className="w-4 h-4" />
      case 'live': return <FaPlay className="w-4 h-4" />
      case 'completed': return <FaCheckCircle className="w-4 h-4" />
      case 'cancelled': return <FaTimes className="w-4 h-4" />
      default: return <FaSpinner className="w-4 h-4" />
    }
  }

  const getAvailableTransitions = (currentStatus: string) => {
    const transitions: Record<string, Array<{status: string, label: string, icon: any, color: string, description: string}>> = {
      'draft': [
        { status: 'upcoming', label: 'Publish Event', icon: FaClock, color: 'bg-blue-600 hover:bg-blue-700', description: 'Make event public and open for registration' },
        { status: 'cancelled', label: 'Cancel Event', icon: FaTimes, color: 'bg-red-600 hover:bg-red-700', description: 'Cancel this event permanently' }
      ],
      'upcoming': [
        { status: 'live', label: 'Start Event', icon: FaPlay, color: 'bg-green-600 hover:bg-green-700', description: 'Start the event now (available 30 min before scheduled time)' },
        { status: 'cancelled', label: 'Cancel Event', icon: FaTimes, color: 'bg-red-600 hover:bg-red-700', description: 'Cancel this event permanently' }
      ],
      'live': [
        { status: 'completed', label: 'Complete Event', icon: FaCheckCircle, color: 'bg-purple-600 hover:bg-purple-700', description: 'Mark event as completed' },
        { status: 'cancelled', label: 'Cancel Event', icon: FaTimes, color: 'bg-red-600 hover:bg-red-700', description: 'Cancel this event permanently' }
      ],
      'completed': [],
      'cancelled': []
    }
    
    return transitions[currentStatus] || []
  }

  const canTransitionToStatus = (currentStatus: string, targetStatus: string) => {
    if (!event) return false
    
    // Time-based validation for 'live' status
    if (targetStatus === 'live') {
      const now = new Date()
      const startTime = new Date(event.startTime)
      const allowedStartTime = new Date(startTime.getTime() - 30 * 60 * 1000) // 30 minutes before
      return now >= allowedStartTime
    }
    
    return true
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center space-y-6 sm:space-y-8 max-w-md mx-auto">
          <div>
            <FaCalendarAlt className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Event Details
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 px-2">
              Sign in to view event details and RSVP
            </p>
          </div>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  if (loading || isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-300">Loading event details...</p>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  if (error || !event) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div>
            <FaCalendarAlt className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Event Not Found
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 px-2">
              {error || 'This event could not be found or you don\'t have permission to view it.'}
            </p>
            <Link 
              href="/events"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Link>
          </div>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  const startDateTime = formatDateTime(event.startTime)
  const endDateTime = event.endTime ? formatDateTime(event.endTime) : null
  const isUserParticipant = event.userParticipation !== null && event.userParticipation !== undefined
  const isOrganizer = event.userParticipation?.role === 'organizer'
  

  const canJoin = !isUserParticipant && event.participantCount < event.maxParticipants
  const requiresApproval = event.requireApproval && !isUserParticipant

  return (
    <main className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/events"
              className="flex items-center text-gray-300 hover:text-white transition-colors"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Link>
            
            <div className="flex items-center space-x-2">
              {/* Event Status Indicator */}
              <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                {getStatusIcon(event.status)}
                <span className="ml-1 capitalize">{event.status}</span>
              </div>
              
              {event.isPrivate ? (
                <FaLock className="w-4 h-4 text-yellow-400" title="Private Event" />
              ) : (
                <FaUnlock className="w-4 h-4 text-green-400" title="Public Event" />
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEventTypeColor(event.eventType)}`}>
                {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
              </span>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                {event.title}
              </h1>
              {event.description && (
                <p className="text-gray-300 text-sm sm:text-base mb-4">
                  {event.description}
                </p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center">
                  <img
                    src={event.organizer.pfp_url || '/default-avatar.png'}
                    alt={event.organizer.display_name || event.organizer.username}
                    className="w-6 h-6 rounded-full mr-2"
                  />
                  <span>by {event.organizer.display_name || event.organizer.username}</span>
                </div>
                <div className="flex items-center">
                  <FaUsers className="w-4 h-4 mr-1" />
                  <span>{event.participantCount}/{event.maxParticipants} players</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="ml-4 flex items-center space-x-3">
              {/* Conditional Share Button */}
              {(event.status === 'completed' || event.status === 'archived') ? (
                /* Share Results Button - For completed/archived events */
                <button
                  onClick={() => setShowResultsShareModal(true)}
                  className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  <FarcasterIcon className="w-4 h-4 mr-2" />
                  Share Results
                </button>
              ) : (
                /* Share Event Button - For upcoming/live events */
                <button
                  onClick={shareEventFrame}
                  className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  <FarcasterIcon className="w-4 h-4 mr-2" />
                  Share Event
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Leaderboard for completed/archived events */}
            {(event.status === 'completed' || event.status === 'archived') && event.participants && event.participants.length > 0 && (
              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    🏆 Final Results
                    <span className="text-sm font-normal text-gray-400">
                      ({event.participants.filter(p => p.status === 'attended' && (p.score !== null || p.placement !== null)).length} ranked)
                    </span>
                  </h2>
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                  {(() => {
                    // Filter and sort participants for leaderboard
                    const rankedParticipants = event.participants
                      .filter(p => p.status === 'attended' && (p.score !== null || p.placement !== null))
                      .sort((a, b) => {
                        // First sort by placement (lower is better)
                        if (a.placement !== null && a.placement !== undefined && b.placement !== null && b.placement !== undefined) {
                          return a.placement - b.placement
                        }
                        if (a.placement !== null && a.placement !== undefined) return -1
                        if (b.placement !== null && b.placement !== undefined) return 1
                        
                        // Then sort by score (higher is better)
                        if (a.score !== null && a.score !== undefined && b.score !== null && b.score !== undefined) {
                          return b.score - a.score
                        }
                        if (a.score !== null && a.score !== undefined) return -1
                        if (b.score !== null && b.score !== undefined) return 1
                        
                        // Finally sort by name
                        return (a.profile.display_name || a.profile.username || '').localeCompare(
                          b.profile.display_name || b.profile.username || ''
                        )
                      })

                    const getPlacementBadge = (placement: number | null | undefined, index: number) => {
                      const position = placement || (index + 1)
                      
                      if (position === 1) {
                        return "🥇 1st"
                      } else if (position === 2) {
                        return "🥈 2nd"
                      } else if (position === 3) {
                        return "🥉 3rd"
                      } else {
                        return `#${position}`
                      }
                    }

                    const getPlacementStyle = (placement: number | null | undefined, index: number) => {
                      const position = placement || (index + 1)
                      
                      if (position === 1) {
                        return "bg-yellow-900/30 border-yellow-600 text-yellow-300"
                      } else if (position === 2) {
                        return "bg-gray-600/30 border-gray-500 text-gray-300"
                      } else if (position === 3) {
                        return "bg-orange-900/30 border-orange-600 text-orange-300"
                      } else {
                        return "bg-gray-800 border-gray-700 text-gray-300"
                      }
                    }

                    return rankedParticipants.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="text-gray-400 text-lg mb-2">No results recorded</div>
                        <div className="text-gray-500 text-sm">
                          No scores or placements were recorded for this event.
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-700">
                        {rankedParticipants.map((participant, index) => (
                          <div 
                            key={participant.id} 
                            className={`p-5 transition-colors duration-200 ${
                              index < 3 ? 'hover:bg-gray-700/50' : 'hover:bg-gray-700/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              {/* Rank and User Info */}
                              <div className="flex items-center space-x-4">
                                {/* Placement Badge */}
                                <div className={`px-3 py-2 rounded-lg border-2 font-bold text-sm min-w-[60px] text-center ${
                                  getPlacementStyle(participant.placement, index)
                                }`}>
                                  {getPlacementBadge(participant.placement, index)}
                                </div>
                                
                                {/* User Avatar and Info */}
                                <img
                                  className="h-12 w-12 rounded-full ring-2 ring-gray-600"
                                  src={participant.profile.pfp_url || '/default-avatar.png'}
                                  alt={participant.profile.display_name || 'User'}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-medium text-white truncate">
                                    {participant.profile.display_name || participant.profile.username}
                                    {participant.role === 'organizer' && (
                                      <span className="ml-2 text-yellow-400 text-sm">👑</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-400 truncate">
                                    @{participant.profile.username}
                                  </div>
                                </div>
                              </div>

                              {/* Score Display */}
                              <div className="text-right">
                                {participant.score !== null && participant.score !== undefined ? (
                                  <div className="text-xl font-bold text-white">
                                    {participant.score.toLocaleString()}
                                  </div>
                                ) : (
                                  <div className="text-gray-500 text-sm">No score</div>
                                )}
                                <div className="text-xs text-gray-400">points</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* Footer Stats */}
                {event.participants.filter(p => p.status === 'attended' && (p.score !== null || p.placement !== null)).length > 0 && (
                  <div className="p-4 border-t border-gray-700 bg-gray-900/50">
                    <div className="flex justify-between items-center text-sm text-gray-400">
                      <span>Total Participants: {event.participants.filter(p => p.status === 'attended').length}</span>
                      <span>Ranked: {event.participants.filter(p => p.status === 'attended' && (p.score !== null || p.placement !== null)).length}</span>
                      <span>
                        Highest Score: {(() => {
                          const scores = event.participants
                            .map(p => p.score || 0)
                            .filter(s => s > 0)
                          return scores.length > 0 ? Math.max(...scores).toLocaleString() : 'N/A'
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Game Info Card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <FaGamepad className="w-5 h-5 mr-2 text-blue-400" />
                Game Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Game</label>
                  <p className="text-white font-medium">{event.game || 'TBD'}</p>
                </div>
                
                {event.gamingPlatform && (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Platform</label>
                    <p className="text-white font-medium flex items-center">
                      {getPlatformIcon(event.gamingPlatform)} 
                      <span className="ml-2">{event.gamingPlatform}</span>
                    </p>
                  </div>
                )}
                
                {event.skillLevel && event.skillLevel !== 'any' && (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Skill Level</label>
                    <p className="text-white font-medium capitalize">{event.skillLevel}</p>
                  </div>
                )}
                
                {/* Live Dashboard Button - Show for organizers when event is live */}
                {isOrganizer && (event.status as Event['status']) === 'live' && (
                  <div className="pt-2 border-t border-gray-700">
                    <Link
                      href={`/events/${eventId}/live`}
                      className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-lg"
                    >
                      <FaPlay className="w-4 h-4 mr-2" />
                      Live Dashboard
                    </Link>
                  </div>
                )}

                {/* Watch Live Button - Show for everyone when event is live */}
                {event.status === 'live' && (
                  <div className={`pt-2 ${isOrganizer ? '' : 'border-t border-gray-700'}`}>
                    <Link
                      href={`/events/${eventId}/watch`}
                      className="w-full flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-lg"
                    >
                      <FaEye className="w-4 h-4 mr-2" />
                      Watch Live
                    </Link>
                  </div>
                )}

                {/* Event Chat Button - Show for participants and organizers */}
                {isUserParticipant && event.chatId && event.status !== 'completed' && event.status !== 'archived' && (
                  <div className="pt-2 border-t border-gray-700">
                    <button
                      onClick={handleJoinEventChat}
                      disabled={chatLoading}
                      className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors font-medium"
                    >
                      {chatLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <FaComments className="w-4 h-4 mr-2" />
                      )}
                      {event.userInEventChat ? 'Event Chat' : 'Join Event Chat'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <FaClock className="w-5 h-5 mr-2 text-green-400" />
                Schedule & Location
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Start Time</label>
                  <p className="text-white font-medium">{startDateTime.date}</p>
                  <p className="text-blue-400 font-medium">{startDateTime.time}</p>
                </div>
                
                {endDateTime && (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">End Time</label>
                    <p className="text-white font-medium">{endDateTime.date}</p>
                    <p className="text-blue-400 font-medium">{endDateTime.time}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Location Type</label>
                  <p className="text-white font-medium capitalize flex items-center">
                    {event.locationType === 'online' && <FaGlobe className="w-4 h-4 mr-2 text-blue-400" />}
                    {event.locationType === 'in_person' && <FaMapMarkerAlt className="w-4 h-4 mr-2 text-red-400" />}
                    {event.locationType === 'hybrid' && <FaGlobe className="w-4 h-4 mr-2 text-purple-400" />}
                    {event.locationType.replace('_', ' ')}
                  </p>
                </div>
                
                {event.connectionDetails && (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Connection Details</label>
                    <p className="text-white bg-gray-700 rounded p-3 font-mono text-sm">
                      {event.connectionDetails}
                    </p>
                  </div>
                )}
                
                {event.physicalLocation && (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Physical Location</label>
                    <p className="text-white font-medium">{event.physicalLocation}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Participants Card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <FaUsers className="w-5 h-5 mr-2 text-purple-400" />
                Participants ({event.participantCount}/{event.maxParticipants})
              </h2>
              
              {event.participants && event.participants.length > 0 ? (
                <div className="space-y-3">
                  {event.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <button
                        onClick={() => router.push(`/profile/${participant.profile.fid}`)}
                        className="flex items-center space-x-3 hover:bg-gray-600 rounded-lg p-2 -m-2 transition-colors"
                      >
                        <img
                          src={participant.profile.pfp_url || '/default-avatar.png'}
                          alt={participant.profile.display_name || participant.profile.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <p className="text-white font-medium">
                            {participant.profile.display_name || participant.profile.username}
                          </p>
                          <p className="text-gray-400 text-sm">@{participant.profile.username}</p>
                        </div>
                      </button>
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(participant.role)}
                        <span className="text-gray-300 text-sm capitalize">
                          {participant.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No participants yet. Be the first to join!</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* RSVP Card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Join Event</h3>
              
              {isUserParticipant ? (
                <div className="space-y-4">
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      {getRoleIcon(event.userParticipation?.role || 'participant')}
                      <span className="text-green-400 font-medium">
                        You're registered as {event.userParticipation?.role || 'participant'}
                      </span>
                    </div>
                    <p className="text-green-300 text-sm">
                      Status: {event.userParticipation?.status?.replace('_', ' ') || 'registered'}
                    </p>
                  </div>
                  
                  {!isOrganizer && (
                    <button
                      onClick={() => handleRSVP('leave')}
                      disabled={rsvpLoading}
                      className="w-full flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors font-medium"
                    >
                      {rsvpLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      ) : (
                        <FaUserMinus className="w-4 h-4 mr-2" />
                      )}
                      Leave Event
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {requiresApproval && (
                    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                      <p className="text-yellow-400 text-sm">
                        This event requires approval from the organizer
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleRSVP('join', 'participant')}
                    disabled={rsvpLoading}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors font-medium"
                  >
                    {rsvpLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      <FaUserPlus className="w-4 h-4 mr-2" />
                    )}
                    Join as Player
                  </button>
                  
                  {event.allowSpectators && (
                    <button
                      onClick={() => handleRSVP('join', 'spectator')}
                      disabled={rsvpLoading}
                      className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors font-medium"
                    >
                      {rsvpLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      ) : (
                        <FaEye className="w-4 h-4 mr-2" />
                      )}
                      Join as Spectator
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Event Info Card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Event Info</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Min Players</span>
                  <span className="text-white">{event.minParticipants}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Max Players</span>
                  <span className="text-white">{event.maxParticipants}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Event Type</span>
                  <span className="text-white capitalize">{event.eventType}</span>
                </div>
                
                {event.registrationDeadline && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Registration Deadline</span>
                    <span className="text-white text-xs">
                      {formatDateTime(event.registrationDeadline).date}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Organizer Actions - Hide for live and archived events */}
            {isOrganizer && !['live', 'archived'].includes(event.status) && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Organizer Actions</h3>
                
                <div className="space-y-4">
                  {/* Current Status Display */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Current Status</span>
                      <div className={`flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(event.status)}`}>
                        {getStatusIcon(event.status)}
                        <span className="ml-1 capitalize">{event.status}</span>
                      </div>
                    </div>
                    
                    {/* Status Description */}
                    <p className="text-gray-300 text-xs">
                      {event.status === 'draft' && 'Event is in draft mode. Publish to make it visible to others.'}
                      {event.status === 'upcoming' && 'Event is published and accepting registrations.'}
                      {event.status === 'live' && 'Event is currently active and in progress.'}
                      {event.status === 'completed' && 'Event has been completed.'}
                      {event.status === 'cancelled' && 'Event has been cancelled.'}
                      {event.status === 'archived' && 'Event has been completed and archived.'}
                    </p>
                  </div>

                  {/* Status Control Buttons */}
                  {getAvailableTransitions(event.status).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-300">Status Controls</h4>
                      {getAvailableTransitions(event.status).map((transition) => {
                        const Icon = transition.icon
                        const isDisabled = !canTransitionToStatus(event.status, transition.status) || statusLoading
                        const isDestructive = transition.status === 'cancelled'
                        
                        return (
                          <div key={transition.status}>
                            <button
                              onClick={() => {
                                if (isDestructive) {
                                  const confirmed = window.confirm(
                                    `Are you sure you want to cancel this event? This action cannot be undone.`
                                  )
                                  if (confirmed) {
                                    handleStatusUpdate(transition.status)
                                  }
                                } else {
                                  handleStatusUpdate(transition.status)
                                }
                              }}
                              disabled={isDisabled}
                              className={`w-full flex items-center justify-center px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm ${
                                isDisabled 
                                  ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                                  : transition.color
                              }`}
                              title={isDisabled && transition.status === 'live' ? 'Event can only be started 30 minutes before scheduled time' : transition.description}
                            >
                              {statusLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <Icon className="w-4 h-4 mr-2" />
                              )}
                              {transition.label}
                            </button>
                            
                            {/* Time restriction warning for live status */}
                            {transition.status === 'live' && !canTransitionToStatus(event.status, 'live') && (
                              <p className="text-yellow-400 text-xs mt-1 flex items-center">
                                <FaExclamationTriangle className="w-3 h-3 mr-1" />
                                Available 30 minutes before start time
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Archive Button - Show for completed events */}
                  {event.status === 'completed' && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-300">Archive Event</h4>
                      <button
                        onClick={() => {
                          const confirmed = window.confirm(
                            'Are you sure you want to archive this event? Archived events are moved to a separate archive section.'
                          )
                          if (confirmed) {
                            handleStatusUpdate('archived')
                          }
                        }}
                        disabled={statusLoading}
                        className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors font-medium text-sm"
                      >
                        {statusLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <FaArchive className="w-4 h-4 mr-2" />
                        )}
                        Archive Event
                      </button>
                    </div>
                  )}

                  {/* Manage Event Button */}
                  <div className="pt-2 border-t border-gray-600">
                    <button 
                      onClick={() => window.location.href = `/events/${eventId}/edit`}
                      className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                      <FaTrophy className="w-4 h-4 mr-2" />
                      Manage Event
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Results Share Modal */}
      {showResultsShareModal && event && (
        <ResultsShareModal
          isOpen={showResultsShareModal}
          onClose={() => setShowResultsShareModal(false)}
          event={event}
          userParticipation={event.participants.find(p => p.userId === event.userParticipation?.userId)}
          leaderboard={event.participants.map(p => ({
            profile: p.profile,
            placement: p.placement || 0,
            score: p.score || null,
            status: p.status
          }))}
          shareType="leaderboard"
        />
      )}
      
      <BottomNavigation />
    </main>
  )
} 