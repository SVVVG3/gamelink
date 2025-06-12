import { useState, useEffect, useCallback } from 'react'
import { fetchMutualFollowers, refreshMutualFollowers as refreshMutualFollowersClient, type MutualFollower } from '../lib/farcaster-client'

interface UseMutualFollowersState {
  mutualFollowers: MutualFollower[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

interface UseMutualFollowersReturn extends UseMutualFollowersState {
  refetch: () => Promise<void>
  refresh: () => Promise<void>
}

export function useMutualFollowers(userFid: number | null): UseMutualFollowersReturn {
  const [state, setState] = useState<UseMutualFollowersState>({
    mutualFollowers: [],
    loading: false,
    error: null,
    lastUpdated: null
  })

  const fetchMutualFollowersData = useCallback(async (useCache: boolean = true) => {
    if (!userFid) {
      setState(prev => ({
        ...prev,
        mutualFollowers: [],
        loading: false,
        error: null
      }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const followers = useCache 
        ? await fetchMutualFollowers(userFid, true)
        : await refreshMutualFollowersClient(userFid)
      
      setState(prev => ({
        ...prev,
        mutualFollowers: followers,
        loading: false,
        error: null,
        lastUpdated: new Date()
      }))
    } catch (error) {
      console.error('Error fetching mutual followers:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch mutual followers'
      }))
    }
  }, [userFid])

  // Fetch on mount and when userFid changes
  useEffect(() => {
    fetchMutualFollowersData()
  }, [fetchMutualFollowersData])

  // Refetch using cache
  const refetch = useCallback(() => fetchMutualFollowersData(true), [fetchMutualFollowersData])

  // Refresh bypassing cache
  const refresh = useCallback(() => fetchMutualFollowersData(false), [fetchMutualFollowersData])

  return {
    ...state,
    refetch,
    refresh
  }
} 