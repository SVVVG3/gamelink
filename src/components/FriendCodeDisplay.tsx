'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { 
  getGamertagsByProfileId, 
  getPublicGamertagsByProfileId,
  type Gamertag, 
  type Platform 
} from '@/lib/supabase/gamertags'
import { 
  SiPlaystation, 
  SiSteam, 
  SiNintendoswitch, 
  SiEpicgames, 
  SiDiscord, 
  SiRiotgames 
} from 'react-icons/si'
import { FaGamepad, FaXbox, FaCopy, FaCheck } from 'react-icons/fa'

interface FriendCodeDisplayProps {
  profileId?: string        // If not provided, shows current user
  showPrivate?: boolean     // Whether to show private gamertags (only for current user)
  compact?: boolean         // Compact view for smaller spaces
  maxItems?: number         // Limit number of items shown
  onPlatformClick?: (platform: Platform, gamertag: string) => void
}

// Platform configuration with icons and colors
const PLATFORMS: Record<Platform, {
  name: string
  icon: React.ReactNode
  color: string
}> = {
  PSN: {
    name: 'PlayStation Network',
    icon: <SiPlaystation className="w-5 h-5" />,
    color: 'text-blue-500'
  },
  Xbox: {
    name: 'Xbox Live',
    icon: <FaXbox className="w-5 h-5" />,
    color: 'text-green-500'
  },
  Steam: {
    name: 'Steam',
    icon: <SiSteam className="w-5 h-5" />,
    color: 'text-blue-400'
  },
  Nintendo: {
    name: 'Nintendo Switch',
    icon: <SiNintendoswitch className="w-5 h-5" />,
    color: 'text-red-500'
  },
  Epic: {
    name: 'Epic Games',
    icon: <SiEpicgames className="w-5 h-5" />,
    color: 'text-gray-300'
  },
  Discord: {
    name: 'Discord',
    icon: <SiDiscord className="w-5 h-5" />,
    color: 'text-indigo-500'
  },
  Riot: {
    name: 'Riot Games',
    icon: <SiRiotgames className="w-5 h-5" />,
    color: 'text-orange-500'
  },
  PokemonGO: {
    name: 'Pokémon GO',
    icon: <FaGamepad className="w-5 h-5" />,
    color: 'text-yellow-500'
  }
}

export default function FriendCodeDisplay({ 
  profileId, 
  showPrivate = false, 
  compact = false, 
  maxItems,
  onPlatformClick 
}: FriendCodeDisplayProps) {
  const { profile } = useUser()
  const [gamertags, setGamertags] = useState<Gamertag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedGamertag, setCopiedGamertag] = useState<string | null>(null)

  // Determine which profile to show
  const targetProfileId = profileId || profile?.id
  const isCurrentUser = !profileId || profileId === profile?.id

  // Load gamertags
  useEffect(() => {
    const loadGamertags = async () => {
      if (!targetProfileId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        let data: Gamertag[]
        
        if (isCurrentUser && showPrivate) {
          // Show all gamertags for current user
          data = await getGamertagsByProfileId(targetProfileId)
        } else {
          // Show only public gamertags
          data = await getPublicGamertagsByProfileId(targetProfileId)
        }

        // Apply maxItems limit if specified
        if (maxItems && data.length > maxItems) {
          data = data.slice(0, maxItems)
        }

        setGamertags(data)
      } catch (err) {
        console.error('Error loading gamertags:', err)
        setError(err instanceof Error ? err.message : 'Failed to load gamertags')
      } finally {
        setIsLoading(false)
      }
    }

    loadGamertags()
  }, [targetProfileId, isCurrentUser, showPrivate, maxItems])

  // Copy gamertag to clipboard
  const copyToClipboard = async (gamertag: string, platform: Platform) => {
    try {
      await navigator.clipboard.writeText(gamertag)
      setCopiedGamertag(`${platform}-${gamertag}`)
      console.log(`✅ Copied ${platform} gamertag to clipboard: ${gamertag}`)
      setTimeout(() => setCopiedGamertag(null), 2000)
    } catch (err) {
      console.error('❌ Failed to copy to clipboard:', err)
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea')
        textArea.value = gamertag
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopiedGamertag(`${platform}-${gamertag}`)
        console.log(`✅ Copied ${platform} gamertag to clipboard (fallback): ${gamertag}`)
        setTimeout(() => setCopiedGamertag(null), 2000)
      } catch (fallbackErr) {
        console.error('❌ Fallback copy also failed:', fallbackErr)
      }
    }
  }

  // Handle platform click
  const handlePlatformClick = (platform: Platform, gamertag: string) => {
    if (onPlatformClick) {
      onPlatformClick(platform, gamertag)
    } else {
      copyToClipboard(gamertag, platform)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-3 ${compact ? 'space-y-2' : 'space-y-3'}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className={`flex items-center space-x-3 p-3 bg-gray-800 rounded-lg ${compact ? 'p-2' : 'p-3'}`}>
              <div className="w-6 h-6 bg-gray-700 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-20 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-32"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
        <p className="text-sm text-red-300">Error loading gamertags: {error}</p>
      </div>
    )
  }

  // Empty state
  if (gamertags.length === 0) {
    return (
      <div className={`text-center py-6 bg-gray-800 rounded-lg border border-gray-700 ${compact ? 'py-4' : 'py-6'}`}>
        <FaGamepad className="w-8 h-8 text-gray-500 mx-auto mb-2" />
        <p className={`text-gray-300 mb-1 ${compact ? 'text-sm' : 'text-base'}`}>
          {isCurrentUser ? 'No gamertags added yet' : 'No public gamertags'}
        </p>
        <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
          {isCurrentUser ? 'Add your gaming platform usernames to connect with friends!' : 'This user hasn\'t shared any public gamertags'}
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${compact ? 'space-y-2' : 'space-y-3'}`}>
      {gamertags.map((gamertag) => {
        const platform = PLATFORMS[gamertag.platform]
        const copyId = `${gamertag.platform}-${gamertag.gamertag}`
        const isCopied = copiedGamertag === copyId

        return (
          <div 
            key={gamertag.id} 
            className={`group flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer ${compact ? 'p-2' : 'p-3'}`}
            onClick={() => handlePlatformClick(gamertag.platform, gamertag.gamertag)}
            title={`Click to copy ${gamertag.gamertag} to clipboard`}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 ${platform.color}`}>
                {platform.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-white ${compact ? 'text-sm' : 'text-base'}`}>
                  {gamertag.platform}
                </div>
                <div className={`text-gray-300 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                  {gamertag.gamertag}
                </div>
                {!compact && (
                  <div className="flex items-center space-x-2 mt-1">
                    {gamertag.is_public ? (
                      <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded border border-green-700">
                        Public
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded border border-gray-600">
                        Private
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-shrink-0 ml-3">
              {isCopied ? (
                <FaCheck className="w-4 h-4 text-green-400" />
              ) : (
                <FaCopy className="w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-colors" />
              )}
            </div>
          </div>
        )
      })}
      
      {maxItems && gamertags.length === maxItems && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-400">
            Showing {maxItems} of your gamertags
          </p>
        </div>
      )}
    </div>
  )
} 