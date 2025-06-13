'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { getUserGroups, getPublicGroups } from '@/lib/supabase/groups'
import BottomNavigation from '@/components/BottomNavigation'
import type { GroupWithMemberCount } from '@/types'

export default function GroupsPage() {
  const { isAuthenticated, profile, isLoading: userLoading } = useUser()
  
  // State
  const [userGroups, setUserGroups] = useState<GroupWithMemberCount[]>([])
  const [publicGroups, setPublicGroups] = useState<GroupWithMemberCount[]>([])
  const [isLoadingUserGroups, setIsLoadingUserGroups] = useState(false)
  const [isLoadingPublicGroups, setIsLoadingPublicGroups] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'my-groups' | 'discover'>('my-groups')

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

  return (
    <Link href={`/groups/${group.id}`}>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
              {group.name}
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
    </Link>
  )
} 