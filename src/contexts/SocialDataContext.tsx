'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useUser } from '@/hooks/useUser'

interface MutualFollower {
  fid: number
  username: string
  display_name?: string
  pfp_url?: string
  gamertags?: Array<{
    platform: string
    handle: string
    is_public?: boolean
  }>
}

interface SocialDataContextType {
  // Data
  mutualFollowers: MutualFollower[]
  gamingFollowers: MutualFollower[]
  
  // Loading states
  isLoadingMutuals: boolean
  isLoadingGamertags: boolean
  
  // Error states
  mutualsError: string | null
  gamertagsError: string | null
  
  // Actions
  refreshData: () => Promise<void>
  clearData: () => void
}

const SocialDataContext = createContext<SocialDataContextType | undefined>(undefined)

interface SocialDataProviderProps {
  children: ReactNode
}

export function SocialDataProvider({ children }: SocialDataProviderProps) {
  const { profile } = useUser()
  
  // Data state
  const [mutualFollowers, setMutualFollowers] = useState<MutualFollower[]>([])
  const [gamingFollowers, setGamingFollowers] = useState<MutualFollower[]>([])
  
  // Loading states
  const [isLoadingMutuals, setIsLoadingMutuals] = useState(false)
  const [isLoadingGamertags, setIsLoadingGamertags] = useState(false)
  
  // Error states
  const [mutualsError, setMutualsError] = useState<string | null>(null)
  const [gamertagsError, setGamertagsError] = useState<string | null>(null)
  
  // Track if we've already fetched data for this session
  const [hasFetchedData, setHasFetchedData] = useState(false)

  // Fetch mutual followers
  const fetchMutualFollowers = async (userFid: number): Promise<MutualFollower[]> => {
    console.log('🔍 SocialData: Fetching mutual followers for FID', userFid)
    setIsLoadingMutuals(true)
    setMutualsError(null)
    
    try {
      const response = await fetch(`/api/farcaster/mutual-followers?fid=${userFid}&useCache=true`)
      if (!response.ok) {
        throw new Error('Failed to fetch mutual followers')
      }
      
      const data = await response.json()
      console.log('✅ SocialData: Fetched', data.data?.length || 0, 'mutual followers')
      return data.data || []
      
    } catch (error) {
      console.error('❌ SocialData: Error fetching mutual followers:', error)
      setMutualsError(error instanceof Error ? error.message : 'Failed to fetch mutual followers')
      return []
    } finally {
      setIsLoadingMutuals(false)
    }
  }

  // Fetch gamertags for followers
  const fetchGamertags = async (followers: MutualFollower[]): Promise<MutualFollower[]> => {
    if (followers.length === 0) return []
    
    console.log('🎮 SocialData: Fetching gamertags for', followers.length, 'followers')
    setIsLoadingGamertags(true)
    setGamertagsError(null)
    
    try {
      const fids = followers.map(f => f.fid)
      
      const response = await fetch('/api/gamertags/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fids })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch gamertags')
      }
      
      const gamertagsData = await response.json()
      console.log('🎮 SocialData: Received gamertags data for', Object.keys(gamertagsData).length, 'users')
      
      // Merge gamertags with followers
      const followersWithGamertags = followers.map(follower => ({
        ...follower,
        gamertags: gamertagsData[follower.fid] || []
      }))
      
      const withGamertags = followersWithGamertags.filter(f => f.gamertags && f.gamertags.length > 0)
      console.log('✅ SocialData: Found', withGamertags.length, 'gaming followers out of', followers.length, 'total')
      
      return followersWithGamertags
      
    } catch (error) {
      console.error('❌ SocialData: Error fetching gamertags:', error)
      setGamertagsError(error instanceof Error ? error.message : 'Failed to fetch gamertags')
      return followers // Return original followers if gamertags fetch fails
    } finally {
      setIsLoadingGamertags(false)
    }
  }

  // Main data fetching function
  const loadAllData = async () => {
    if (!profile?.fid || hasFetchedData) return
    
    console.log('🚀 SocialData: Starting initial data load for FID', profile.fid)
    
    try {
      // Step 1: Fetch mutual followers
      const followers = await fetchMutualFollowers(profile.fid)
      setMutualFollowers(followers)
      
      // Step 2: Fetch gamertags for all followers
      const followersWithGamertags = await fetchGamertags(followers)
      setMutualFollowers(followersWithGamertags)
      
      // Step 3: Filter to gaming followers
      const gaming = followersWithGamertags.filter(f => f.gamertags && f.gamertags.length > 0)
      setGamingFollowers(gaming)
      
      setHasFetchedData(true)
      console.log('✅ SocialData: Initial data load complete')
      
    } catch (error) {
      console.error('❌ SocialData: Error in initial data load:', error)
    }
  }

  // Refresh data manually
  const refreshData = async () => {
    if (!profile?.fid) return
    
    console.log('🔄 SocialData: Refreshing data')
    setHasFetchedData(false)
    setMutualFollowers([])
    setGamingFollowers([])
    await loadAllData()
  }

  // Clear data (e.g., on logout)
  const clearData = () => {
    console.log('🧹 SocialData: Clearing data')
    setMutualFollowers([])
    setGamingFollowers([])
    setHasFetchedData(false)
    setMutualsError(null)
    setGamertagsError(null)
  }

  // Load data when user profile is available
  useEffect(() => {
    if (profile?.fid && !hasFetchedData) {
      loadAllData()
    }
  }, [profile?.fid, hasFetchedData])

  // Clear data when user logs out
  useEffect(() => {
    if (!profile?.fid && hasFetchedData) {
      clearData()
    }
  }, [profile?.fid])

  const value: SocialDataContextType = {
    // Data
    mutualFollowers,
    gamingFollowers,
    
    // Loading states
    isLoadingMutuals,
    isLoadingGamertags,
    
    // Error states
    mutualsError,
    gamertagsError,
    
    // Actions
    refreshData,
    clearData
  }

  return (
    <SocialDataContext.Provider value={value}>
      {children}
    </SocialDataContext.Provider>
  )
}

export function useSocialData() {
  const context = useContext(SocialDataContext)
  if (context === undefined) {
    throw new Error('useSocialData must be used within a SocialDataProvider')
  }
  return context
} 