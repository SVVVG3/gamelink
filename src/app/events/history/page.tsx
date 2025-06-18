'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import BottomNavigation from '@/components/BottomNavigation'
import { 
  FaCalendarAlt, 
  FaTrophy, 
  FaUsers, 
  FaGamepad, 
  FaChartLine, 
  FaFilter,
  FaArrowLeft,
  FaFire,
  FaCrown,
  FaChartBar
} from 'react-icons/fa'
import FarcasterIcon from '@/components/FarcasterIcon'
import Link from 'next/link'
import { Event, EventParticipant, Profile } from '@/types'

interface EventHistoryData {
  events: EventWithParticipation[]
  statistics: UserStatistics
  trends: PerformanceTrends
  achievements: Achievement[]
}

interface EventWithParticipation extends Event {
  participation: EventParticipant & { profile: Profile }
  participantCount: number
  finalRanking?: number
}

interface UserStatistics {
  totalEvents: number
  eventsAttended: number
  eventsOrganized: number
  eventsWon: number
  averageScore: number
  averagePlacement: number
  attendanceRate: number
  favoriteGame: string
  totalScore: number
  bestPlacement: number
  currentStreak: number
  longestStreak: number
}

interface PerformanceTrends {
  scoreHistory: { date: string; score: number; event: string }[]
  placementHistory: { date: string; placement: number; event: string }[]
  attendanceHistory: { month: string; attended: number; registered: number }[]
  gamePerformance: { game: string; averageScore: number; averagePlacement: number; events: number }[]
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export default function EventHistoryPage() {
  const { isAuthenticated, isLoading, profile } = useUser()
  const [historyData, setHistoryData] = useState<EventHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'trends' | 'achievements'>('overview')
  const [gameFilter, setGameFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'placement'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (isAuthenticated && profile) {
      fetchEventHistory()
    }
  }, [isAuthenticated, profile])

  const fetchEventHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/history?userId=${profile?.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch event history')
      }

      const data = await response.json()
      setHistoryData(data)
    } catch (error) {
      console.error('Error fetching event history:', error)
      setError('Failed to load event history')
    } finally {
      setLoading(false)
    }
  }

  const shareStats = async () => {
    if (!historyData || !profile) return
    
    const stats = historyData.statistics
    const shareText = `🎮 My Gaming Stats on GameLink!\n\n🏆 Events Participated: ${stats.totalEvents}\n✅ Events Attended: ${stats.eventsAttended}\n👑 Events Organized: ${stats.eventsOrganized}\n🥇 Events Won: ${stats.eventsWon}\n📊 Attendance Rate: ${Math.round(stats.attendanceRate)}%\n🎯 Average Score: ${stats.averageScore}\n${stats.favoriteGame ? `🎮 Favorite Game: ${stats.favoriteGame}` : ''}\n\nJoin me on /gamelink! 🕹️`
    
    // Create the frame URL for mini app embed (use main app URL since we don't have a specific profile frame)
    const baseUrl = window.location.origin
    const appFrameUrl = `${baseUrl}/`
    
    // Try to use Farcaster SDK if available (Mini App context)
    try {
      const { sdk } = await import('@farcaster/frame-sdk')
      
      // Check if we're in a Mini App context by trying to get context
      const context = await sdk.context
      if (context && context.client) {
        const result = await sdk.actions.composeCast({
          text: shareText,
          embeds: [appFrameUrl]
        })
        
        if (result?.cast) {
          console.log('Stats shared successfully:', result.cast.hash)
        }
        return
      }
    } catch (error) {
      console.error('Farcaster SDK not available, using web fallback:', error)
    }
    
    // Fallback for standalone web app - open Warpcast
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(appFrameUrl)}`
    window.open(farcasterUrl, '_blank')
  }

  // Filter and sort events
  const filteredEvents = historyData?.events.filter(event => {
    const matchesGame = !gameFilter || event.game === gameFilter
    const matchesStatus = !statusFilter || event.participation.status === statusFilter
    return matchesGame && matchesStatus
  }).sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        break
      case 'score':
        comparison = (a.participation.score || 0) - (b.participation.score || 0)
        break
      case 'placement':
        comparison = (a.participation.placement || 999) - (b.participation.placement || 999)
        break
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  }) || []

  // Get unique games for filter
  const uniqueGames = Array.from(new Set(historyData?.events.map(e => e.game).filter(Boolean))) || []

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign In Required</h1>
          <p className="text-gray-400 mb-6">You need to be signed in to view your event history.</p>
          <Link
            href="/auth"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={fetchEventHistory}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!historyData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  const { statistics, trends, achievements } = historyData

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="p-4 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Link
                href="/events"
                className="flex items-center text-gray-300 hover:text-white transition-colors"
              >
                <FaArrowLeft className="w-4 h-4 mr-2" />
                Back to Events
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Event History & Analytics</h1>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={shareStats}
                className="flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors w-full sm:w-auto justify-center"
              >
                <FarcasterIcon className="w-4 h-4 mr-2" />
                Share Stats
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 bg-gray-700 rounded-lg p-1">
            {[
              { id: 'overview', label: 'Overview', icon: FaChartLine },
              { id: 'events', label: 'Events', icon: FaCalendarAlt },
              { id: 'trends', label: 'Trends', icon: FaChartBar },
              { id: 'achievements', label: 'Achievements', icon: FaTrophy }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none justify-center ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <FaCalendarAlt className="w-6 h-6 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{statistics.totalEvents}</span>
                </div>
                <div className="text-sm text-gray-400">Total Events</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <FaUsers className="w-6 h-6 text-green-400" />
                  <span className="text-2xl font-bold text-white">{statistics.eventsAttended}</span>
                </div>
                <div className="text-sm text-gray-400">Attended</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <FaCrown className="w-6 h-6 text-yellow-400" />
                  <span className="text-2xl font-bold text-white">{statistics.eventsOrganized}</span>
                </div>
                <div className="text-sm text-gray-400">Organized</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <FaTrophy className="w-6 h-6 text-purple-400" />
                  <span className="text-2xl font-bold text-white">{statistics.eventsWon}</span>
                </div>
                <div className="text-sm text-gray-400">Won</div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Attendance Rate</span>
                    <span className="text-green-400 font-medium">{statistics.attendanceRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Average Score</span>
                    <span className="text-blue-400 font-medium">{statistics.averageScore}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Average Placement</span>
                    <span className="text-yellow-400 font-medium">#{statistics.averagePlacement}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Best Placement</span>
                    <span className="text-purple-400 font-medium">#{statistics.bestPlacement}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Activity Streaks</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Current Streak</span>
                    <div className="flex items-center">
                      <FaFire className="w-4 h-4 text-orange-400 mr-2" />
                      <span className="text-orange-400 font-medium">{statistics.currentStreak} events</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Longest Streak</span>
                    <div className="flex items-center">
                      <FaFire className="w-4 h-4 text-red-400 mr-2" />
                      <span className="text-red-400 font-medium">{statistics.longestStreak} events</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Favorite Game</span>
                    <span className="text-gray-100 font-medium">{statistics.favoriteGame || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Score</span>
                    <span className="text-blue-400 font-medium">{statistics.totalScore}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <>
            {/* Filters */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <FaFilter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Filters:</span>
                </div>

                <select
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm"
                >
                  <option value="">All Games</option>
                  {uniqueGames.map(game => (
                    <option key={game} value={game}>{game}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm"
                >
                  <option value="">All Status</option>
                  <option value="attended">Attended</option>
                  <option value="no_show">No Show</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm"
                >
                  <option value="date">Sort by Date</option>
                  <option value="score">Sort by Score</option>
                  <option value="placement">Sort by Placement</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-600"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* Events List */}
            <div className="space-y-4">
              {filteredEvents.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                  <FaCalendarAlt className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Events Found</h3>
                  <p className="text-gray-400">No events match your current filters.</p>
                </div>
              ) : (
                filteredEvents.map(event => (
                  <div key={event.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Link
                            href={`/events/${event.id}`}
                            className="text-lg font-semibold text-white hover:text-blue-400 transition-colors"
                          >
                            {event.title}
                          </Link>
                          {event.participation.role === 'organizer' && (
                            <FaCrown className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
                          <div className="flex items-center">
                            <FaCalendarAlt className="w-4 h-4 mr-1" />
                            {new Date(event.startTime).toLocaleDateString()}
                          </div>
                          {event.game && (
                            <div className="flex items-center">
                              <FaGamepad className="w-4 h-4 mr-1" />
                              {event.game}
                            </div>
                          )}
                          <div className="flex items-center">
                            <FaUsers className="w-4 h-4 mr-1" />
                            {event.participantCount} participants
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.participation.status === 'attended'
                              ? 'bg-green-900/20 text-green-300 border border-green-700'
                              : event.participation.status === 'no_show'
                              ? 'bg-red-900/20 text-red-300 border border-red-700'
                              : 'bg-gray-700 text-gray-300 border border-gray-600'
                          }`}>
                            {event.participation.status.replace('_', ' ')}
                          </span>
                          
                          {event.participation.role === 'organizer' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/20 text-yellow-300 border border-yellow-700">
                              Organizer
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      {(event.participation.score !== null || event.participation.placement !== null) && (
                        <div className="flex items-center space-x-6 text-sm">
                          {event.participation.score !== null && (
                            <div className="text-center">
                              <div className="text-blue-400 font-bold text-lg">{event.participation.score}</div>
                              <div className="text-gray-400">Score</div>
                            </div>
                          )}
                          {event.participation.placement !== null && (
                            <div className="text-center">
                              <div className="text-yellow-400 font-bold text-lg">#{event.participation.placement}</div>
                              <div className="text-gray-400">Rank</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            {/* Game Performance */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Performance by Game</h3>
              <div className="space-y-4">
                {trends.gamePerformance.length === 0 ? (
                  <p className="text-gray-400">No game performance data available.</p>
                ) : (
                  trends.gamePerformance.map(game => (
                    <div key={game.game} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-white">{game.game}</div>
                        <div className="text-sm text-gray-400">{game.events} events</div>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-400 font-medium">Avg Score: {game.averageScore}</div>
                        <div className="text-yellow-400 font-medium">Avg Rank: #{game.averagePlacement}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Performance Trends */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Performance</h3>
              <div className="space-y-3">
                {trends.scoreHistory.slice(0, 10).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-white">{entry.event}</div>
                      <div className="text-sm text-gray-400">{new Date(entry.date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-blue-400 font-bold">{entry.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.length === 0 ? (
                <div className="col-span-full bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                  <FaTrophy className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Achievements Yet</h3>
                  <p className="text-gray-400">Participate in more events to unlock achievements!</p>
                </div>
              ) : (
                achievements.map(achievement => (
                  <div key={achievement.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="text-center">
                      <div className="text-4xl mb-3">{achievement.icon}</div>
                      <h4 className="font-semibold text-white mb-2">{achievement.title}</h4>
                      <p className="text-gray-400 text-sm mb-3">{achievement.description}</p>
                      <div className="flex items-center justify-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          achievement.rarity === 'legendary'
                            ? 'bg-purple-900/20 text-purple-300 border border-purple-700'
                            : achievement.rarity === 'epic'
                            ? 'bg-orange-900/20 text-orange-300 border border-orange-700'
                            : achievement.rarity === 'rare'
                            ? 'bg-blue-900/20 text-blue-300 border border-blue-700'
                            : 'bg-gray-700 text-gray-300 border border-gray-600'
                        }`}>
                          {achievement.rarity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
} 