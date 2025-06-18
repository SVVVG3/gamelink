'use client'

import { ParticipantWithProfile } from './ParticipantTracker'

interface LeaderboardProps {
  participants: ParticipantWithProfile[]
  eventId: string
}

export default function Leaderboard({ participants }: LeaderboardProps) {
  // Filter to participants with scores or placements
  const rankedParticipants = participants
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
      return (a.profiles.display_name || a.profiles.username || '').localeCompare(
        b.profiles.display_name || b.profiles.username || ''
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

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          🏆 Live Leaderboard
          <span className="text-sm font-normal text-gray-400">
            ({rankedParticipants.length} ranked)
          </span>
        </h2>
      </div>

      {/* Leaderboard */}
      <div className="max-h-[500px] overflow-y-auto">
        {rankedParticipants.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-lg mb-2">No rankings yet</div>
            <div className="text-gray-500 text-sm">
              Rankings will appear here as organizers input scores and placements.
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
        )}
      </div>

      {/* Footer Stats */}
      {rankedParticipants.length > 0 && (
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>Total Participants: {participants.filter(p => p.status === 'attended').length}</span>
            <span>Ranked: {rankedParticipants.length}</span>
            <span>
              Highest Score: {Math.max(...rankedParticipants
                .map(p => p.score || 0)
                .filter(s => s > 0)
              ).toLocaleString() || 'N/A'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
} 