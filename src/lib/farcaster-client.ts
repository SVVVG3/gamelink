// Client-side service for Farcaster API calls
// This file can be imported in client components

export interface MutualFollower {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  bio?: string
  followerCount: number
  followingCount: number
  isVerified?: boolean
}

export interface MutualFollowersResponse {
  success: boolean
  data: MutualFollower[]
  fid: number
  useCache?: boolean
  refreshed?: boolean
  timestamp: string
  error?: string
  details?: string
}

/**
 * Fetch mutual followers for a given FID (client-side)
 */
export async function fetchMutualFollowers(fid: number, useCache: boolean = true): Promise<MutualFollower[]> {
  try {
    const url = `/api/farcaster/mutual-followers?fid=${fid}&useCache=${useCache}`
    console.log(`🔍 Client: Fetching mutual followers for FID ${fid}`)
    
    const response = await fetch(url)
    const result: MutualFollowersResponse = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`)
    }
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed')
    }
    
    console.log(`✅ Client: Successfully fetched ${result.data.length} mutual followers`)
    return result.data
    
  } catch (error) {
    console.error('❌ Client: Error fetching mutual followers:', error)
    throw error
  }
}

/**
 * Refresh mutual followers for a given FID (bypass cache)
 */
export async function refreshMutualFollowers(fid: number): Promise<MutualFollower[]> {
  try {
    console.log(`🔄 Client: Refreshing mutual followers for FID ${fid}`)
    
    const response = await fetch('/api/farcaster/mutual-followers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fid })
    })
    
    const result: MutualFollowersResponse = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`)
    }
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed')
    }
    
    console.log(`✅ Client: Successfully refreshed ${result.data.length} mutual followers`)
    return result.data
    
  } catch (error) {
    console.error('❌ Client: Error refreshing mutual followers:', error)
    throw error
  }
} 