'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useSignIn } from '@farcaster/auth-kit'
import GamertagForm from '@/components/GamertagForm'
import FriendCodeDisplay from '@/components/FriendCodeDisplay'
import BottomNavigation from '@/components/BottomNavigation'
import { FaGamepad, FaEdit, FaSignOutAlt, FaUser, FaEye } from 'react-icons/fa'

export default function ProfilePage() {
  const { isAuthenticated, isLoading, farcasterProfile, profile, refreshData } = useUser()
  const { signOut } = useSignIn({
    onSuccess: ({ fid, username }) => {
      console.log(`Signed in as ${username} (FID: ${fid})`);
    },
  })

  const [showGamertagForm, setShowGamertagForm] = useState(false)

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center space-y-6 sm:space-y-8 max-w-md mx-auto">
          <div>
            <FaUser className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Gaming Profile
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 px-2">
              Sign in to manage your gaming profile and gamertags
            </p>
          </div>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-300">Loading your profile...</p>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 pb-20">
      <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              🎮 Gaming Profile
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              Manage your gamertags and gaming identity
            </p>
          </div>

          <button 
            onClick={signOut}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900 transition-colors"
          >
            <FaSignOutAlt className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            {(farcasterProfile?.pfpUrl || profile?.pfp_url) && (
              <img
                src={farcasterProfile?.pfpUrl || profile?.pfp_url || ''}
                alt="Your profile"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-blue-500"
              />
            )}
            
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {farcasterProfile?.displayName || profile?.display_name || 'Anonymous Gamer'}
              </h2>
              <p className="text-gray-400 mb-1">
                @{farcasterProfile?.username || profile?.username || 'unknown'}
              </p>
              {farcasterProfile?.fid && (
                <p className="text-sm text-gray-500">
                  FID: {farcasterProfile.fid}
                </p>
              )}
              
              {farcasterProfile?.bio && (
                <p className="text-sm text-gray-300 mt-3 max-w-md">
                  {farcasterProfile.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Gaming Profiles Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <FaGamepad className="w-6 h-6 mr-3 text-blue-400" />
              Your Gaming Profiles
            </h3>
            <button 
              onClick={() => setShowGamertagForm(!showGamertagForm)}
              className="flex items-center px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-700 rounded-lg transition-colors"
            >
              {showGamertagForm ? (
                <>
                  <FaEye className="w-4 h-4 mr-2" />
                  View Gamertags
                </>
              ) : (
                <>
                  <FaEdit className="w-4 h-4 mr-2" />
                  Manage Gamertags
                </>
              )}
            </button>
          </div>

          {showGamertagForm ? (
            <GamertagForm 
              onSuccess={() => {
                console.log('Gamertag operation successful!')
                refreshData()
                setShowGamertagForm(false) // Close form after success
              }}
              onCancel={() => setShowGamertagForm(false)}
            />
          ) : (
            <FriendCodeDisplay showPrivate={true} />
          )}
        </div>

        {/* Profile Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-700 rounded-lg p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-400 mb-2">
              0
            </div>
            <p className="text-sm text-blue-200">Gaming Platforms</p>
          </div>

          <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-700 rounded-lg p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-400 mb-2">
              0
            </div>
            <p className="text-sm text-purple-200">Events Joined</p>
          </div>

          <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-700 rounded-lg p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-2">
              0
            </div>
            <p className="text-sm text-green-200">Gaming Friends</p>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </main>
  )
} 