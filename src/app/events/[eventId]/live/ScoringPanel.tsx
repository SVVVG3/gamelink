'use client'

import { useState, useEffect } from 'react'
import { ParticipantWithProfile } from './ParticipantTracker'
import { useUser } from '@/hooks/useUser'

interface ScoringPanelProps {
  participants: ParticipantWithProfile[]
  eventId: string
  onScoreUpdate: (participants: ParticipantWithProfile[]) => void
}

export default function ScoringPanel({ participants, eventId, onScoreUpdate }: ScoringPanelProps) {
  const { farcasterProfile } = useUser()
  const [loadingParticipant, setLoadingParticipant] = useState<string | null>(null)
  const [scoringMode, setScoringMode] = useState<'individual' | 'batch'>('individual')
  const [searchTerm, setSearchTerm] = useState('')
  const [localScores, setLocalScores] = useState<{[key: string]: {score: string, placement: string}}>({})
  const [updateTimeouts, setUpdateTimeouts] = useState<{[key: string]: NodeJS.Timeout}>({})
  
  // Initialize local scores when participants change
  useEffect(() => {
    const newLocalScores: {[key: string]: {score: string, placement: string}} = {}
    participants.forEach(p => {
      newLocalScores[p.id] = {
        score: p.score?.toString() || '',
        placement: p.placement?.toString() || ''
      }
    })
    setLocalScores(newLocalScores)
  }, [participants])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(updateTimeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
    }
  }, [updateTimeouts])

  // Filter participants to only those who attended
  const attendedParticipants = participants.filter(p => p.status === 'attended')
  
  // Filter by search term
  const filteredParticipants = attendedParticipants.filter(participant =>
    participant.profiles.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.profiles.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort participants by current placement/score
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
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
    return (a.profiles.display_name || a.profiles.username || '').localeCompare(
      b.profiles.display_name || b.profiles.username || ''
    )
  })

  // Debounced update function to prevent keyboard loss
  const debouncedUpdate = (participantId: string, field: 'score' | 'placement', value: string) => {
    // Clear existing timeout for this participant
    if (updateTimeouts[participantId]) {
      clearTimeout(updateTimeouts[participantId])
    }

    // Update local state immediately for responsive UI
    setLocalScores(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [field]: value
      }
    }))

    // Set new timeout for API update
    const timeout = setTimeout(() => {
      const currentLocal = localScores[participantId] || { score: '', placement: '' }
      const updatedLocal = { ...currentLocal, [field]: value }
      
      const score = updatedLocal.score ? parseInt(updatedLocal.score) : null
      const placement = updatedLocal.placement ? parseInt(updatedLocal.placement) : null
      
      updateParticipantScore(participantId, score, placement)
    }, 1000) // 1 second delay

    setUpdateTimeouts(prev => ({
      ...prev,
      [participantId]: timeout
    }))
  }

  const updateParticipantScore = async (participantId: string, score: number | null, placement: number | null) => {
    if (!farcasterProfile?.fid) return

    setLoadingParticipant(participantId)
    
    try {
      const response = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score,
          placement,
          userFid: farcasterProfile.fid,
          updateType: 'scoring'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update participant score')
      }

      const responseData = await response.json()
      const updatedParticipant = responseData.participant
      
      console.log('✅ Participant score updated:', {
        participantId,
        score,
        placement,
        updatedParticipant
      })
      
      // Update local state with the updated participant data
      const updatedParticipants = participants.map(p => 
        p.id === participantId ? { ...p, ...updatedParticipant } : p
      )
      
      onScoreUpdate(updatedParticipants)
    } catch (error) {
      console.error('Error updating participant score:', error)
      alert('Failed to update participant score')
    } finally {
      setLoadingParticipant(null)
    }
  }

  const autoCalculateRankings = () => {
    // Sort by score (highest first) and assign placements
    const sortedByScore = [...attendedParticipants]
      .filter(p => p.score !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0))

    // Update placements based on scores
    sortedByScore.forEach((participant, index) => {
      const newPlacement = index + 1
      if (participant.placement !== newPlacement) {
        updateParticipantScore(participant.id, participant.score ?? null, newPlacement)
      }
    })
  }

  const clearAllScores = () => {
    if (!confirm('Are you sure you want to clear all scores and placements? This action cannot be undone.')) {
      return
    }

    attendedParticipants.forEach(participant => {
      if (participant.score !== null || participant.placement !== null) {
        updateParticipantScore(participant.id, null, null)
      }
    })
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      {/* Header Section */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">
              🏆 Scoring & Results ({attendedParticipants.length} participants)
            </h2>
            
            {/* Scoring Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScoringMode('individual')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scoringMode === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setScoringMode('batch')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scoringMode === 'batch'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Batch Actions
              </button>
            </div>
          </div>

          {/* Batch Actions */}
          {scoringMode === 'batch' && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={autoCalculateRankings}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                🔄 Auto-Calculate Rankings
              </button>
              <button
                onClick={clearAllScores}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                🗑️ Clear All Scores
              </button>
            </div>
          )}

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
              placeholder="Search participants to score..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Scoring List */}
      <div className="max-h-[600px] overflow-y-auto">
        {sortedParticipants.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-lg mb-2">
              {searchTerm ? 'No participants found' : 'No participants to score'}
            </div>
            <div className="text-gray-500 text-sm">
              {searchTerm 
                ? 'Try adjusting your search terms.' 
                : 'Only participants marked as "Present" can receive scores.'
              }
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {sortedParticipants.map((participant, index) => (
              <div key={participant.id} className="p-5 hover:bg-gray-700/30 transition-colors duration-200">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* User Info with Current Ranking */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-white font-bold text-sm">
                      {participant.placement || (index + 1)}
                    </div>
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
                    </div>
                  </div>

                  {/* Scoring Inputs */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Score Input */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-300 whitespace-nowrap">Score:</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={localScores[participant.id]?.score || ''}
                        onChange={(e) => debouncedUpdate(participant.id, 'score', e.target.value)}
                        disabled={loadingParticipant === participant.id}
                      />
                    </div>

                    {/* Placement Input */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-300 whitespace-nowrap">Place:</label>
                      <input
                        type="number"
                        placeholder="1"
                        min="1"
                        className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={localScores[participant.id]?.placement || ''}
                        onChange={(e) => debouncedUpdate(participant.id, 'placement', e.target.value)}
                        disabled={loadingParticipant === participant.id}
                      />
                    </div>

                    {/* Loading Indicator */}
                    {loadingParticipant === participant.id && (
                      <div className="text-blue-400 text-sm">⏳ Updating...</div>
                    )}
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