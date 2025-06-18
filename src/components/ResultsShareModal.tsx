'use client'

import { useState } from 'react'
import { Event, EventParticipant, Profile } from '@/types'
import { Achievement, generateEventResultsShareText, generateLeaderboardShareText, generateAchievementShareText } from '@/lib/achievements'
import FarcasterIcon from '@/components/FarcasterIcon'
import { 
  FaTimes, 
  FaTrophy, 
  FaMedal, 
  FaUsers, 
  FaGamepad,
  FaShare,
  FaCrown,
  FaStar
} from 'react-icons/fa'

interface ResultsShareModalProps {
  isOpen: boolean
  onClose: () => void
  event: Event
  userParticipation?: EventParticipant & { profile: Profile }
  leaderboard: Array<{ profile: Profile; placement: number; score: number | null; status: string }>
  achievements?: Achievement[]
  shareType?: 'results' | 'leaderboard' | 'achievement'
}

export default function ResultsShareModal({
  isOpen,
  onClose,
  event,
  userParticipation,
  leaderboard,
  achievements = [],
  shareType = 'results'
}: ResultsShareModalProps) {
  const [selectedShareType, setSelectedShareType] = useState<'results' | 'leaderboard' | 'achievement'>(shareType)
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(achievements[0] || null)
  const [isSharing, setIsSharing] = useState(false)

  if (!isOpen) return null

  const topParticipants = leaderboard
    .filter(p => p.placement && p.placement <= 3)
    .sort((a, b) => (a.placement || 0) - (b.placement || 0))

  const totalParticipants = leaderboard.filter(p => p.status === 'attended').length

  const shareContent = async () => {
    if (isSharing) return
    setIsSharing(true)

    try {
      let shareText = ''
      const baseUrl = window.location.origin
      const eventUrl = `${baseUrl}/events/${event.id}`
      // Use the actual event page URL for proper mini app navigation
      const embedUrl = eventUrl

      if (selectedShareType === 'results' && userParticipation) {
        shareText = generateEventResultsShareText(
          event,
          userParticipation.placement || null,
          userParticipation.score || null,
          totalParticipants,
          userParticipation.profile.username
        )
      } else if (selectedShareType === 'leaderboard') {
        shareText = generateLeaderboardShareText(event, topParticipants, totalParticipants)
      } else if (selectedShareType === 'achievement' && selectedAchievement) {
        shareText = generateAchievementShareText(selectedAchievement, userParticipation?.profile.username || 'Player')
      }

      // Try to use Farcaster SDK if available (Mini App context)
      try {
        const { sdk } = await import('@farcaster/frame-sdk')
        
        // Check if we're in a Mini App context
        const context = await sdk.context
        if (context && context.client) {
          const result = await sdk.actions.composeCast({
            text: shareText,
            embeds: [embedUrl]
          })
          
          if (result?.cast) {
            console.log('Results shared successfully:', result.cast.hash)
          }
          return
        }
      } catch (error) {
        console.error('Farcaster SDK not available, using web fallback:', error)
      }
      
      // Fallback for standalone web app - open Warpcast with event embed
      const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(embedUrl)}`
      window.open(farcasterUrl, '_blank')
      
    } catch (error) {
      console.error('Error sharing results:', error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <FaShare className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Share Results</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Event Info */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <FaGamepad className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">{event.title}</h3>
            </div>
            {event.game && (
              <p className="text-gray-300 text-sm">🕹️ {event.game}</p>
            )}
            <p className="text-gray-400 text-sm">
              📅 {new Date(event.startTime).toLocaleDateString()}
            </p>
          </div>

          {/* Share Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {userParticipation && (
              <button
                onClick={() => setSelectedShareType('results')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedShareType === 'results'
                    ? 'border-purple-500 bg-purple-900/20 text-purple-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <FaTrophy className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">My Results</div>
                <div className="text-xs text-gray-400">
                  {userParticipation.placement ? `#${userParticipation.placement}` : 'Participated'}
                </div>
              </button>
            )}

            <button
              onClick={() => setSelectedShareType('leaderboard')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedShareType === 'leaderboard'
                  ? 'border-purple-500 bg-purple-900/20 text-purple-300'
                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              <FaCrown className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Leaderboard</div>
              <div className="text-xs text-gray-400">Top 3 Results</div>
            </button>

            {achievements.length > 0 && (
              <button
                onClick={() => setSelectedShareType('achievement')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedShareType === 'achievement'
                    ? 'border-purple-500 bg-purple-900/20 text-purple-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <FaMedal className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Achievement</div>
                <div className="text-xs text-gray-400">New Badge</div>
              </button>
            )}
          </div>

          {/* Preview */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Preview:</h4>
            
            {selectedShareType === 'results' && userParticipation && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  {userParticipation.placement === 1 && <span className="text-2xl">🥇</span>}
                  {userParticipation.placement === 2 && <span className="text-2xl">🥈</span>}
                  {userParticipation.placement === 3 && <span className="text-2xl">🥉</span>}
                  {userParticipation.placement && userParticipation.placement > 3 && (
                    <FaTrophy className="w-5 h-5 text-yellow-400" />
                  )}
                  <div>
                    <div className="text-white font-medium">
                      {userParticipation.placement === 1 && '1st Place Winner!'}
                      {userParticipation.placement === 2 && '2nd Place!'}
                      {userParticipation.placement === 3 && '3rd Place!'}
                      {userParticipation.placement && userParticipation.placement > 3 && 
                        `Placed #${userParticipation.placement} of ${totalParticipants}`}
                      {!userParticipation.placement && 'Participated'}
                    </div>
                    {userParticipation.score && (
                      <div className="text-gray-400 text-sm">Score: {userParticipation.score}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedShareType === 'leaderboard' && (
              <div className="space-y-2">
                {topParticipants.map((participant, index) => {
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <div key={participant.profile.id} className="flex items-center space-x-3">
                      <span className="text-xl">{medals[index]}</span>
                      <img
                        src={participant.profile.pfp_url || '/default-avatar.png'}
                        alt={participant.profile.display_name || participant.profile.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">
                          {participant.profile.display_name || participant.profile.username}
                        </div>
                        {participant.score && (
                          <div className="text-gray-400 text-xs">{participant.score} points</div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div className="text-gray-400 text-sm mt-3">
                  👥 {totalParticipants} total participants
                </div>
              </div>
            )}

            {selectedShareType === 'achievement' && selectedAchievement && (
              <div className="space-y-3">
                {achievements.length > 1 && (
                  <select
                    value={selectedAchievement.id}
                    onChange={(e) => {
                      const achievement = achievements.find(a => a.id === e.target.value)
                      if (achievement) setSelectedAchievement(achievement)
                    }}
                    className="w-full bg-gray-600 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    {achievements.map((achievement) => (
                      <option key={achievement.id} value={achievement.id}>
                        {achievement.icon} {achievement.title}
                      </option>
                    ))}
                  </select>
                )}
                
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{selectedAchievement.icon}</div>
                  <div>
                    <div className="text-white font-medium">{selectedAchievement.title}</div>
                    <div className="text-gray-400 text-sm">{selectedAchievement.description}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <FaStar className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400 text-xs">+{selectedAchievement.points} points</span>
                      <span className={`px-2 py-1 rounded text-xs capitalize ${
                        selectedAchievement.rarity === 'common' ? 'bg-gray-700 text-gray-300' :
                        selectedAchievement.rarity === 'rare' ? 'bg-blue-700 text-blue-300' :
                        selectedAchievement.rarity === 'epic' ? 'bg-purple-700 text-purple-300' :
                        'bg-yellow-700 text-yellow-300'
                      }`}>
                        {selectedAchievement.rarity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Share Button */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={shareContent}
              disabled={isSharing}
              className="flex items-center space-x-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg font-medium transition-colors"
            >
              {isSharing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <FarcasterIcon className="w-4 h-4" />
                  <span>Share on Farcaster</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 