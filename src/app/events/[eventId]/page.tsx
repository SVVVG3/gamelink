'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Metadata } from 'next'
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
  FaDiscord,
  FaGlobe,
  FaLock,
  FaUnlock
} from 'react-icons/fa'
import { FaShield } from 'react-icons/fa6'
import Link from 'next/link'
import { Event, EventParticipant, Profile } from '@/types'

interface EventWithDetails extends Event {
  participants: (EventParticipant & { profile: Profile })[]
  participantCount: number
  organizer: Profile
  userParticipation?: EventParticipant
}

export default function EventDetailsPage() {
  const params = useParams()
  const { isAuthenticated, isLoading, profile } = useUser()
  const [event, setEvent] = useState<EventWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState(false)

  const eventId = params.eventId as string

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

  const shareEventFrame = () => {
    if (!event) return
    
    // Create a shareable frame URL
    const frameUrl = `${window.location.origin}/api/frames/events/${eventId}`
    const shareText = `🎮 Join me for ${event.title}!\n\nGame: ${event.game}\nDate: ${formatDateTime(event.startTime).date} at ${formatDateTime(event.startTime).time}\n\n`
    
    // Open Farcaster with the frame URL
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(frameUrl)}`
    window.open(farcasterUrl, '_blank')
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'organizer': return <FaCrown className="w-4 h-4 text-yellow-400" />
      case 'moderator': return <FaShield className="w-4 h-4 text-blue-400" />
      case 'spectator': return <FaEye className="w-4 h-4 text-gray-400" />
      default: return <FaGamepad className="w-4 h-4 text-green-400" />
    }
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
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Event Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game & Platform Info */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <FaGamepad className="w-5 h-5 mr-2 text-blue-400" />
                Game Details
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {event.game && (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Game</label>
                    <p className="text-white font-medium">{event.game}</p>
                  </div>
                )}
                
                {event.gamingPlatform && (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Platform</label>
                    <p className="text-white font-medium flex items-center">
                      <span className="mr-2">{getPlatformIcon(event.gamingPlatform)}</span>
                      {event.gamingPlatform}
                    </p>
                  </div>
                )}
                
                {event.skillLevel && (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Skill Level</label>
                    <p className="text-white font-medium capitalize">{event.skillLevel}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Squad Size</label>
                  <p className="text-white font-medium">
                    {event.minParticipants === event.maxParticipants 
                      ? `${event.maxParticipants} players`
                      : `${event.minParticipants}-${event.maxParticipants} players`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Schedule & Location */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
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

            {/* Participants List */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <FaUsers className="w-5 h-5 mr-2 text-purple-400" />
                Participants ({event.participantCount}/{event.maxParticipants})
              </h2>
              
              {event.participants.length > 0 ? (
                <div className="space-y-3">
                  {event.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={participant.profile.pfp_url || '/default-avatar.png'}
                          alt={participant.profile.display_name || participant.profile.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="text-white font-medium">
                            {participant.profile.display_name || participant.profile.username}
                          </p>
                          <p className="text-gray-400 text-sm capitalize">
                            {participant.role || 'participant'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(participant.role || 'participant')}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          participant.status === 'confirmed' ? 'bg-green-900/20 text-green-400' :
                          participant.status === 'pending_approval' ? 'bg-yellow-900/20 text-yellow-400' :
                          'bg-gray-600 text-gray-300'
                        }`}>
                          {participant.status?.replace('_', ' ') || 'registered'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No participants yet. Be the first to join!
                </p>
              )}
            </div>
          </div>

          {/* Sidebar - RSVP & Actions */}
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
              ) : canJoin ? (
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
              ) : (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <p className="text-red-400 text-sm">
                    {event.participantCount >= event.maxParticipants 
                      ? 'Event is full' 
                      : 'Unable to join this event'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Event Settings */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Event Settings</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Requires Approval</span>
                  <span className={event.requireApproval ? 'text-yellow-400' : 'text-green-400'}>
                    {event.requireApproval ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Allow Spectators</span>
                  <span className={event.allowSpectators ? 'text-green-400' : 'text-red-400'}>
                    {event.allowSpectators ? 'Yes' : 'No'}
                  </span>
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

            {/* Organizer Actions */}
            {isOrganizer && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Organizer Actions</h3>
                
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm">
                    <FaTrophy className="w-4 h-4 mr-2" />
                    Manage Event
                  </button>
                  
                  <button 
                    onClick={() => shareEventFrame()}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    <FaDiscord className="w-4 h-4 mr-2" />
                    Share on Farcaster
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </main>
  )
} 