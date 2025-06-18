'use client'

import { useUser } from '@/hooks/useUser'
import { useSignIn } from '@farcaster/auth-kit'
import SimpleMutualFollowersDisplay from '@/components/SimpleMutualFollowersDisplay'
import BottomNavigation from '@/components/BottomNavigation'
import Link from 'next/link'
import { FaArrowLeft, FaUsers, FaGamepad, FaXbox } from 'react-icons/fa'
import { SiPlaystation, SiSteam, SiNintendoswitch, SiEpicgames, SiDiscord, SiRiotgames } from 'react-icons/si'

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

        {/* Mutual Followers Display with Gaming Filters */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 sm:p-6">
          {/* Custom header and search - we'll extract the key parts */}
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FaUsers className="w-5 h-5 text-blue-400" />
                  <span className="text-lg font-semibold text-white">Gaming Friends</span>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by username or display name..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Gaming Platform Filters */}
            <div className="flex flex-wrap gap-3">
              <button className="flex items-center justify-center p-3 bg-gray-700 hover:bg-blue-600 border border-gray-600 hover:border-blue-500 rounded-lg transition-all group">
                <SiPlaystation className="w-5 h-5 text-blue-500 group-hover:text-white" />
              </button>
              
              <button className="flex items-center justify-center p-3 bg-gray-700 hover:bg-green-600 border border-gray-600 hover:border-green-500 rounded-lg transition-all group">
                <FaXbox className="w-5 h-5 text-green-500 group-hover:text-white" />
              </button>
              
              <button className="flex items-center justify-center p-3 bg-gray-700 hover:bg-blue-600 border border-gray-600 hover:border-blue-500 rounded-lg transition-all group">
                <SiSteam className="w-5 h-5 text-blue-400 group-hover:text-white" />
              </button>
              
              <button className="flex items-center justify-center p-3 bg-gray-700 hover:bg-red-600 border border-gray-600 hover:border-red-500 rounded-lg transition-all group">
                <SiNintendoswitch className="w-5 h-5 text-red-500 group-hover:text-white" />
              </button>
              
              <button className="flex items-center justify-center p-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 rounded-lg transition-all group">
                <SiEpicgames className="w-5 h-5 text-gray-300 group-hover:text-white" />
              </button>
              
              <button className="flex items-center justify-center p-3 bg-gray-700 hover:bg-indigo-600 border border-gray-600 hover:border-indigo-500 rounded-lg transition-all group">
                <SiDiscord className="w-5 h-5 text-indigo-500 group-hover:text-white" />
              </button>
              
              <button className="flex items-center justify-center p-3 bg-gray-700 hover:bg-orange-600 border border-gray-600 hover:border-orange-500 rounded-lg transition-all group">
                <SiRiotgames className="w-5 h-5 text-orange-500 group-hover:text-white" />
              </button>
              
              <button className="flex items-center justify-center p-3 bg-gray-700 hover:bg-yellow-600 border border-gray-600 hover:border-yellow-500 rounded-lg transition-all group">
                <FaGamepad className="w-5 h-5 text-yellow-500 group-hover:text-white" />
              </button>
            </div>
          </div>

          {/* Use the actual component but hide its search and header since we have our own */}
          <div className="mt-6">
            <SimpleMutualFollowersDisplay 
              initialDisplay={20}
              showSearch={false}
              showRefresh={true}
              compact={false}
              showOnlyGamers={true}
            />
          </div>
        </div>
      </div>
      <BottomNavigation />
    </main>
      )
  } 