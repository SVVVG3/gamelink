'use client'

import { useState, useMemo } from 'react'
import { useSocialData } from '@/contexts/SocialDataContext'
import FriendCodeDisplay from './FriendCodeDisplay'
import { 
  FaUsers, 
  FaSearch, 
  FaSyncAlt, 
  FaGamepad, 
  FaSpinner
} from 'react-icons/fa'

interface SimpleMutualFollowersDisplayProps {
  className?: string
  initialDisplay?: number
  showSearch?: boolean
  showRefresh?: boolean
  compact?: boolean
  showOnlyGamers?: boolean
}

export default function SimpleMutualFollowersDisplay({
  className = '',
  initialDisplay = 20,
  showSearch = true,
  showRefresh = true,
  compact = false,
  showOnlyGamers = true
}: SimpleMutualFollowersDisplayProps) {
  const { 
    mutualFollowers, 
    gamingFollowers, 
    isLoadingMutuals, 
    isLoadingGamertags, 
    mutualsError, 
    gamertagsError, 
    refreshData 
  } = useSocialData()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [displayCount, setDisplayCount] = useState(initialDisplay)
  const [showOnlyGamersState, setShowOnlyGamersState] = useState(showOnlyGamers)

  // Use the appropriate data source based on filter preference
  const sourceFollowers = showOnlyGamersState ? gamingFollowers : mutualFollowers
  
  // Filter followers based on search term
  const filteredFollowers = useMemo(() => {
    if (!searchTerm.trim()) return sourceFollowers

    const term = searchTerm.toLowerCase()
    return sourceFollowers.filter((follower: any) => 
      follower.username.toLowerCase().includes(term) ||
      (follower.display_name && follower.display_name.toLowerCase().includes(term))
    )
  }, [sourceFollowers, searchTerm])

  // Display followers (limited by displayCount)
  const displayFollowers = useMemo(() => {
    return filteredFollowers.slice(0, displayCount)
  }, [filteredFollowers, displayCount])

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshData()
    } catch (error) {
      console.error('Error refreshing mutual followers:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Toggle gamer filter
  const toggleGamerFilter = () => {
    setShowOnlyGamersState(!showOnlyGamersState)
    setDisplayCount(initialDisplay) // Reset display count when toggling
  }

  // Loading state
  if ((isLoadingMutuals || isLoadingGamertags) && mutualFollowers.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <FaSpinner className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-300">
              {isLoadingMutuals ? 'Loading mutual followers...' : 'Loading gamertags...'}
            </p>
            <p className="text-sm text-gray-500 mt-1">This may take a moment for accounts with many connections</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if ((mutualsError || gamertagsError) && mutualFollowers.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg text-center">
          <p className="text-red-300 mb-2">Error loading mutual followers</p>
          <p className="text-sm text-red-400 mb-4">{mutualsError || gamertagsError}</p>
          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {refreshing ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
              {refreshing ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with stats and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FaUsers className="w-5 h-5 text-blue-400" />
            <span className="text-lg font-semibold text-white">
              {showOnlyGamersState ? 'Gaming Friends' : 'All Mutual Followers'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{filteredFollowers.length} shown</span>
            {searchTerm && <span>• filtered</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Gamer filter toggle */}
          <button
            onClick={toggleGamerFilter}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showOnlyGamersState
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <FaGamepad className="w-4 h-4" />
            {showOnlyGamersState ? 'Gaming Only' : 'Show All'}
          </button>

          {/* Refresh button */}
          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing || isLoadingMutuals || isLoadingGamertags}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <FaSyncAlt className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username or display name..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-blue-400">{mutualFollowers.length}</div>
          <div className="text-xs text-gray-400">Total Mutuals</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-purple-400">{gamingFollowers.length}</div>
          <div className="text-xs text-gray-400">With Gamertags</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-green-400">{filteredFollowers.length}</div>
          <div className="text-xs text-gray-400">Shown</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-yellow-400">{displayFollowers.length}</div>
          <div className="text-xs text-gray-400">Displayed</div>
        </div>
      </div>

      {/* Followers list */}
      {filteredFollowers.length === 0 ? (
        <div className="text-center py-12">
          <FaUsers className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">
            {searchTerm 
              ? 'No followers found matching your search.' 
              : showOnlyGamersState 
                ? 'No gaming followers found.' 
                : 'No mutual followers found.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayFollowers.map((follower: any) => (
            <MutualFollowerCard 
              key={follower.fid} 
              follower={follower} 
              compact={compact} 
            />
          ))}
          
          {/* Load more button */}
          {displayCount < filteredFollowers.length && (
            <div className="text-center pt-4">
              <button
                onClick={() => setDisplayCount(prev => prev + initialDisplay)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Load More ({filteredFollowers.length - displayCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface MutualFollowerCardProps {
  follower: any
  compact?: boolean
}

function MutualFollowerCard({ follower, compact = false }: MutualFollowerCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-4">
        {/* Profile picture */}
        <div className="flex-shrink-0">
          {follower.pfp_url ? (
            <img
              src={follower.pfp_url}
              alt={follower.username}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
              <FaUsers className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Profile info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">
              {follower.display_name || follower.username}
            </h3>
            {follower.gamertags && follower.gamertags.length > 0 && (
              <FaGamepad className="w-4 h-4 text-purple-400 flex-shrink-0" />
            )}
          </div>
          
          <p className="text-sm text-gray-400 mb-3">@{follower.username}</p>

                     {/* Gamertags */}
           {follower.gamertags && follower.gamertags.length > 0 && (
             <div className="flex flex-wrap gap-2">
               {follower.gamertags.slice(0, 3).map((gamertag: any, index: number) => (
                 <span
                   key={index}
                   className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-900/50 text-purple-200 border border-purple-700"
                 >
                   {gamertag.platform}: {gamertag.handle}
                 </span>
               ))}
               {follower.gamertags.length > 3 && (
                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                   +{follower.gamertags.length - 3} more
                 </span>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  )
} 