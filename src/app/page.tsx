'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignInButton } from '@farcaster/auth-kit';
import { useUser } from '@/hooks/useUser';
import BottomNavigation from '@/components/BottomNavigation';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useUser();

  // Redirect authenticated users to their profile
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/profile');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-300">Loading...</p>
        </div>
        <BottomNavigation />
      </main>
    );
  }

  // Landing page for unauthenticated users
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
              Share gamertags • Join groups • Organize events • Chat with friends
            </p>

            {/* Feature Preview */}
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold text-white">What you can do:</h2>
              <div className="grid gap-4 text-left">
                <div className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
                  <span className="text-2xl">🎮</span>
                  <div>
                    <h3 className="font-medium text-white">Share Gaming Profiles</h3>
                    <p className="text-sm text-gray-400">Connect your PSN, Xbox, Steam, and more</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
                  <span className="text-2xl">👥</span>
                  <div>
                    <h3 className="font-medium text-white">Join Gaming Groups</h3>
                    <p className="text-sm text-gray-400">Find communities for your favorite games</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
                  <span className="text-2xl">💬</span>
                  <div>
                    <h3 className="font-medium text-white">Chat & Organize</h3>
                    <p className="text-sm text-gray-400">Message friends and plan gaming sessions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <h3 className="font-medium text-white">Events & Tournaments</h3>
                    <p className="text-sm text-gray-400">Create and join gaming events</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </main>
    );
  }

  // This should not be reached due to the redirect, but just in case
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-300">Redirecting to your profile...</p>
      </div>
      <BottomNavigation />
    </main>
  );
}
