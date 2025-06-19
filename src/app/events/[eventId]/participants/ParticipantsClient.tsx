'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { Event, EventParticipant, Profile } from '@/types'
import { FaArrowLeft, FaCrown, FaUserMinus, FaUsers, FaSearch, FaUserCheck, FaUserTimes, FaGamepad } from 'react-icons/fa'
import Link from 'next/link'
import BottomNavigation from '@/components/BottomNavigation'

interface ParticipantsClientProps {
  eventId: string
}

interface ParticipantWithProfile extends EventParticipant {
  profile: Profile
}

interface EventWithParticipants extends Event {
  participants: ParticipantWithProfile[]
}

export default function ParticipantsClient({ eventId }: ParticipantsClientProps) {
  const router = useRouter()
  const { profile, isAuthenticated, isLoading: userLoading } = useUser()
  const [event, setEvent] = useState<EventWithParticipants | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!userLoading && isAuthenticated && profile) {
      fetchEvent()
    }
  }, [eventId, profile, userLoading, isAuthenticated])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}?userFid=${profile?.fid}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch event')
      }

      const data = await response.json()
      setEvent(data.event)
    } catch (err) {
      console.error('Error fetching event:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!profile || !event) return
    
    const confirmed = window.confirm(`Are you sure you want to remove ${participantName} from this event?`)
    if (!confirmed) return

    try {
      setActionLoading(participantId)
      
      const response = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
          userFid: profile.fid
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove participant')
      }

      // Refresh the event data
      await fetchEvent()
    } catch (err) {
      console.error('Error removing participant:', err)
      alert(err instanceof Error ? err.message : 'Failed to remove participant')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateParticipantStatus = async (participantId: string, newStatus: string) => {
    if (!profile) return

    try {
      setActionLoading(participantId)
      
      const response = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          userFid: profile.fid
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update participant')
      }

      // Refresh the event data
      await fetchEvent()
    } catch (err) {
      console.error('Error updating participant:', err)
      alert(err instanceof Error ? err.message : 'Failed to update participant')
    } finally {
      setActionLoading(null)
    }
  }

  const navigateBack = async () => {
    // Check if we came from the event page by looking at the referrer or defaulting to event page
    // Always go back to the event page since this is accessed from the event's "Manage Participants" button
    router.push(`/events/${eventId}`)
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400">Please sign in to view event participants.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Event Not Found</h1>
          <p className="text-gray-400">The event you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  // Check if user is the event organizer
  const isOrganizer = event.createdBy === profile.id

  if (!isOrganizer) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-400">Only event organizers can manage participants.</p>
          <button
            onClick={() => router.push(`/events/${eventId}`)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Event
          </button>
        </div>
      </div>
    )
  }

  // Filter participants based on search term
  const filteredParticipants = event.participants.filter(participant =>
    participant.profile.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.profile.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400'
      case 'attended': return 'text-blue-400'
      case 'no_show': return 'text-red-400'
      case 'cancelled': return 'text-gray-500'
      case 'pending_approval': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <FaUserCheck className="w-4 h-4" />
      case 'attended': return <FaGamepad className="w-4 h-4" />
      case 'no_show': return <FaUserTimes className="w-4 h-4" />
      case 'cancelled': return <FaUserMinus className="w-4 h-4" />
      default: return <FaUsers className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          {/* Back Button and Title Row */}
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={navigateBack}
              className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Event Details
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Manage Participants</h1>
              <p className="text-gray-400">{event.title}</p>
            </div>
          </div>
          
          {/* Participant Count Row */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <FaUsers className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium">{event.participants.length} Participants</span>
              </div>
              <div className="text-gray-400">
                Max: {event.maxParticipants}
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {event.participants.filter(p => p.status === 'confirmed').length} confirmed
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Participants List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Event Participants</h2>
          </div>
          
          <div className="divide-y divide-gray-700">
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((participant) => (
                <div key={participant.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link
                      href={`/profile/${participant.profile.fid}`}
                      className="flex items-center space-x-3 hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors"
                    >
                      <img
                        src={participant.profile.pfp_url || '/default-avatar.png'}
                        alt={participant.profile.display_name || participant.profile.username}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-white font-medium">
                            {participant.profile.display_name || participant.profile.username}
                          </p>
                          {participant.role === 'organizer' && (
                            <FaCrown className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">@{participant.profile.username}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusIcon(participant.status)}
                          <span className={`text-sm ${getStatusColor(participant.status)}`}>
                            {participant.status.replace('_', ' ')}
                          </span>
                          {participant.role !== 'participant' && (
                            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                              {participant.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Actions */}
                  {participant.role !== 'organizer' && (
                    <div className="flex items-center space-x-2">
                      {participant.status === 'pending_approval' && (
                        <button
                          onClick={() => handleUpdateParticipantStatus(participant.id, 'confirmed')}
                          disabled={actionLoading === participant.id}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors text-sm"
                        >
                          {actionLoading === participant.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            'Approve'
                          )}
                        </button>
                      )}
                      
                      {participant.status !== 'cancelled' && (
                        <button
                          onClick={() => handleRemoveParticipant(
                            participant.id, 
                            participant.profile.display_name || participant.profile.username
                          )}
                          disabled={actionLoading === participant.id}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors text-sm"
                        >
                          {actionLoading === participant.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            'Remove'
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <FaUsers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  {searchTerm ? 'No participants match your search.' : 'No participants yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  )
} 