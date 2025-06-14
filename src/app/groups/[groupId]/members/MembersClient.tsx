'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaUsers, FaSpinner, FaCrown, FaUserShield, FaUser } from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import { getGroupById } from '@/lib/supabase/groups'
import BottomNavigation from '@/components/BottomNavigation'
import type { GroupWithMembers } from '@/types'

interface Props {
  params: Promise<{ groupId: string }>
}

export default function MembersClient({ params }: Props) {
  const { isAuthenticated, isLoading: userLoading, profile } = useUser()
  
  const [groupId, setGroupId] = useState<string>('')
  const [group, setGroup] = useState<GroupWithMembers | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getGroupId = async () => {
      const resolvedParams = await params
      setGroupId(resolvedParams.groupId)
    }
    getGroupId()
  }, [params])

  // Load group data
  useEffect(() => {
    const loadGroup = async () => {
      if (!groupId || !profile?.id) return

      try {
        setError(null)
        const groupData = await getGroupById(groupId, true) // true to include members
        
        if (!groupData) {
          setError('Group not found')
          return
        }

        setGroup(groupData)
      } catch (err) {
        console.error('Error loading group:', err)
        setError(err instanceof Error ? err.message : 'Failed to load group')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated && groupId && profile?.id) {
      loadGroup()
    }
  }, [isAuthenticated, groupId, profile?.id])

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <FaCrown className="w-4 h-4 text-yellow-400" />
      case 'moderator': return <FaUserShield className="w-4 h-4 text-blue-400" />
      default: return <FaUser className="w-4 h-4 text-gray-400" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-yellow-400'
      case 'moderator': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  // Loading state
  if (userLoading || isLoading) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading members...</p>
        </div>
      </main>
    )
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-gray-900 pb-20">
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <Link 
            href={`/groups/${groupId}`}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Group
          </Link>
        </div>
        
        <div className="p-4">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <h2 className="text-red-400 font-medium mb-2">Error</h2>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
        
        <BottomNavigation />
      </main>
    )
  }

  if (!group) {
    return (
      <main className="min-h-screen bg-gray-900 pb-20">
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <Link 
            href={`/groups/${groupId}`}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Group
          </Link>
        </div>
        
        <div className="p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
            <p className="text-gray-300">Group not found</p>
          </div>
        </div>
        
        <BottomNavigation />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <Link 
            href={`/groups/${groupId}`}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Group
          </Link>
          
          <h1 className="text-xl font-bold text-white">Manage Members</h1>
          
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
        
        <div className="mt-4">
          <h2 className="text-lg font-medium text-white">{group.name}</h2>
          <p className="text-gray-400 text-sm">{group.memberCount} members</p>
        </div>
      </div>

      {/* Members List */}
      <div className="p-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <FaUsers className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Members</h3>
            </div>
          </div>
          
          <div className="divide-y divide-gray-700">
            {group.members && group.members.length > 0 ? (
              group.members.map((member) => (
                <div key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.profile.pfp_url || '/default-avatar.png'}
                        alt={member.profile.display_name || member.profile.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="text-white font-medium">
                          {member.profile.display_name || member.profile.username}
                        </p>
                        <p className="text-gray-400 text-sm">@{member.profile.username}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        {getRoleIcon(member.role)}
                        <span className={`text-sm capitalize ${getRoleColor(member.role)}`}>
                          {member.role}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <FaUsers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No members found</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Future: Add member management actions here */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            💡 Member management features (promote, demote, remove) will be added in a future update.
          </p>
        </div>
      </div>
      
      <BottomNavigation />
    </main>
  )
} 