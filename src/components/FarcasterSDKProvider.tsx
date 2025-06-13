'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { sdk } from '@farcaster/frame-sdk'

interface FarcasterSDKContextType {
  isSDKLoaded: boolean
  isInFarcaster: boolean
  context: any
  user: any
  error: string | null
}

const FarcasterSDKContext = createContext<FarcasterSDKContextType>({
  isSDKLoaded: false,
  isInFarcaster: false,
  context: null,
  user: null,
  error: null
})

export const useFarcasterSDK = () => useContext(FarcasterSDKContext)

interface FarcasterSDKProviderProps {
  children: ReactNode
}

export default function FarcasterSDKProvider({ children }: FarcasterSDKProviderProps) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [isInFarcaster, setIsInFarcaster] = useState(false)
  const [context, setContext] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Check if we're in a Farcaster environment
        if (typeof window !== 'undefined') {
          // Initialize the Farcaster SDK
          await sdk.actions.ready()
          
          // Get the context from Farcaster (it's a Promise)
          const contextResult = await sdk.context
          
          if (contextResult) {
            setIsInFarcaster(true)
            setContext(contextResult)
            
            // Extract user information if available
            if (contextResult.user) {
              setUser(contextResult.user)
              console.log('Farcaster user context:', contextResult.user)
            }
            
            console.log('Farcaster SDK initialized successfully')
          } else {
            // Not running in Farcaster environment
            setIsInFarcaster(false)
            console.log('Not running in Farcaster environment')
          }
        }
        
        setIsSDKLoaded(true)
      } catch (err) {
        console.error('Error initializing Farcaster SDK:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize SDK')
        setIsSDKLoaded(true) // Still mark as loaded even if failed
        setIsInFarcaster(false)
      }
    }

    initializeSDK()
  }, [])

  const value = {
    isSDKLoaded,
    isInFarcaster,
    context,
    user,
    error
  }

  return (
    <FarcasterSDKContext.Provider value={value}>
      {children}
    </FarcasterSDKContext.Provider>
  )
} 