'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSocialData } from '@/contexts/SocialDataContext'
import { useUser } from '@/hooks/useUser'
import { createDirectChat } from '@/lib/supabase/chats'
import FriendCodeDisplay from './FriendCodeDisplay'
import { 
  FaUsers, 
  FaSearch, 
  FaSyncAlt, 
  FaGamepad, 
  FaSpinner,
  FaEnvelope,
  FaXbox,
  FaTimes
} from 'react-icons/fa'
import { 
  SiPlaystation, 
  SiSteam, 
  SiNintendoswitch, 
  SiEpicgames, 
  SiDiscord, 
  SiRiotgames 
} from 'react-icons/si'

// Platform configuration with icons
const PLATFORMS: Record<string, {
  name: string
  icon: React.ReactNode
  color: string
}> = {
  PSN: {
    name: 'PlayStation Network',
    icon: <SiPlaystation className="w-4 h-4" />,
    color: 'text-blue-500'
  },
  Xbox: {
    name: 'Xbox Live',
    icon: <FaXbox className="w-4 h-4" />,
    color: 'text-green-500'
  },
  Steam: {
    name: 'Steam',
    icon: <SiSteam className="w-4 h-4" />,
    color: 'text-blue-400'
  },
  Nintendo: {
    name: 'Nintendo Switch',
    icon: <SiNintendoswitch className="w-4 h-4" />,
    color: 'text-red-500'
  },
  Epic: {
    name: 'Epic Games',
    icon: <SiEpicgames className="w-4 h-4" />,
    color: 'text-gray-300'
  },
  Discord: {
    name: 'Discord',
    icon: <SiDiscord className="w-4 h-4" />,
    color: 'text-indigo-500'
  },
  Riot: {
    name: 'Riot Games',
    icon: <SiRiotgames className="w-4 h-4" />,
    color: 'text-orange-500'
  },
  PokemonGO: {
    name: 'Pokémon GO',
    icon: <FaGamepad className="w-4 h-4" />,
    color: 'text-yellow-500'
  }
}

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
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  // Use the appropriate data source based on filter preference
  const sourceFollowers = showOnlyGamersState ? gamingFollowers : mutualFollowers
  
  // Filter followers based on search term and selected platforms
  const filteredFollowers = useMemo(() => {
    let filtered = sourceFollowers

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((follower: any) => 
        follower.username.toLowerCase().includes(term) ||
        (follower.displayName && follower.displayName.toLowerCase().includes(term))
      )
    }

    // Apply platform filter
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter((follower: any) => {
        if (!follower.gamertags || follower.gamertags.length === 0) return false
        
        return selectedPlatforms.some(platform => 
          follower.gamertags.some((tag: any) => tag.platform === platform)
        )
      })
    }

    return filtered
  }, [sourceFollowers, searchTerm, selectedPlatforms])

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
    setSelectedPlatforms([]) // Clear platform filters when toggling
  }

  // Toggle platform filter
  const togglePlatformFilter = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
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
      {/* Header */}
      <div className="flex items-center gap-2">
        <FaUsers className="w-5 h-5 text-blue-400" />
        <span className="text-lg font-semibold text-white">Gaming Friends</span>
      </div>

      {/* Stats Section - Moved above search and filters */}
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

      {/* Gaming Only and Refresh buttons - Moved above search */}
      <div className="flex items-center justify-center gap-2">
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

      {/* Gaming Platform Filters with Clear Filters button inline */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(PLATFORMS).map(([platform, { icon, color }]) => (
          <button
            key={platform}
            onClick={() => togglePlatformFilter(platform)}
            className={`flex items-center justify-center p-3 border rounded-lg transition-all group ${
              selectedPlatforms.includes(platform)
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-700 hover:bg-blue-600 border-gray-600 hover:border-blue-500'
            }`}
          >
            <div className={`${selectedPlatforms.includes(platform) ? 'text-white' : color} group-hover:text-white`}>
              {icon}
            </div>
          </button>
        ))}

        {/* Clear Filters button - inline with platform filters */}
        {(selectedPlatforms.length > 0 || searchTerm.trim() !== '') && (
          <button
            onClick={() => {
              setSelectedPlatforms([])
              setSearchTerm('')
            }}
            className="flex items-center justify-center p-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 text-white rounded-lg transition-all"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        )}
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
              currentUserFid={profile?.fid}
              onChatCreated={(chatId) => {
                console.log('Chat created:', chatId)
              }}
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
  currentUserFid?: number
  onChatCreated?: (chatId: string) => void
}

function MutualFollowerCard({ follower, compact = false, currentUserFid, onChatCreated }: MutualFollowerCardProps) {
  const router = useRouter()
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  // Debug: Log follower data to see what we're getting
  console.log('🖼️ Rendering follower card:', {
    username: follower.username,
    displayName: follower.displayName,
    pfpUrl: follower.pfpUrl,
    fid: follower.fid
  })

  const handleViewProfile = () => {
    // Navigate to internal user profile page
    router.push(`/profile/${follower.fid}`)
  }

  const handleSendMessage = async () => {
    if (!currentUserFid) {
      alert('Please sign in to send messages')
      return
    }

    setIsCreatingChat(true)
    try {
      console.log('🔄 Creating direct chat between FIDs:', currentUserFid, 'and', follower.fid)
      const chatId = await createDirectChat(currentUserFid, follower.fid)
      console.log('✅ Chat created successfully:', chatId)
      
      // Navigate to the new chat
      router.push(`/messages/${chatId}`)
      onChatCreated?.(chatId)
    } catch (error) {
      console.error('❌ Error creating chat:', error)
      alert(error instanceof Error ? error.message : 'Failed to create chat')
    } finally {
      setIsCreatingChat(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-4">
        {/* Profile picture */}
        <div className="flex-shrink-0">
          {follower.pfpUrl ? (
            <img
              src={follower.pfpUrl}
              alt={follower.username}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                console.log('❌ Failed to load profile image for:', follower.username, follower.pfpUrl)
                // Replace the image with fallback
                const target = e.target as HTMLImageElement
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                      <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
                      </svg>
                    </div>
                  `
                }
              }}
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
              {follower.displayName || follower.username}
            </h3>
            {follower.gamertags && follower.gamertags.length > 0 && (
              <FaGamepad className="w-4 h-4 text-purple-400 flex-shrink-0" />
            )}
          </div>
          
          <p className="text-sm text-gray-400 mb-3">@{follower.username}</p>

          {/* Platform Icons */}
          {follower.gamertags && follower.gamertags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {follower.gamertags.slice(0, 6).map((gamertag: any, index: number) => {
                const platform = PLATFORMS[gamertag.platform]
                if (!platform) return null
                
                return (
                  <div
                    key={index}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors ${platform.color}`}
                    title={`${platform.name}: Click to view profile for details`}
                  >
                    {platform.icon}
                  </div>
                )
              })}
              {follower.gamertags.length > 6 && (
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-700 text-gray-300 text-xs font-medium">
                  +{follower.gamertags.length - 6}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleViewProfile}
              className="px-3 py-1.5 text-xs font-medium text-blue-400 border border-blue-400 rounded-lg hover:bg-blue-400 hover:text-white transition-colors"
            >
              View Profile
            </button>
            <button
              onClick={handleSendMessage}
              disabled={isCreatingChat}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              {isCreatingChat ? (
                <>
                  <FaSpinner className="w-3 h-3 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FaEnvelope className="w-3 h-3" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 