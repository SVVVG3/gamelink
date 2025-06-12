'use client'

import { useUser } from '@/hooks/useUser'
import BottomNavigation from '@/components/BottomNavigation'
import { FaCalendarAlt, FaPlus, FaTrophy, FaClock, FaUsers } from 'react-icons/fa'

export default function EventsPage() {
  const { isAuthenticated, isLoading, farcasterProfile, profile } = useUser()

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center space-y-6 sm:space-y-8 max-w-md mx-auto">
          <div>
            <FaCalendarAlt className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Gaming Events
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 px-2">
              Sign in to organize and join gaming events
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
          <p className="text-sm sm:text-base text-gray-300">Loading events...</p>
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
              🏆 Gaming Events
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              Organize tournaments and gaming sessions with friends
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button className="flex items-center justify-center px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
            <FaPlus className="w-5 h-5 mr-3" />
            Create Event
          </button>
          <button className="flex items-center justify-center px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium">
            <FaTrophy className="w-5 h-5 mr-3" />
            Join Tournament
          </button>
        </div>

        {/* Event Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-gradient-to-r from-orange-900/50 to-orange-800/50 border border-orange-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <FaClock className="w-8 h-8 text-orange-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Quick Matches</h3>
                <p className="text-sm text-orange-200">
                  Casual gaming sessions starting soon
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <FaTrophy className="w-8 h-8 text-purple-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Tournaments</h3>
                <p className="text-sm text-purple-200">
                  Competitive events with prizes
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <FaUsers className="w-8 h-8 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Team Events</h3>
                <p className="text-sm text-green-200">
                  Coordinate with your squad
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Message */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
              <FaCalendarAlt className="w-10 h-10 text-purple-400" />
            </div>
            
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Events System Coming Soon!
              </h3>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                We're building a comprehensive event system where you can organize tournaments, 
                schedule gaming sessions, and coordinate with your friends. Get ready for epic gaming events!
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4 text-left">
              <h4 className="text-white font-medium mb-2">🎮 What's Coming:</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Create and manage gaming events</li>
                <li>• Tournament brackets and scoring</li>
                <li>• RSVP and participant management</li>
                <li>• Integration with popular games</li>
                <li>• Share events on Farcaster</li>
                <li>• Automated reminders and notifications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </main>
  )
} 