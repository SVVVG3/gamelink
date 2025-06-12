'use client'

import { useUser } from '@/hooks/useUser'
import BottomNavigation from '@/components/BottomNavigation'
import { FaComments, FaPlus, FaSearch } from 'react-icons/fa'

export default function MessagesPage() {
  const { isAuthenticated, isLoading, farcasterProfile, profile } = useUser()

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center space-y-6 sm:space-y-8 max-w-md mx-auto">
          <div>
            <FaComments className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Messages
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 px-2">
              Sign in to start messaging your gaming friends
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
          <p className="text-sm sm:text-base text-gray-300">Loading messages...</p>
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
              💬 Messages
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              Chat with your gaming friends and organize teams
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
          </div>
        </div>

        {/* Search and New Chat */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
            <FaPlus className="w-4 h-4 mr-2" />
            New Chat
          </button>
        </div>

        {/* Coming Soon Message */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto">
              <FaComments className="w-10 h-10 text-blue-400" />
            </div>
            
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Messages Coming Soon!
              </h3>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                We're building an amazing messaging system where you can chat with your gaming friends, 
                organize teams, and coordinate gaming sessions. This feature will be available in the next update!
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4 text-left">
              <h4 className="text-white font-medium mb-2">🚀 What's Coming:</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Direct messages with gaming friends</li>
                <li>• Group chats for team coordination</li>
                <li>• Share gamertags and friend codes instantly</li>
                <li>• Plan gaming sessions together</li>
                <li>• Real-time notifications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </main>
  )
} 