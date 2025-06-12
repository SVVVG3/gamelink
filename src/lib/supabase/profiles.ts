import { createClient } from './client'

export interface Profile {
  id: string
  fid: number
  username: string
  display_name?: string
  bio?: string
  pfp_url?: string
  created_at: string
  updated_at: string
}

export interface CreateProfileData {
  fid: number
  username: string
  display_name?: string
  bio?: string
  pfp_url?: string
}

export interface UpdateProfileData {
  username?: string
  display_name?: string
  bio?: string
  pfp_url?: string
}

/**
 * Get a profile by Farcaster FID
 */
export async function getProfileByFid(fid: number): Promise<Profile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('fid', fid)
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
 * Create a new profile
 */
export async function createProfile(profileData: CreateProfileData): Promise<Profile> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .insert(profileData)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Update an existing profile
 */
export async function updateProfile(fid: number, updates: UpdateProfileData): Promise<Profile> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('fid', fid)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Upsert a profile (create if doesn't exist, update if it does)
 */
export async function upsertProfile(profileData: CreateProfileData): Promise<Profile> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData, { 
      onConflict: 'fid',
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
 * Get all profiles (for finding friends)
 */
export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
} 