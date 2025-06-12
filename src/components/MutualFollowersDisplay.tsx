'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import { useSocialData } from '@/contexts/SocialDataContext'
import FriendCodeDisplay from './FriendCodeDisplay'
import { 
  FaUsers, 
  FaSearch, 
  FaSyncAlt, 
  FaGamepad, 
  FaUserFriends,
  FaCheckCircle,
  FaSpinner
} from 'react-icons/fa'

interface MutualFollowerWithProfile {
  fid: number
  username: string
  display_name?: string
  pfp_url?: string
  gamertags?: Array<{
    platform: string
    handle: string
    is_public?: boolean
  }>
  hasGamertags?: boolean
}

interface MutualFollowersDisplayProps {
  className?: string
  initialDisplay?: number
  showSearch?: boolean
  showRefresh?: boolean
  compact?: boolean
  showOnlyGamers?: boolean
}

export default function MutualFollowersDisplay({
  className = '',
  initialDisplay = 20,
  showSearch = true,
  showRefresh = true,
  compact = false,
  showOnlyGamers = true
}: MutualFollowersDisplayProps) {
  const { profile } = useUser()
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
  
  // Add hasGamertags flag to followers
  const followersWithProfiles: MutualFollowerWithProfile[] = useMemo(() => {
    return sourceFollowers.map((follower: any) => ({
      ...follower,
      hasGamertags: follower.gamertags && follower.gamertags.length > 0
    }))
  }, [sourceFollowers])

  // Filter followers based on search term
  const filteredFollowers = useMemo(() => {
    let filtered = followersWithProfiles

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(follower => 
        follower.username.toLowerCase().includes(term) ||
        (follower.display_name && follower.display_name.toLowerCase().includes(term))
      )
    }

    return filtered
  }, [followersWithProfiles, searchTerm])

  // Display followers (limited by displayCount)
  const displayFollowers = useMemo(() => {
    return filteredFollowers.slice(0, displayCount)
  }, [filteredFollowers, displayCount])

  // Count followers with and without gamertags
  const gamerCount = useMemo(() => {
    return followersWithProfiles.filter(f => f.hasGamertags).length
  }, [followersWithProfiles])

  const nonGamerCount = useMemo(() => {
    return followersWithProfiles.filter(f => !f.hasGamertags).length
  }, [followersWithProfiles])

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

  // No mutual followers
  if (mutualFollowers.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <FaUserFriends className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No Mutual Followers Found</h3>
          <p className="text-gray-500 mb-4">
            You don't have any mutual followers yet, or they haven't been loaded.
          </p>
          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors inline-flex items-center space-x-2"
            >
              {refreshing ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
              <span>{refreshing ? 'Loading...' : 'Load Mutual Followers'}</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // No gamers found (when filtering by gamers only)
  if (showOnlyGamersState && gamerCount === 0 && mutualFollowers.length > 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Header with stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <FaUsers className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-bold text-white">Mutual Followers</h2>
              <div className="text-sm text-gray-400 space-y-1">
                <p>{mutualFollowers.length} total connections</p>
                <p className="flex items-center space-x-4">
                  <span className="text-gray-500">🎮 0 with gaming profiles</span>
                  <span className="text-gray-400">👤 {nonGamerCount} without gaming profiles</span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleGamerFilter}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm font-medium"
            >
              👥 Show All
            </button>
            {showRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                title="Refresh mutual followers"
              >
                {refreshing || loading ? (
                  <FaSpinner className="w-4 h-4 animate-spin" />
                ) : (
                  <FaSyncAlt className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* No gamers message */}
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <FaGamepad className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No Gaming Profiles Found</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            None of your {mutualFollowers.length} mutual followers have set up gaming profiles yet. 
            Encourage them to join GameLink and share their gamertags!
          </p>
          <div className="space-y-3">
                         <button
               onClick={toggleGamerFilter}
               className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center space-x-2"
             >
               <FaUsers className="w-4 h-4" />
               <span>View All {mutualFollowers.length} Mutuals</span>
             </button>
            <p className="text-xs text-gray-500">
              You can still connect with them and invite them to set up their gaming profiles
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
            {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <FaUsers className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-bold text-white">Mutual Followers</h2>
            <div className="text-sm text-gray-400 space-y-1">
              <p>
                {mutualFollowers.length} total connections
                {lastUpdated && (
                  <span className="ml-2">
                    • Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
              <p className="flex items-center space-x-4">
                <span className="text-green-400">
                  🎮 {gamerCount} with gaming profiles
                </span>
                <span className="text-gray-500">
                  👤 {nonGamerCount} without gaming profiles
                </span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Gamer filter toggle */}
          <button
            onClick={toggleGamerFilter}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              showOnlyGamersState
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={showOnlyGamersState ? 'Show all followers' : 'Show only gamers'}
          >
            {showOnlyGamersState ? '🎮 Gamers Only' : '👥 Show All'}
          </button>

          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              title="Refresh mutual followers"
            >
              {refreshing || loading ? (
                <FaSpinner className="w-4 h-4 animate-spin" />
              ) : (
                <FaSyncAlt className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && mutualFollowers.length > 5 && (
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search mutual followers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Results summary */}
      {searchTerm && (
        <div className="text-sm text-gray-400">
          Showing {displayFollowers.length} of {filteredFollowers.length} results
          {filteredFollowers.length !== mutualFollowers.length && (
            <span> (filtered from {mutualFollowers.length} total)</span>
          )}
        </div>
      )}

      {/* Followers list */}
      <div className="space-y-4">
        {displayFollowers.map((follower) => (
          <MutualFollowerCard
            key={follower.fid}
            follower={follower}
            compact={compact}
            isLoadingProfile={loadingProfiles.has(follower.fid)}
          />
        ))}
      </div>

      {/* Load more section */}
      {filteredFollowers.length > displayCount && (
        <div className="text-center py-6 border-t border-gray-700">
          <p className="text-gray-400 mb-4">
            Showing {displayCount} of {filteredFollowers.length} {showOnlyGamersState ? 'gaming' : ''} connections
          </p>
          <button
            onClick={() => setDisplayCount(prev => prev + 20)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center space-x-2"
          >
            <span>Load More</span>
            <span className="text-sm opacity-75">(+20)</span>
          </button>
        </div>
      )}
    </div>
  )
}

// Individual mutual follower card component
interface MutualFollowerCardProps {
  follower: MutualFollowerWithProfile
  compact?: boolean
  isLoadingProfile?: boolean
}

function MutualFollowerCard({ follower, compact = false, isLoadingProfile = false }: MutualFollowerCardProps) {
  const [showGamertags, setShowGamertags] = useState(false)

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
      {/* Profile header */}
      <div className={`p-4 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-start space-x-3">
          {/* Profile picture */}
          <div className="flex-shrink-0">
            <img
              src={follower.pfpUrl}
              alt={`${follower.displayName}'s profile`}
              className={`rounded-full ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${follower.fid}`
              }}
            />
          </div>

          {/* Profile info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className={`font-semibold text-white truncate ${compact ? 'text-sm' : 'text-base'}`}>
                {follower.displayName}
              </h3>
              {follower.isVerified && (
                <FaCheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
            </div>
            
            <p className={`text-gray-400 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
              @{follower.username}
            </p>
            
            {follower.bio && !compact && (
              <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                {follower.bio}
              </p>
            )}
            
            <div className={`flex items-center space-x-4 text-gray-500 ${compact ? 'text-xs mt-1' : 'text-sm mt-2'}`}>
              <span>{follower.followerCount.toLocaleString()} followers</span>
              <span>{follower.followingCount.toLocaleString()} following</span>
            </div>
          </div>

          {/* Gamertags toggle */}
          <div className="flex-shrink-0">
            {isLoadingProfile ? (
              <div className="p-2">
                <FaSpinner className="w-4 h-4 text-gray-400 animate-spin" />
              </div>
            ) : follower.profile ? (
              <button
                onClick={() => setShowGamertags(!showGamertags)}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                title={showGamertags ? 'Hide gamertags' : 'Show gamertags'}
              >
                <FaGamepad className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-2 text-gray-500" title="No gaming profile found">
                <FaGamepad className="w-4 h-4 opacity-50" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gamertags section */}
      {showGamertags && follower.profile && (
        <div className="border-t border-gray-700 p-4 bg-gray-900/50">
          <div className="flex items-center space-x-2 mb-3">
            <FaGamepad className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-medium text-white">Gaming Profiles</h4>
          </div>
          
          <FriendCodeDisplay
            profileId={follower.profile.id}
            showPrivate={false}
            compact={true}
            maxItems={8}
          />
        </div>
      )}
    </div>
  )
} 