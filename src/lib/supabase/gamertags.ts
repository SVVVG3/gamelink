import { createClient } from './client'

export type Platform = 'PSN' | 'Xbox' | 'Steam' | 'Nintendo' | 'Epic' | 'Discord' | 'Riot' | 'PokemonGO'

export interface Gamertag {
  id: string
  profile_id: string
  platform: Platform
  gamertag: string
  display_name?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface CreateGamertagData {
  profile_id: string
  platform: Platform
  gamertag: string
  display_name?: string
  is_public?: boolean
}

export interface UpdateGamertagData {
  gamertag?: string
  display_name?: string
  is_public?: boolean
}

/**
 * Get all gamertags for a profile
 */
export async function getGamertagsByProfileId(profileId: string): Promise<Gamertag[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('gamertags')
    .select('*')
    .eq('profile_id', profileId)
    .order('platform')

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get public gamertags for a profile
 */
export async function getPublicGamertagsByProfileId(profileId: string): Promise<Gamertag[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('gamertags')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_public', true)
    .order('platform')

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get a specific gamertag by profile and platform
 */
export async function getGamertagByPlatform(
  profileId: string, 
  platform: Platform
): Promise<Gamertag | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('gamertags')
    .select('*')
    .eq('profile_id', profileId)
    .eq('platform', platform)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw error
  }

  return data
}

/**
 * Create a new gamertag
 */
export async function createGamertag(gamertagData: CreateGamertagData): Promise<Gamertag> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('gamertags')
    .insert(gamertagData)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Update an existing gamertag
 */
export async function updateGamertag(
  profileId: string,
  platform: Platform,
  updates: UpdateGamertagData
): Promise<Gamertag> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('gamertags')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .eq('platform', platform)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Upsert a gamertag (create if doesn't exist, update if it does)
 */
export async function upsertGamertag(gamertagData: CreateGamertagData): Promise<Gamertag> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('gamertags')
    .upsert(gamertagData, { 
      onConflict: 'profile_id,platform',
      ignoreDuplicates: false 
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Delete a gamertag
 */
export async function deleteGamertag(profileId: string, platform: Platform): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('gamertags')
    .delete()
    .eq('profile_id', profileId)
    .eq('platform', platform)

  if (error) {
    throw error
  }
}

/**
 * Get all public gamertags across all users (for finding friends by platform)
 */
export async function getPublicGamertagsByPlatform(platform: Platform): Promise<Gamertag[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('gamertags')
    .select(`
      *,
      profiles:profile_id (
        fid,
        username,
        display_name,
        pfp_url
      )
    `)
    .eq('platform', platform)
    .eq('is_public', true)
    .order('gamertag')

  if (error) {
    throw error
  }

  return data || []
} 