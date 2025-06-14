'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { useInvitations } from '@/hooks/useInvitations'
import { getUserGroups, getPublicGroups, acceptGroupInvitation, declineGroupInvitation, getUserInvitations } from '@/lib/supabase/groups'
import type { GroupWithMemberCount, GroupInvitationWithDetails } from '@/types'
import BottomNavigation from '@/components/BottomNavigation'
import { FaPlus, FaUsers, FaSpinner, FaExclamationTriangle, FaGamepad, FaLock, FaCheck, FaTimes } from 'react-icons/fa'

export default function GroupsPage() {
  const { isAuthenticated, profile, isLoading: userLoading } = useUser()
  const { invitations, pendingCount, refetch: refetchInvitations } = useInvitations()
  
  // State
  const [userGroups, setUserGroups] = useState<GroupWithMemberCount[]>([])
  const [publicGroups, setPublicGroups] = useState<GroupWithMemberCount[]>([])
  const [isLoadingUserGroups, setIsLoadingUserGroups] = useState(false)
  const [isLoadingPublicGroups, setIsLoadingPublicGroups] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'my-groups' | 'discover' | 'invitations'>('my-groups')
  const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set())

  // Load user's groups
  const loadUserGroups = async () => {
    if (!profile?.id) return
    
    setIsLoadingUserGroups(true)
    setError(null)
    
    try {
      const groups = await getUserGroups(profile.id)
      setUserGroups(groups)
    } catch (err) {
      console.error('Error loading user groups:', err)
      setError('Failed to load your groups')
    } finally {
      setIsLoadingUserGroups(false)
    }
  }

  // Load public groups for discovery
  const loadPublicGroups = async () => {
    setIsLoadingPublicGroups(true)
    setError(null)
    
    try {
      const groups = await getPublicGroups({ limit: 20 })
      setPublicGroups(groups)
    } catch (err) {
      console.error('Error loading public groups:', err)
      setError('Failed to load public groups')
    } finally {
      setIsLoadingPublicGroups(false)
    }
  }

  // Load data when user is available
  useEffect(() => {
    if (isAuthenticated && profile?.id) {
      loadUserGroups()
    }
  }, [isAuthenticated, profile?.id])

  // Load public groups when discover tab is active
  useEffect(() => {
    if (activeTab === 'discover' && publicGroups.length === 0) {
      loadPublicGroups()
    }
  }, [activeTab])

  // Handle invitation actions
  const handleAcceptInvitation = async (invitationId: string) => {
    setProcessingInvitations(prev => new Set(prev).add(invitationId))
    
    try {
      const success = await acceptGroupInvitation(invitationId)
      if (success) {
        // Refresh invitations and user groups
        await Promise.all([refetchInvitations(), loadUserGroups()])
      } else {
        setError('Failed to accept invitation')
      }
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError('Failed to accept invitation')
    } finally {
      setProcessingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(invitationId)
        return newSet
      })
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    setProcessingInvitations(prev => new Set(prev).add(invitationId))
    
    try {
      await declineGroupInvitation(invitationId)
      // Refresh invitations
      await refetchInvitations()
    } catch (err) {
      console.error('Error declining invitation:', err)
      setError('Failed to decline invitation')
    } finally {
      setProcessingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(invitationId)
        return newSet
      })
    }
  }

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-gray-800 rounded-lg p-8">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-2xl font-bold text-white mb-4">Join Gaming Groups</h1>
          <p className="text-gray-400 mb-6">
            Connect with gamers, join communities, and organize gaming sessions together.
          </p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors inline-block"
          >
            Sign In to Get Started
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Gaming Groups</h1>
              <p className="text-gray-400 mt-1">
                Connect with gaming communities
              </p>
            </div>
            {/* Create Group Button */}
            <Link
              href="/groups/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Group</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('my-groups')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'my-groups'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              My Groups ({userGroups.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`relative py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'invitations'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Invitations ({pendingCount})
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'discover'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Discover
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* My Groups Tab */}
        {activeTab === 'my-groups' && (
          <div>
            {isLoadingUserGroups ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
                <p className="text-gray-400">Loading your groups...</p>
              </div>
            ) : userGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎮</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Groups Yet</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Create your first gaming group or discover existing communities to join.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/groups/new"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Create Your First Group
                  </Link>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Discover Groups
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userGroups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div>
            {invitations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v1M7 8h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Pending Invitations</h3>
                <p className="text-gray-400">You don't have any pending group invitations at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    isProcessing={processingInvitations.has(invitation.id)}
                    onAccept={() => handleAcceptInvitation(invitation.id)}
                    onDecline={() => handleDeclineInvitation(invitation.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div>
            {isLoadingPublicGroups ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
                <p className="text-gray-400">Discovering groups...</p>
              </div>
            ) : publicGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Public Groups Found</h3>
                <p className="text-gray-400 mb-6">
                  Be the first to create a public gaming group!
                </p>
                <Link
                  href="/groups/new"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors inline-block"
                >
                  Create Public Group
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publicGroups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <BottomNavigation />
    </div>
  )
}

// Group Card Component
function GroupCard({ group }: { group: GroupWithMemberCount }) {
  const { profile } = useUser()
  const [isNavigating, setIsNavigating] = useState(false)

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'PC': return '💻'
      case 'PlayStation': return '🎮'
      case 'Xbox': return '🎮'
      case 'Nintendo Switch': return '🎮'
      case 'Mobile': return '📱'
      default: return '🎮'
    }
  }

  const getSkillBadge = (skill?: string) => {
    switch (skill) {
      case 'beginner': return { text: 'Beginner', color: 'bg-green-600' }
      case 'intermediate': return { text: 'Intermediate', color: 'bg-yellow-600' }
      case 'advanced': return { text: 'Advanced', color: 'bg-orange-600' }
      case 'expert': return { text: 'Expert', color: 'bg-red-600' }
      default: return { text: 'Any Level', color: 'bg-gray-600' }
    }
  }

  const skillBadge = getSkillBadge(group.skillLevel)

  // Navigate to group details page (will show preview for non-members, chat for members)
  const handleGroupClick = () => {
    if (isNavigating) return
    
    setIsNavigating(true)
    // Navigate to group details page
    window.location.href = `/groups/${group.id}`
  }

  return (
    <div 
      onClick={handleGroupClick}
      className={`cursor-pointer ${isNavigating ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
              {group.name}
              {isNavigating && <FaSpinner className="inline ml-2 w-4 h-4 animate-spin" />}
            </h3>
            {group.primaryGame && (
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>{getPlatformIcon(group.gamingPlatform)}</span>
                <span>{group.primaryGame}</span>
              </div>
            )}
          </div>
          {group.isPrivate && (
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Private</span>
            </div>
          )}
        </div>

        {/* Description */}
        {group.description && (
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
            {group.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span>{group.memberCount} members</span>
            </div>
          </div>
          
          <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${skillBadge.color}`}>
            {skillBadge.text}
          </span>
        </div>
      </div>
    </div>
  )
}

// Invitation Card Component
interface InvitationCardProps {
  invitation: GroupInvitationWithDetails
  isProcessing: boolean
  onAccept: () => void
  onDecline: () => void
}

function InvitationCard({ invitation, isProcessing, onAccept, onDecline }: InvitationCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isExpired = new Date((invitation as any).expires_at || invitation.expiresAt) < new Date()

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Group Info */}
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white font-bold text-lg">
                {(invitation as any).groups?.name?.charAt(0).toUpperCase() || 'G'}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{(invitation as any).groups?.name || 'Unknown Group'}</h3>
              <p className="text-sm text-gray-400">
                Invited by {invitation.inviter?.username || 'Unknown User'}
              </p>
            </div>
          </div>

          {/* Group Details */}
          {(invitation as any).groups?.description && (
            <p className="text-gray-300 mb-3">{(invitation as any).groups.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
            {(invitation as any).groups?.primary_game && (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10v18a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2h8l4 4z" />
                </svg>
                {(invitation as any).groups.primary_game}
              </span>
            )}
            {(invitation as any).groups?.gaming_platform && (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {(invitation as any).groups.gaming_platform}
              </span>
            )}
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Expires {formatDate((invitation as any).expires_at || invitation.expiresAt)}
            </span>
          </div>

          {/* Invitation Message */}
          {invitation.message && (
            <div className="bg-gray-700 rounded-lg p-3 mb-4">
              <p className="text-gray-200 italic">"{invitation.message}"</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 ml-4">
          {isExpired ? (
            <span className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg text-sm">
              Expired
            </span>
          ) : (
            <>
              <button
                onClick={onAccept}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isProcessing ? 'Accepting...' : 'Accept'}
              </button>
              <button
                onClick={onDecline}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isProcessing ? 'Declining...' : 'Decline'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 