'use client'

import { useState } from 'react';
import Link from 'next/link';
import { SignInButton, useSignIn } from '@farcaster/auth-kit';
import { useUser } from '@/hooks/useUser';
import GamertagForm from '@/components/GamertagForm';
import FriendCodeDisplay from '@/components/FriendCodeDisplay';
import BottomNavigation from '@/components/BottomNavigation';

export default function Home() {
  const { 
    isAuthenticated, 
    isLoading, 
    farcasterProfile, 
    profile, 
    gamertags, 
    error,
    refreshData 
  } = useUser();
  
  const { signOut } = useSignIn({
    onSuccess: ({ fid, username }) => {
      console.log(`Signed in as ${username} (FID: ${fid})`);
    },
  });

  const [showGamertagForm, setShowGamertagForm] = useState(false);

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900">
        <div className="text-center space-y-6 sm:space-y-8 max-w-md mx-auto">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">
              🎮 GameLink
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 px-2">
              Connect with fellow gamers on Farcaster
            </p>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-center">
              <SignInButton
                onSuccess={({ fid, username }) =>
                  console.log(`Hello, ${username}! Your fid is ${fid}.`)
                }
              />
            </div>
            
            <p className="text-sm text-gray-400 px-4">
              Share gamertags • Organize events • Chat with friends
            </p>
                  </div>
      </div>
      <BottomNavigation />
    </main>
  );
  }

  // Show loading state
  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-300">Loading your profile...</p>
        </div>
        <BottomNavigation />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 pb-20">
      <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
            🎮 GameLink
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-300 px-2">
            Welcome back, {farcasterProfile?.displayName || profile?.display_name || 'Gamer'}!
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mx-2 sm:mx-0">
            <p className="text-red-300 text-sm">⚠️ {error}</p>
            <button 
              onClick={refreshData}
              className="mt-3 px-4 py-2 text-sm font-medium text-red-300 bg-red-900/30 border border-red-700 rounded-md hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900 min-h-[44px]"
            >
              Try again
            </button>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 sm:p-6 mx-2 sm:mx-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
            {(farcasterProfile?.pfpUrl || profile?.pfp_url) ? (
              <img
                src={farcasterProfile?.pfpUrl || profile?.pfp_url || ''}
                alt={`${farcasterProfile?.displayName || profile?.display_name || 'User'}'s avatar`}
                className="w-20 h-20 sm:w-16 sm:h-16 rounded-full flex-shrink-0 ring-2 ring-purple-500"
              />
            ) : (
              <div className="w-20 h-20 sm:w-16 sm:h-16 bg-purple-900/50 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-purple-500">
                <span className="text-2xl">🎮</span>
              </div>
            )}
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                {farcasterProfile?.displayName || profile?.display_name || 'Anonymous Gamer'}
              </h2>
              <p className="text-gray-300 text-sm sm:text-base">@{farcasterProfile?.username || profile?.username || 'unknown'}</p>
              <p className="text-xs sm:text-sm text-gray-400">FID: {farcasterProfile?.fid || profile?.fid || 'N/A'}</p>
              <p className="text-xs text-green-400 mt-1">
                ✅ Authenticated with Official AuthKit
              </p>
              {(farcasterProfile?.bio || profile?.bio) && (
                <p className="text-xs sm:text-sm text-gray-300 mt-2 italic max-w-md">
                  {farcasterProfile?.bio || profile?.bio}
                </p>
              )}
            </div>
          </div>



          {/* Gamertags Section */}
          <div className="mt-6 mx-2 sm:mx-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
              <h3 className="text-base sm:text-lg font-medium text-white">Your Gaming Profiles</h3>
              <button
                onClick={() => setShowGamertagForm(!showGamertagForm)}
                className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 min-h-[44px] w-full sm:w-auto"
              >
                {showGamertagForm ? '👁️ View Gamertags' : '✏️ Manage Gamertags'}
              </button>
            </div>

            {showGamertagForm ? (
              <GamertagForm 
                onSuccess={() => {
                  console.log('Gamertag operation successful!');
                  refreshData();
                }} 
                onCancel={() => setShowGamertagForm(false)}
              />
            ) : (
              <FriendCodeDisplay 
                showPrivate={true}
              />
            )}
          </div>

          {/* What's Next Section */}
          <div className="mt-6 mx-2 sm:mx-0">
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-medium text-white">
                🚀 What&apos;s Next?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Link 
                  href="/friends"
                  className="block border border-gray-700 bg-gray-800/50 rounded-md p-3 sm:p-4 hover:bg-gray-800/70 hover:border-blue-600 transition-colors group"
                >
                  <h4 className="font-medium text-white text-sm sm:text-base group-hover:text-blue-300">Find Friends</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 group-hover:text-blue-200">
                    Connect with mutual followers who game
                  </p>
                </Link>
                <div className="border border-gray-700 bg-gray-800/50 rounded-md p-3 sm:p-4 hover:bg-gray-800/70 transition-colors">
                  <h4 className="font-medium text-white text-sm sm:text-base">Organize Events</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1">
                    Plan gaming sessions and tournaments
                  </p>
                </div>
                <div className="border border-gray-700 bg-gray-800/50 rounded-md p-3 sm:p-4 hover:bg-gray-800/70 transition-colors">
                  <h4 className="font-medium text-white text-sm sm:text-base">Group Chat</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1">
                    Message friends and organize teams
                  </p>
                </div>
                <div className="border border-gray-700 bg-gray-800/50 rounded-md p-3 sm:p-4 hover:bg-gray-800/70 transition-colors">
                  <h4 className="font-medium text-white text-sm sm:text-base">Coming Soon</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1">
                    More features in development
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Database Sync Status */}
          <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-700 mx-2 sm:mx-0">
            <h4 className="font-medium text-blue-300 mb-3 text-sm sm:text-base">📊 Database Integration Status</h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Farcaster Profile:</span>
                <span className="text-blue-400">✅ Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Supabase Profile:</span>
                <span className="text-blue-400">{profile ? '✅ Synced' : '⏳ Syncing...'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Gamertags Loaded:</span>
                <span className="text-blue-400">{gamertags.length} found</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-900/20 rounded-lg border border-green-700 mx-2 sm:mx-0">
            <h4 className="font-medium text-green-300 mb-3 text-sm sm:text-base">🎉 Dark Mode Gaming Experience!</h4>
            <div className="text-xs sm:text-sm text-green-200 space-y-1">
              <div>✅ Farcaster authentication integrated with Supabase database</div>
              <div>✅ Profile auto-sync working</div>
              <div>✅ Gamertags loading automatically</div>
              <div>✅ Mobile-first responsive design</div>
              <div>✅ Touch-friendly interface optimized for Mini Apps</div>
              <div>✅ Dark mode gaming aesthetic</div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 pb-4">
          <p className="text-xs sm:text-sm text-gray-400 mb-4 px-4">
            Ready to start your gaming journey?
          </p>
          <button 
            onClick={signOut}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 transition-colors min-h-[44px] mx-2"
          >
            👋 Sign Out
          </button>
        </div>
      </div>
      <BottomNavigation />
    </main>
  );
}
