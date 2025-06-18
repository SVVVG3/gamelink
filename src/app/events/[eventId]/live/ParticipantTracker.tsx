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
      const response = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
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
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Participants ({stats.total})
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              <span className="text-green-400 font-medium">{stats.attended}</span> attended
            </div>
            <div className="text-sm text-gray-300">
              <span className="text-blue-400 font-medium">{stats.confirmed}</span> confirmed
            </div>
            <div className="text-sm text-gray-300">
              <span className="text-red-400 font-medium">{stats.no_show}</span> no-show
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {filteredParticipants.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            {searchTerm ? 'No participants found matching your search.' : 'No participants yet.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredParticipants.map((participant) => (
              <div key={participant.id} className="p-4 hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      className="h-10 w-10 rounded-full"
                      src={participant.profiles.pfp_url || '/default-avatar.png'}
                      alt={participant.profiles.display_name || 'User'}
                    />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {participant.profiles.display_name || participant.profiles.username}
                      </div>
                      <div className="text-sm text-gray-400">
                        @{participant.profiles.username}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={getStatusBadge(participant.status)}>
                      {participant.status.replace('_', ' ')}
                    </span>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center space-x-1">
                      {participant.status === 'confirmed' && (
                        <button
                          onClick={() => updateParticipantStatus(participant.id, 'attended')}
                          disabled={loadingParticipant === participant.id}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                        >
                          {loadingParticipant === participant.id ? '...' : 'Mark Present'}
                        </button>
                      )}
                      
                      {participant.status === 'attended' && (
                        <button
                          onClick={() => updateParticipantStatus(participant.id, 'confirmed')}
                          disabled={loadingParticipant === participant.id}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                        >
                          {loadingParticipant === participant.id ? '...' : 'Undo'}
                        </button>
                      )}

                      {(participant.status === 'confirmed' || participant.status === 'registered') && (
                        <button
                          onClick={() => updateParticipantStatus(participant.id, 'no_show')}
                          disabled={loadingParticipant === participant.id}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                        >
                          {loadingParticipant === participant.id ? '...' : 'No Show'}
                        </button>
                      )}

                      {participant.status === 'no_show' && (
                        <button
                          onClick={() => updateParticipantStatus(participant.id, 'confirmed')}
                          disabled={loadingParticipant === participant.id}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                        >
                          {loadingParticipant === participant.id ? '...' : 'Restore'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {(participant.score !== null || participant.placement !== null) && (
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-400">
                    {participant.score !== null && (
                      <span>Score: {participant.score}</span>
                    )}
                    {participant.placement !== null && (
                      <span>Placement: #{participant.placement}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 