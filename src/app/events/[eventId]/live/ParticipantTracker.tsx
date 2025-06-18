'use client'

import { useState } from 'react'
import { EventParticipant } from '@/types'
import { Profile } from '@/lib/supabase/profiles'

export interface ParticipantWithProfile extends EventParticipant {
  profiles: Profile
}

interface ParticipantTrackerProps {
  participants: ParticipantWithProfile[]
  eventId: string
  onParticipantUpdate: (participants: ParticipantWithProfile[]) => void
}

export default function ParticipantTracker({ 
  participants, 
  eventId, 
  onParticipantUpdate 
}: ParticipantTrackerProps) {
  const [loadingParticipant, setLoadingParticipant] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter participants based on search
  const filteredParticipants = participants.filter(participant => 
    participant.profiles.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.profiles.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group participants by status
  const participantsByStatus = {
    confirmed: filteredParticipants.filter(p => p.status === 'confirmed'),
    attended: filteredParticipants.filter(p => p.status === 'attended'),
    no_show: filteredParticipants.filter(p => p.status === 'no_show'),
    registered: filteredParticipants.filter(p => p.status === 'registered'),
  }

  // Update participant status
  const updateParticipantStatus = async (participantId: string, newStatus: string) => {
    setLoadingParticipant(participantId)
    
    try {
      // Get current user FID from the user context
      const userFid = (window as any).farcasterUser?.fid
      if (!userFid) {
        throw new Error('User not authenticated')
      }

      const response = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          userFid: userFid 
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update participant status')
      }

      const updatedParticipant = await response.json()
      
      // Update local state
      const updatedParticipants = participants.map(p => 
        p.id === participantId ? { ...p, ...updatedParticipant } : p
      )
      
      onParticipantUpdate(updatedParticipants)
    } catch (error) {
      console.error('Error updating participant:', error)
      alert('Failed to update participant status')
    } finally {
      setLoadingParticipant(null)
    }
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'attended':
        return `${baseClasses} bg-green-900/20 text-green-300 border border-green-700`
      case 'confirmed':
        return `${baseClasses} bg-blue-900/20 text-blue-300 border border-blue-700`
      case 'no_show':
        return `${baseClasses} bg-red-900/20 text-red-300 border border-red-700`
      case 'registered':
        return `${baseClasses} bg-yellow-900/20 text-yellow-300 border border-yellow-700`
      default:
        return `${baseClasses} bg-gray-800 text-gray-300 border border-gray-600`
    }
  }

  // Status statistics
  const stats = {
    total: participants.length,
    attended: participantsByStatus.attended.length,
    confirmed: participantsByStatus.confirmed.length,
    no_show: participantsByStatus.no_show.length,  
    registered: participantsByStatus.registered.length,
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      {/* Header Section */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">
              Participants ({stats.total})
            </h2>
            
            {/* Stats Cards - More Prominent */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-900/20 border border-green-700 rounded-lg px-4 py-3 text-center flex flex-col items-center justify-center">
                <div className="text-green-300 font-bold text-xl">{stats.attended}</div>
                <div className="text-green-400 text-xs uppercase tracking-wide font-medium">Present</div>
              </div>
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg px-4 py-3 text-center flex flex-col items-center justify-center">
                <div className="text-blue-300 font-bold text-xl">{stats.confirmed}</div>
                <div className="text-blue-400 text-xs uppercase tracking-wide font-medium">Confirmed</div>
              </div>
              <div className="bg-red-900/20 border border-red-700 rounded-lg px-4 py-3 text-center flex flex-col items-center justify-center">
                <div className="text-red-300 font-bold text-xl">{stats.no_show}</div>
                <div className="text-red-400 text-xs uppercase tracking-wide font-medium whitespace-nowrap">No Show</div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="Search participants by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Participant List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredParticipants.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-lg mb-2">
              {searchTerm ? 'No participants found' : 'No participants yet'}
            </div>
            <div className="text-gray-500 text-sm">
              {searchTerm ? 'Try adjusting your search terms.' : 'Participants will appear here when they join the event.'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredParticipants.map((participant) => (
              <div key={participant.id} className="p-5 hover:bg-gray-700/30 transition-colors duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-center space-x-4">
                    <img
                      className="h-12 w-12 rounded-full ring-2 ring-gray-600"
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
                      {/* Additional Info */}
                      {(participant.score !== null || participant.placement !== null) && (
                        <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                          {participant.score !== null && (
                            <span className="bg-gray-700 px-2 py-1 rounded">Score: {participant.score}</span>
                          )}
                          {participant.placement !== null && (
                            <span className="bg-gray-700 px-2 py-1 rounded">#{participant.placement}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <span className={getStatusBadge(participant.status)}>
                      {participant.status.replace('_', ' ')}
                    </span>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2">
                      {participant.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => updateParticipantStatus(participant.id, 'attended')}
                            disabled={loadingParticipant === participant.id}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingParticipant === participant.id ? '⏳' : '✓ Present'}
                          </button>
                          <button
                            onClick={() => updateParticipantStatus(participant.id, 'no_show')}
                            disabled={loadingParticipant === participant.id}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingParticipant === participant.id ? '⏳' : '✗ No Show'}
                          </button>
                        </>
                      )}
                      
                      {participant.status === 'attended' && (
                        <button
                          onClick={() => updateParticipantStatus(participant.id, 'confirmed')}
                          disabled={loadingParticipant === participant.id}
                          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingParticipant === participant.id ? '⏳' : '↶ Undo'}
                        </button>
                      )}

                      {participant.status === 'registered' && (
                        <>
                          <button
                            onClick={() => updateParticipantStatus(participant.id, 'attended')}
                            disabled={loadingParticipant === participant.id}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingParticipant === participant.id ? '⏳' : '✓ Present'}
                          </button>
                          <button
                            onClick={() => updateParticipantStatus(participant.id, 'no_show')}
                            disabled={loadingParticipant === participant.id}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingParticipant === participant.id ? '⏳' : '✗ No Show'}
                          </button>
                        </>
                      )}

                      {participant.status === 'no_show' && (
                        <button
                          onClick={() => updateParticipantStatus(participant.id, 'confirmed')}
                          disabled={loadingParticipant === participant.id}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingParticipant === participant.id ? '⏳' : '↻ Restore'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 