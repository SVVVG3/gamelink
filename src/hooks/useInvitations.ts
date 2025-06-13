'use client'

import { useState, useEffect } from 'react'
import { useUser } from './useUser'
import { getUserInvitations } from '../lib/supabase/groups'
import type { GroupInvitationWithDetails } from '../types'

export function useInvitations() {
  const { isAuthenticated, profile } = useUser()
  const [invitations, setInvitations] = useState<GroupInvitationWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInvitations = async () => {
    if (!profile || !isAuthenticated) return
    
    try {
      setIsLoading(true)
      setError(null)
      const userInvitations = await getUserInvitations(profile.id)
      setInvitations(userInvitations)
    } catch (err) {
      console.error('Error loading invitations:', err)
      setError('Failed to load invitations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && profile) {
      loadInvitations()
    }
  }, [isAuthenticated, profile])

  const pendingCount = invitations.filter(inv => 
    inv.status === 'pending' && new Date((inv as any).expires_at || inv.expiresAt) > new Date()
  ).length

  return {
    invitations,
    pendingCount,
    isLoading,
    error,
    refetch: loadInvitations
  }
} 