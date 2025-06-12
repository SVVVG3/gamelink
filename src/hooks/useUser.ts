'use client'

import { useState, useEffect, useCallback } from 'react'
import { useProfile } from '@farcaster/auth-kit'
import { 
  getProfileByFid, 
  upsertProfile, 
  type Profile, 
  type CreateProfileData 
} from '@/lib/supabase/profiles'
import { 
  getGamertagsByProfileId, 
  type Gamertag 
} from '@/lib/supabase/gamertags'

interface UseUserReturn {
  // Authentication state
  isAuthenticated: boolean
  isLoading: boolean
  
  // Farcaster data (from AuthKit)
  farcasterProfile: {
    fid?: number
    username?: string
    displayName?: string
    bio?: string
    pfpUrl?: string
  } | null
  
  // Supabase data
  profile: Profile | null
  gamertags: Gamertag[]
  
  // Actions
  syncProfile: () => Promise<void>
  refreshData: () => Promise<void>
  
  // Error handling
  error: string | null
}

export function useUser(): UseUserReturn {
  const { isAuthenticated, profile: farcasterProfile } = useProfile()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [gamertags, setGamertags] = useState<Gamertag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync Farcaster profile data with Supabase
  const syncProfile = useCallback(async () => {
    if (!isAuthenticated || !farcasterProfile?.fid) {
      return
    }

    try {
      setError(null)
      
      const profileData: CreateProfileData = {
        fid: farcasterProfile.fid,
        username: farcasterProfile.username || '',
        display_name: farcasterProfile.displayName,
        bio: farcasterProfile.bio,
        pfp_url: farcasterProfile.pfpUrl
      }

      // Upsert profile (create if new, update if exists)
      const supabaseProfile = await upsertProfile(profileData)
      setProfile(supabaseProfile)
      
      console.log('Profile synced successfully:', supabaseProfile)
    } catch (err) {
      console.error('Error syncing profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to sync profile')
    }
  }, [isAuthenticated, farcasterProfile])

  // Load user's gamertags
  const loadGamertags = useCallback(async (profileId: string) => {
    try {
      const userGamertags = await getGamertagsByProfileId(profileId)
      setGamertags(userGamertags)
      console.log('Gamertags loaded:', userGamertags)
    } catch (err) {
      console.error('Error loading gamertags:', err)
      setError(err instanceof Error ? err.message : 'Failed to load gamertags')
    }
  }, [])

  // Refresh all user data
  const refreshData = useCallback(async () => {
    if (!isAuthenticated || !farcasterProfile?.fid) {
      setProfile(null)
      setGamertags([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // First sync the profile
      await syncProfile()
      
      // Then load existing profile to get the ID
      const existingProfile = await getProfileByFid(farcasterProfile.fid)
      if (existingProfile) {
        setProfile(existingProfile)
        await loadGamertags(existingProfile.id)
      }
    } catch (err) {
      console.error('Error refreshing data:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh data')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, farcasterProfile, syncProfile, loadGamertags])

  // Auto-sync when authentication state changes
  useEffect(() => {
    if (isAuthenticated && farcasterProfile?.fid) {
      refreshData()
    } else {
      // Clear data when user signs out
      setProfile(null)
      setGamertags([])
      setError(null)
    }
  }, [isAuthenticated, farcasterProfile?.fid, refreshData])

  return {
    // Authentication state
    isAuthenticated,
    isLoading,
    
    // Farcaster data
    farcasterProfile,
    
    // Supabase data
    profile,
    gamertags,
    
    // Actions
    syncProfile,
    refreshData,
    
    // Error handling
    error
  }
} 