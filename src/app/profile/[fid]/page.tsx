'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useSocialData } from '@/contexts/SocialDataContext'
import { createDirectChat } from '@/lib/supabase/chats'
import { 
  FaUsers, 
  FaGamepad, 
  FaEnvelope, 
  FaSpinner, 
  FaArrowLeft,
  FaCopy,
  FaExternalLinkAlt,
  FaXbox
} from 'react-icons/fa'
import { 
  SiPlaystation, 
  SiSteam, 
  SiNintendoswitch, 
  SiEpicgames, 
  SiDiscord, 
  SiRiotgames 
} from 'react-icons/si'
import { useFarcasterSDK } from '@/components/FarcasterSDKProvider'

interface UserProfile {
  fid: number
  username: string
  display_name?: string
  bio?: string
  pfp_url?: string
  gamertags?: Array<{
    platform: string
    handle: string
    display_name?: string
  }>
}

// Platform configuration with icons and colors
const PLATFORMS: Record<string, {
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

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { profile: currentUser } = useUser()
  const { mutualFollowers, isLoadingMutuals } = useSocialData()
  const { isSDKLoaded, isInFarcaster } = useFarcasterSDK()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedGamertag, setCopiedGamertag] = useState<string | null>(null)

  const fid = params.fid ? parseInt(params.fid as string) : null

  // Check if current user and profile user are mutuals using cached data
  const areMutuals = (() => {
    if (!currentUser?.fid || !fid) return false
    if (currentUser.fid === fid) return true // User viewing their own profile
    
    // Check if the profile user's FID is in our cached mutual followers
    return mutualFollowers.some(mutual => mutual.fid === fid)
  })()

  const isCheckingMutuals = isLoadingMutuals

  useEffect(() => {
    if (!fid || isNaN(fid)) {
      setError('Invalid user ID')
      setIsLoading(false)
      return
    }

    const fetchUserProfile = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch user profile from Neynar API
        const response = await fetch(`/api/farcaster/user/${fid}`)
        if (!response.ok) {
          throw new Error('Failed to fetch user profile')
        }

        const userData = await response.json()
        
        // Fetch user's gamertags
        const gamertagsResponse = await fetch('/api/gamertags/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fids: [fid] }),
        })

        let gamertags = []
        if (gamertagsResponse.ok) {
          const gamertagsData = await gamertagsResponse.json()
          gamertags = gamertagsData.gamertags[fid] || []
        }

        setUserProfile({
          fid: userData.fid,
          username: userData.username,
          display_name: userData.display_name,
          bio: userData.bio,
          pfp_url: userData.pfp_url,
          gamertags
        })
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [fid])

  const handleSendMessage = async () => {
    if (!currentUser?.fid) {
      alert('Please sign in to send messages')
      return
    }

    if (!userProfile) return

    setIsCreatingChat(true)
    try {
      console.log('🔄 Creating direct chat between FIDs:', currentUser.fid, 'and', userProfile.fid)
      const chatId = await createDirectChat(currentUser.fid, userProfile.fid)
      console.log('✅ Chat created successfully:', chatId)
      
      // Navigate to the new chat
      router.push(`/messages/${chatId}`)
    } catch (error) {
      console.error('❌ Error creating chat:', error)
      alert(error instanceof Error ? error.message : 'Failed to create chat')
    } finally {
      setIsCreatingChat(false)
    }
  }

  const handleCopyGamertag = async (platform: string, handle: string) => {
    try {
      await navigator.clipboard.writeText(handle)
      setCopiedGamertag(`${platform}:${handle}`)
      setTimeout(() => setCopiedGamertag(null), 2000)
    } catch (err) {
      console.error('Failed to copy gamertag:', err)
    }
  }

  const handleViewOnFarcaster = async () => {
    if (userProfile) {
      const farcasterUrl = `https://warpcast.com/${userProfile.username}`
      
      // Use Farcaster SDK if available and in Farcaster environment
      if (isSDKLoaded && isInFarcaster) {
        try {
          const { sdk } = await import('@farcaster/frame-sdk')
          await sdk.actions.openUrl(farcasterUrl)
        } catch (error) {
          console.error('Failed to open URL with Farcaster SDK:', error)
          // Fallback to window.open if SDK fails
          window.open(farcasterUrl, '_blank')
        }
      } else {
        // Fallback for non-Farcaster environments
        window.open(farcasterUrl, '_blank')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-300 mb-4">{error || 'Profile not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">User Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              {userProfile.pfp_url ? (
                <img
                  src={userProfile.pfp_url}
                  alt={userProfile.username}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center">
                  <FaUsers className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {userProfile.display_name || userProfile.username}
                  </h2>
                  <p className="text-gray-400 mb-3">@{userProfile.username}</p>
                  {userProfile.bio && (
                    <p className="text-gray-300 mb-4">{userProfile.bio}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleViewOnFarcaster}
                    className="flex items-center gap-2 px-4 py-2 text-blue-400 border border-blue-400 rounded-lg hover:bg-blue-400 hover:text-white transition-colors"
                  >
                    <FaExternalLinkAlt className="w-4 h-4" />
                    View on Farcaster
                  </button>
                  
                  {/* Only show Send Message button if users are mutuals and not viewing own profile */}
                  {currentUser?.fid !== userProfile.fid && areMutuals && (
                    <button
                      onClick={handleSendMessage}
                      disabled={isCreatingChat}
                      className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isCreatingChat ? (
                        <>
                          <FaSpinner className="w-4 h-4 animate-spin" />
                          Creating Chat...
                        </>
                      ) : (
                        <>
                          <FaEnvelope className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Non-Mutuals Message */}
        {currentUser?.fid && currentUser.fid !== userProfile.fid && !isCheckingMutuals && !areMutuals && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6 text-center">
            <FaUsers className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Connect on Farcaster</h3>
            <p className="text-gray-400 mb-4">
              You need to be mutual followers with {userProfile.display_name || userProfile.username} to see their gaming profiles and send messages.
            </p>
            <p className="text-sm text-gray-500">
              Follow each other on Farcaster to unlock these features!
            </p>
          </div>
        )}

        {/* Loading Mutuals Check */}
        {isCheckingMutuals && currentUser?.fid && currentUser.fid !== userProfile.fid && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6 text-center">
            <FaSpinner className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Checking mutual connection...</p>
          </div>
        )}

        {/* Gamertags Section - Only show for mutuals or own profile */}
        {(areMutuals || currentUser?.fid === userProfile.fid) && userProfile.gamertags && userProfile.gamertags.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <FaGamepad className="w-5 h-5 text-purple-400" />
              <h3 className="text-xl font-semibold">Gaming Profiles</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userProfile.gamertags.map((gamertag, index) => {
                const platform = PLATFORMS[gamertag.platform] || {
                  name: gamertag.platform,
                  icon: <FaGamepad className="w-5 h-5" />,
                  color: 'text-gray-400'
                }
                
                return (
                  <div
                    key={index}
                    className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`flex-shrink-0 ${platform.color}`}>
                          {platform.icon}
                        </div>
                        <span className="text-sm font-medium text-white">
                          {gamertag.platform}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyGamertag(gamertag.platform, gamertag.handle)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Copy gamertag"
                      >
                        <FaCopy className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <p className="text-white font-mono text-sm break-all mb-2">
                      {gamertag.handle}
                    </p>
                    
                    {gamertag.display_name && (
                      <p className="text-gray-400 text-xs mt-1">
                        {gamertag.display_name}
                      </p>
                    )}
                    
                    {copiedGamertag === `${gamertag.platform}:${gamertag.handle}` && (
                      <p className="text-green-400 text-xs mt-1">Copied!</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* No Gamertags Message */}
        {(areMutuals || currentUser?.fid === userProfile.fid) && (!userProfile.gamertags || userProfile.gamertags.length === 0) && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
            <FaGamepad className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No gaming profiles found for this user.</p>
          </div>
        )}
      </div>
    </div>
  )
} 