'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaUsers, FaCrown, FaUserShield, FaUser, FaSpinner, FaPlus, FaTimes, FaUserMinus } from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import { getGroupById, removeGroupMember, createGroupInvitation, getProfileIdsByFids } from '@/lib/supabase/groups'
import { useSocialData } from '@/contexts/SocialDataContext'
import BottomNavigation from '@/components/BottomNavigation'
import type { GroupWithMembers } from '@/types'

interface Props {
  params: Promise<{ groupId: string }>
}

export default function MembersClient({ params }: Props) {
  const { isAuthenticated, isLoading: userLoading, profile } = useUser()
  const { mutualFollowers } = useSocialData()
  
  const [groupId, setGroupId] = useState<string>('')
  const [group, setGroup] = useState<GroupWithMembers | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedInvitees, setSelectedInvitees] = useState<Set<number>>(new Set())
  const [isInviting, setIsInviting] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
        console.log('🔍 loadGroup: Starting to load group', { groupId, profileId: profile.id })
        
        const groupData = await getGroupById(groupId, true) // true to include members
        console.log('🔍 loadGroup: Group data received', { 
          groupData, 
          hasCreatedBy: !!groupData?.createdBy,
          createdBy: groupData?.createdBy,
          memberCount: groupData?.members?.length 
        })
        
        if (!groupData) {
          console.log('🔍 loadGroup: No group data returned')
          setError('Group not found')
          return
        }

        setGroup(groupData)
        console.log('🔍 loadGroup: Group state set successfully')
      } catch (err) {
        console.error('🔍 loadGroup: Error loading group:', err)
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

  const isUserAdmin = () => {
    if (!group || !profile?.id) {
      console.log('🔍 isUserAdmin: Missing group or profile', { group: !!group, profileId: profile?.id })
      return false
    }
    
    const isCreator = group.createdBy === profile.id
    const isAdmin = group.members?.some(member => 
      member.userId === profile.id && 
      member.role === 'admin' && 
      member.status === 'active'
    )
    
    console.log('🔍 isUserAdmin check:', {
      groupCreatedBy: group.createdBy,
      profileId: profile.id,
      isCreator,
      isAdmin,
      result: isCreator || isAdmin,
      members: group.members?.map(m => ({ userId: m.userId, role: m.role, status: m.status }))
    })
    
    return isCreator || isAdmin
  }

  const handleInviteMembers = async () => {
    if (!group || !profile?.id || selectedInvitees.size === 0) return

    setIsInviting(true)
    try {
      // Get profile IDs for all selected FIDs
      const fidArray = Array.from(selectedInvitees)
      const fidToIdMap = await getProfileIdsByFids(fidArray)
      
      const invitationPromises = fidArray.map(async (fid) => {
        const profileId = fidToIdMap.get(fid)
        if (!profileId) {
          console.warn(`No profile found for FID ${fid}`)
          return null
        }
        
        try {
          const invitation = await createGroupInvitation(
            group.id,
            profile.id,
            profileId,
            `You've been invited to join "${group.name}"!`
          )
          
          // Send notification for the invitation (async, don't wait for completion)
          if (invitation) {
            fetch('/api/notifications/group-invitation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                invitationId: invitation.id
              })
            }).catch(error => {
              console.warn('Failed to send group invitation notification:', error)
            })
          }
          
          return invitation
        } catch (err) {
          console.warn(`Failed to invite user ${fid}:`, err)
          return null
        }
      })

      await Promise.allSettled(invitationPromises)
      
      // Reset and close modal
      setSelectedInvitees(new Set())
      setShowInviteModal(false)
      
      // Show success message (you could add a toast here)
      alert(`Invitations sent to ${selectedInvitees.size} users!`)
      
    } catch (err) {
      console.error('Error sending invitations:', err)
      alert('Failed to send some invitations. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!group || !profile?.id) return
    
    if (!confirm(`Are you sure you want to remove ${memberName} from the group?`)) {
      return
    }

    setRemovingMemberId(memberId)
    try {
      await removeGroupMember(group.id, memberId)
      
      // Reload group data to reflect changes
      const updatedGroup = await getGroupById(groupId, true)
      if (updatedGroup) {
        setGroup(updatedGroup)
      }
      
    } catch (err) {
      console.error('Error removing member:', err)
      alert('Failed to remove member. Please try again.')
    } finally {
      setRemovingMemberId(null)
    }
  }

  // Get mutual followers who aren't already members
  const availableInvitees = mutualFollowers?.filter(follower => {
    const isNotMember = !group?.members?.some(member => member.profile.fid === follower.fid)
    const matchesSearch = searchQuery === '' || 
      follower.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      follower.username?.toLowerCase().includes(searchQuery.toLowerCase())
    return isNotMember && matchesSearch
  }) || []

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
          
          {isUserAdmin() && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <FaPlus className="w-3 h-3" />
              <span>Invite</span>
            </button>
          )}
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
                      
                      {/* Remove member button (only for admins, can't remove self or other admins) */}
                      {isUserAdmin() && 
                       member.userId !== profile?.id && 
                       member.role !== 'admin' && (
                        <button
                          onClick={() => handleRemoveMember(member.userId, member.profile.display_name || member.profile.username)}
                          disabled={removingMemberId === member.userId}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                          title="Remove member"
                        >
                          {removingMemberId === member.userId ? (
                            <FaSpinner className="w-3 h-3 animate-spin" />
                          ) : (
                            <FaUserMinus className="w-3 h-3" />
                          )}
                        </button>
                      )}
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
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Invite Members</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search followers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-96">
              {availableInvitees.length > 0 ? (
                <div className="space-y-2">
                  {availableInvitees.map((follower) => (
                    <div key={follower.fid} className="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded-lg">
                      <input
                        type="checkbox"
                        id={`invite-${follower.fid}`}
                        checked={selectedInvitees.has(follower.fid)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedInvitees)
                          if (e.target.checked) {
                            newSelected.add(follower.fid)
                          } else {
                            newSelected.delete(follower.fid)
                          }
                          setSelectedInvitees(newSelected)
                        }}
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <img
                        src={follower.pfpUrl || '/default-avatar.png'}
                        alt={follower.displayName || follower.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <label htmlFor={`invite-${follower.fid}`} className="flex-1 cursor-pointer">
                        <p className="text-white text-sm font-medium">
                          {follower.displayName || follower.username}
                        </p>
                        <p className="text-gray-400 text-xs">@{follower.username}</p>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FaUsers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No mutual followers available to invite</p>
                </div>
              )}
            </div>
            
            {availableInvitees.length > 0 && (
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteMembers}
                    disabled={selectedInvitees.size === 0 || isInviting}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {isInviting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        <span>Inviting...</span>
                      </div>
                    ) : (
                      `Invite ${selectedInvitees.size} ${selectedInvitees.size === 1 ? 'person' : 'people'}`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <BottomNavigation />
    </main>
  )
} 