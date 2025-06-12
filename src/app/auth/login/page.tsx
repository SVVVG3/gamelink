'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import BottomNavigation from '@/components/BottomNavigation'

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  signer_uuid?: string;
}

declare global {
  interface Window {
    onSignInSuccess?: (data: NeynarUser) => void;
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Define the success callback for SIWN
    window.onSignInSuccess = (data: NeynarUser) => {
      console.log("✅ SIWN Success:", data)
      setIsLoading(false)
      
      // Store the user data
      localStorage.setItem('neynar_user', JSON.stringify(data))
      
      // Redirect to home page
      router.push('/')
    }

    // Cleanup function
    return () => {
      delete window.onSignInSuccess
    }
  }, [router])

  const handleSignInClick = () => {
    setIsLoading(true)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 pb-20 bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            🎮 Welcome to GameLink
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Connect your Farcaster account to get started
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="flex justify-center" onClick={handleSignInClick}>
            {/* Neynar SIWN Button */}
            <div
              className="neynar_signin"
              data-client_id={process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || ""}
              data-success-callback="onSignInSuccess"
              data-theme="light"
              data-variant="neynar"
              data-height="48px"
              data-width="240px"
              data-border_radius="8px"
            />
          </div>
          
          {isLoading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
              <p className="text-sm text-gray-300">Connecting to Farcaster...</p>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-xs text-gray-400">
              By signing in, you agree to connect your Farcaster account
              <br />
              🆓 Free to use - Neynar sponsors all fees
            </p>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  )
} 