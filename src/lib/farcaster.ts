import { NeynarAPIClient } from '@neynar/nodejs-sdk'

// Types for Farcaster user data
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

export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  custodyAddress?: string
  followerCount: number
  followingCount: number
  bio?: string
  isVerified?: boolean
}

// Cache for mutual followers to avoid excessive API calls
interface CacheEntry {
  data: MutualFollower[]
  timestamp: number
  expiresAt: number
}

class FarcasterCache {
  private cache = new Map<number, CacheEntry>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  set(fid: number, data: MutualFollower[]): void {
    const now = Date.now()
    this.cache.set(fid, {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    })
  }

  get(fid: number): MutualFollower[] | null {
    const entry = this.cache.get(fid)
    if (!entry) return null
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(fid)
      return null
    }
    
    return entry.data
  }

  clear(fid?: number): void {
    if (fid) {
      this.cache.delete(fid)
    } else {
      this.cache.clear()
    }
  }
}

// Global cache instance
const mutualFollowersCache = new FarcasterCache()

// Initialize Neynar client
let neynarClient: NeynarAPIClient | null = null

function getNeynarClient(): NeynarAPIClient {
  if (!neynarClient) {
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      throw new Error('NEYNAR_API_KEY environment variable is required')
    }
    neynarClient = new NeynarAPIClient({ apiKey })
  }
  return neynarClient
}

/**
 * Get user profile information by FID with retry logic
 */
export async function getUserProfile(fid: number, retryCount: number = 0): Promise<FarcasterUser | null> {
  const maxRetries = 3
  const baseDelay = 1000 // 1 second base delay
  
  try {
    const client = getNeynarClient()
    const response = await client.fetchBulkUsers({ fids: [fid] })
    
    if (!response?.users || response.users.length === 0) {
      return null
    }

    const user = response.users[0]
    return {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      pfpUrl: user.pfp_url || '',
      custodyAddress: user.custody_address,
      followerCount: user.follower_count || 0,
      followingCount: user.following_count || 0,
      bio: user.profile?.bio?.text || '',
      isVerified: user.power_badge || false
    }
  } catch (error: any) {
    // Handle rate limiting (429) with exponential backoff
    if (error?.status === 429 && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount) // Exponential backoff
      console.log(`⏳ Rate limited, retrying FID ${fid} in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return getUserProfile(fid, retryCount + 1)
    }
    
    // Log error but don't spam console for rate limits
    if (error?.status !== 429) {
      console.error(`Error fetching user profile for FID ${fid}:`, error?.message || error)
    }
    return null
  }
}

/**
 * Get list of user FIDs that follow the given user (with pagination support)
 */
export async function getFollowers(fid: number, maxResults: number = Infinity): Promise<number[]> {
  try {
    const client = getNeynarClient()
    const allFollowers: number[] = []
    let cursor: string | undefined = undefined
    const limit = 100 // Maximum allowed by Neynar API
    let pageCount = 0
    const maxPages = 500 // Safety limit: 500 pages = 50,000 followers max (prevents runaway API calls)
    
    while (allFollowers.length < maxResults && pageCount < maxPages) {
      const remainingResults = maxResults === Infinity ? limit : maxResults - allFollowers.length
      const currentLimit = Math.min(limit, remainingResults)
      pageCount++
      
      const response = await client.fetchUserFollowers({ 
        fid, 
        limit: currentLimit,
        ...(cursor && { cursor })
      })
      
      if (!response?.users || response.users.length === 0) {
        break // No more results
      }

      const followerFids = response.users.map((follower: any) => follower.user.fid)
      allFollowers.push(...followerFids)
      
      // Log every 10 pages to avoid spam, but show progress
      if (pageCount % 10 === 0 || pageCount <= 5) {
        console.log(`📄 Followers page ${pageCount}: fetched ${followerFids.length} (total: ${allFollowers.length})`)
      }
      
      // Check if there's a next cursor for pagination
      cursor = response.next?.cursor || undefined
      if (!cursor) {
        break // No more pages
      }
    }

    if (pageCount >= maxPages) {
      console.log(`⚠️ Reached maximum page limit (${maxPages}) for followers. Total fetched: ${allFollowers.length}`)
    } else {
      console.log(`✅ Completed fetching followers: ${allFollowers.length} total (${pageCount} pages)`)
    }

    return allFollowers
  } catch (error) {
    console.error('Error fetching followers:', error)
    return []
  }
}

/**
 * Get list of user FIDs that the given user follows (with pagination support)
 */
export async function getFollowing(fid: number, maxResults: number = Infinity): Promise<number[]> {
  try {
    const client = getNeynarClient()
    const allFollowing: number[] = []
    let cursor: string | undefined = undefined
    const limit = 100 // Maximum allowed by Neynar API
    let pageCount = 0
    const maxPages = 500 // Safety limit: 500 pages = 50,000 following max (prevents runaway API calls)
    
    while (allFollowing.length < maxResults && pageCount < maxPages) {
      const remainingResults = maxResults === Infinity ? limit : maxResults - allFollowing.length
      const currentLimit = Math.min(limit, remainingResults)
      pageCount++
      
      const response = await client.fetchUserFollowing({ 
        fid, 
        limit: currentLimit,
        ...(cursor && { cursor })
      })
      
      if (!response?.users || response.users.length === 0) {
        break // No more results
      }

      const followingFids = response.users.map((following: any) => following.user.fid)
      allFollowing.push(...followingFids)
      
      // Log every 10 pages to avoid spam, but show progress
      if (pageCount % 10 === 0 || pageCount <= 5) {
        console.log(`📄 Following page ${pageCount}: fetched ${followingFids.length} (total: ${allFollowing.length})`)
      }
      
      // Check if there's a next cursor for pagination
      cursor = response.next?.cursor || undefined
      if (!cursor) {
        break // No more pages
      }
    }

    if (pageCount >= maxPages) {
      console.log(`⚠️ Reached maximum page limit (${maxPages}) for following. Total fetched: ${allFollowing.length}`)
    } else {
      console.log(`✅ Completed fetching following: ${allFollowing.length} total (${pageCount} pages)`)
    }

    return allFollowing
  } catch (error) {
    console.error('Error fetching following:', error)
    return []
  }
}

/**
 * Get mutual followers for a user (users who follow them AND they follow back)
 */
export async function getMutualFollowers(userFid: number, useCache: boolean = true): Promise<MutualFollower[]> {
  try {
    // Check cache first
    if (useCache) {
      const cached = mutualFollowersCache.get(userFid)
      if (cached) {
        console.log(`✅ Returning cached mutual followers for FID ${userFid}`)
        return cached
      }
    }

    console.log(`🔍 Fetching mutual followers for FID ${userFid}`)

    // Fetch followers and following lists in parallel (with pagination)
    // No limit - fetch ALL followers and following
    console.log(`⏳ This may take a while for accounts with many followers/following...`)
    const [followers, following] = await Promise.all([
      getFollowers(userFid, Infinity),  // Get ALL followers
      getFollowing(userFid, Infinity)   // Get ALL following
    ])

    console.log(`📊 Found ${followers.length} followers and ${following.length} following`)
    console.log(`🔍 Sample followers: ${followers.slice(0, 5).join(', ')}`)
    console.log(`🔍 Sample following: ${following.slice(0, 5).join(', ')}`)

    // Find mutual connections (intersection of followers and following)
    const mutualFids = followers.filter(fid => following.includes(fid))
    console.log(`🤝 Found ${mutualFids.length} mutual connections`)
    
    // Debug: Show first few mutual FIDs
    if (mutualFids.length > 0) {
      console.log(`🔍 First few mutual FIDs: ${mutualFids.slice(0, 10).join(', ')}`)
    }

    if (mutualFids.length === 0) {
      const emptyResult: MutualFollower[] = []
      mutualFollowersCache.set(userFid, emptyResult)
      return emptyResult
    }

    // Fetch detailed profile information for ALL mutual followers
    // Use bulk API calls and proper rate limiting
    const maxProfiles = 5000 // Generous limit - should cover 99.9% of users
    const profilesToFetch = Math.min(mutualFids.length, maxProfiles)
    const batchSize = 20 // Smaller batches to avoid rate limits
    const allProfiles: (FarcasterUser | null)[] = []
    
    if (mutualFids.length > maxProfiles) {
      console.log(`⚠️ Found ${mutualFids.length} mutual followers, limiting to ${maxProfiles} for API performance`)
    } else {
      console.log(`📊 Fetching profiles for all ${mutualFids.length} mutual followers`)
    }
    
    console.log(`📋 Fetching profiles for ${profilesToFetch} mutual followers in batches of ${batchSize}...`)
    console.log(`⏱️ Estimated time: ~${Math.ceil(profilesToFetch / batchSize) * 0.3} seconds (with rate limiting)`)
    
    for (let i = 0; i < profilesToFetch; i += batchSize) {
      const batch = mutualFids.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(profilesToFetch / batchSize)
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} profiles)`)
      
      try {
        // Use bulk API call for better efficiency
        const client = getNeynarClient()
        const response = await client.fetchBulkUsers({ fids: batch })
        
        if (response?.users) {
          const batchProfiles = batch.map(fid => {
            const user = response.users.find((u: any) => u.fid === fid)
            if (!user) return null
            
            return {
              fid: user.fid,
              username: user.username,
              displayName: user.display_name || user.username,
              pfpUrl: user.pfp_url || '',
              custodyAddress: user.custody_address,
              followerCount: user.follower_count || 0,
              followingCount: user.following_count || 0,
              bio: user.profile?.bio?.text || '',
              isVerified: user.power_badge || false
            }
          })
          allProfiles.push(...batchProfiles)
        } else {
          // Fallback to individual calls if bulk fails
          const profilePromises = batch.map(fid => getUserProfile(fid))
          const batchProfiles = await Promise.all(profilePromises)
          allProfiles.push(...batchProfiles)
        }
      } catch (error: any) {
        if (error?.status === 429) {
          console.log(`⏳ Rate limited on batch ${batchNumber}, waiting 2 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Retry with individual calls
          const profilePromises = batch.map(fid => getUserProfile(fid))
          const batchProfiles = await Promise.all(profilePromises)
          allProfiles.push(...batchProfiles)
        } else {
          console.error(`Error fetching batch ${batchNumber}:`, error?.message || error)
          // Add nulls for failed batch
          allProfiles.push(...new Array(batch.length).fill(null))
        }
      }
      
             // Delay between batches to respect rate limits
       if (i + batchSize < profilesToFetch) {
         await new Promise(resolve => setTimeout(resolve, 300)) // 300ms delay (reduced from 500ms)
       }
    }
    
    const profiles = allProfiles

    // Filter out null results and convert to MutualFollower format
    const mutualFollowers: MutualFollower[] = profiles
      .filter((profile): profile is FarcasterUser => profile !== null)
      .map(profile => ({
        fid: profile.fid,
        username: profile.username,
        displayName: profile.displayName,
        pfpUrl: profile.pfpUrl,
        bio: profile.bio,
        followerCount: profile.followerCount,
        followingCount: profile.followingCount,
        isVerified: profile.isVerified
      }))

    console.log(`✅ Successfully fetched ${mutualFollowers.length} mutual follower profiles`)

    // Cache the results
    mutualFollowersCache.set(userFid, mutualFollowers)

    return mutualFollowers
  } catch (error) {
    console.error('Error fetching mutual followers:', error)
    throw new Error(`Failed to fetch mutual followers: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Clear cache for a specific user or all users
 */
export function clearMutualFollowersCache(fid?: number): void {
  mutualFollowersCache.clear(fid)
  console.log(fid ? `🗑️ Cleared cache for FID ${fid}` : '🗑️ Cleared all mutual followers cache')
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { totalEntries: number, cacheKeys: number[] } {
  const entries = Array.from(mutualFollowersCache['cache'].entries())
  return {
    totalEntries: entries.length,
    cacheKeys: entries.map(([fid]) => fid)
  }
}

/**
 * Refresh mutual followers data (bypass cache)
 */
export async function refreshMutualFollowers(userFid: number): Promise<MutualFollower[]> {
  clearMutualFollowersCache(userFid)
  return getMutualFollowers(userFid, false)
}

// Get user's followers who are also following them (mutual connections)
export async function getUserMutuals() {
  try {
    // This will be implemented in Task 9 when we build the social graph
    // Parameter: (fid: number)
    return []
  } catch (error) {
    console.error('Error fetching user mutuals:', error)
    return []
  }
} 