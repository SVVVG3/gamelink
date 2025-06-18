'use client'

import { useUser } from '@/hooks/useUser'
import { useSignIn } from '@farcaster/auth-kit'
import SimpleMutualFollowersDisplay from '@/components/SimpleMutualFollowersDisplay'
import BottomNavigation from '@/components/BottomNavigation'
import Link from 'next/link'
import { FaArrowLeft, FaUsers, FaGamepad } from 'react-icons/fa'

export default function FriendsPage() {
  const { isAuthenticated, isLoading, farcasterProfile, profile } = useUser()
  const { } = useSignIn({
    onSuccess: ({ fid, username }) => {
      console.log(`Signed in as ${username} (FID: ${fid})`);
    },
  })

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900">
        <div className="text-center space-y-6 sm:space-y-8 max-w-md mx-auto">
          <div>
            <FaUsers className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Gaming Friends
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 px-2">
              Sign in to see your mutual followers and their gaming profiles
            </p>
          </div>
          
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-300">Loading your profile...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 pb-20">
      <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              🎮 Gaming Friends
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              Connect with mutual followers who share your gaming passion
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {(farcasterProfile?.pfpUrl || profile?.pfp_url) && (
              <img
                src={farcasterProfile?.pfpUrl || profile?.pfp_url || ''}
                alt="Your profile"
                className="w-10 h-10 rounded-full ring-2 ring-blue-500"
              />
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">
                {farcasterProfile?.displayName || profile?.display_name}
              </p>
              <p className="text-xs text-gray-400">
                @{farcasterProfile?.username || profile?.username}
              </p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <FaUsers className="w-8 h-8 text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Mutual Followers</h3>
                <p className="text-sm text-blue-200">
                  People who follow you and you follow back
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <FaGamepad className="w-8 h-8 text-purple-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Gaming Profiles</h3>
                <p className="text-sm text-purple-200">
                  See their PSN, Xbox, Steam, and other gamertags
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🚀</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Connect & Play</h3>
                <p className="text-sm text-green-200">
                  Copy gamertags and start gaming together
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gaming Profile Filters */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 sm:p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Filter by Gaming Platform</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <button className="flex flex-col items-center p-3 bg-gray-700 hover:bg-blue-600 border border-gray-600 hover:border-blue-500 rounded-lg transition-all group">
                <div className="w-8 h-8 mb-2 text-blue-500 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.797 12.651c0 .678-.555 1.233-1.233 1.233s-1.233-.555-1.233-1.233.555-1.233 1.233-1.233 1.233.555 1.233 1.233zm6.436 0c0 .678-.555 1.233-1.233 1.233s-1.233-.555-1.233-1.233.555-1.233 1.233-1.233 1.233.555 1.233 1.233zm-6.958-1.055c-.486 0-.877-.391-.877-.877s.391-.877.877-.877.877.391.877.877-.391.877-.877.877zm2.466 0c-.486 0-.877-.391-.877-.877s.391-.877.877-.877.877.391.877.877-.391.877-.877.877zm7.014-5.596v16h-14v-16h14zm2-2h-18v20h18v-20z"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-300 group-hover:text-white">PSN</span>
              </button>
              
              <button className="flex flex-col items-center p-3 bg-gray-700 hover:bg-green-600 border border-gray-600 hover:border-green-500 rounded-lg transition-all group">
                <div className="w-8 h-8 mb-2 text-green-500 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.102 21.033C6.211 22.881 9.977 23.86 14 23.86s7.789-.979 9.898-2.827C24.102 20.646 24 18.198 24 15.719V8.28c0-2.479.102-4.927-.102-5.314C21.789 1.119 18.023.14 14 .14S6.211 1.119 4.102 2.967C3.898 3.354 4 5.802 4 8.281v7.438c0 2.479-.102 4.927.102 5.314zM7.5 11.5c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5zm6 0c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5z"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-300 group-hover:text-white">Xbox</span>
              </button>
              
              <button className="flex flex-col items-center p-3 bg-gray-700 hover:bg-blue-400 border border-gray-600 hover:border-blue-400 rounded-lg transition-all group">
                <div className="w-8 h-8 mb-2 text-blue-400 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.979 0C5.678 0 .511 5.167.511 11.469c0 6.301 5.167 11.469 11.468 11.469 6.301 0 11.469-5.168 11.469-11.469C23.448 5.167 18.28.001 11.979 0zM5.54 12.924c-.434 0-.785-.352-.785-.785s.352-.785.785-.785.785.352.785.785-.351.785-.785.785zm2.173-1.785c0-.434.352-.785.785-.785s.785.352.785.785-.352.785-.785.785-.785-.351-.785-.785zm3.958 0c0-.434.352-.785.785-.785s.785.352.785.785-.352.785-.785.785-.785-.351-.785-.785zm2.173 1.785c-.434 0-.785-.352-.785-.785s.352-.785.785-.785.785.352.785.785-.351.785-.785.785z"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-300 group-hover:text-white">Steam</span>
              </button>
              
              <button className="flex flex-col items-center p-3 bg-gray-700 hover:bg-red-500 border border-gray-600 hover:border-red-500 rounded-lg transition-all group">
                <div className="w-8 h-8 mb-2 text-red-500 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10S2 17.514 2 12 6.486 2 12 2zm-1 3v6l5 3-5 3v6c-3.314 0-6-2.686-6-6s2.686-6 6-6z"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-300 group-hover:text-white">Nintendo</span>
              </button>
              
              <button className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-300 border border-gray-600 hover:border-gray-300 rounded-lg transition-all group">
                <div className="w-8 h-8 mb-2 text-gray-300 group-hover:text-gray-900">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10S2 17.514 2 12 6.486 2 12 2zm-2 6c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2zm4 0c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-300 group-hover:text-gray-900">Epic</span>
              </button>
              
              <button className="flex flex-col items-center p-3 bg-gray-700 hover:bg-indigo-500 border border-gray-600 hover:border-indigo-500 rounded-lg transition-all group">
                <div className="w-8 h-8 mb-2 text-indigo-500 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.222 0c1.406 0 2.54 1.137 2.607 2.475V24l-2.677-.202-1.8-7.202-1.8 7.202L14.875 24V2.475C14.875 1.137 16.013 0 17.418 0h2.804zm-10.41 0C11.218 0 12.35 1.137 12.35 2.475V24l-2.678-.202-1.8-7.202-1.8 7.202L4.395 24V2.475C4.395 1.137 5.533 0 6.938 0h2.874z"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-300 group-hover:text-white">Discord</span>
              </button>
              
              <button className="flex flex-col items-center p-3 bg-gray-700 hover:bg-orange-500 border border-gray-600 hover:border-orange-500 rounded-lg transition-all group">
                <div className="w-8 h-8 mb-2 text-orange-500 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L1.608 6v12L12 24l10.392-6V6L12 0zm-1.21 5.414c.42 0 .76.34.76.76s-.34.76-.76.76-.76-.34-.76-.76.34-.76.76-.76zm2.42 0c.42 0 .76.34.76.76s-.34.76-.76.76-.76-.34-.76-.76.34-.76.76-.76z"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-300 group-hover:text-white">Riot</span>
              </button>
              
              <button className="flex flex-col items-center p-3 bg-gray-700 hover:bg-yellow-500 border border-gray-600 hover:border-yellow-500 rounded-lg transition-all group">
                <div className="w-8 h-8 mb-2 text-yellow-500 group-hover:text-white">
                  <FaGamepad className="w-8 h-8" />
                </div>
                <span className="text-xs font-medium text-gray-300 group-hover:text-white">Pokémon GO</span>
              </button>
            </div>
          </div>
          
          <SimpleMutualFollowersDisplay 
            initialDisplay={20}
            showSearch={true}
            showRefresh={true}
            compact={false}
            showOnlyGamers={true}
          />
        </div>


      </div>
      <BottomNavigation />
    </main>
  )
} 