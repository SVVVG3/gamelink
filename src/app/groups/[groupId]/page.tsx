'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { getGroupById, getOrCreateGroupChat, isGroupMember } from '@/lib/supabase/groups'
import { getChatById, type ChatWithParticipants, type MessageWithSender } from '@/lib/supabase/chats'
import MessageList from '@/components/MessageList'
import MessageComposer from '@/components/MessageComposer'
import BottomNavigation from '@/components/BottomNavigation'
import { FaArrowLeft, FaUsers, FaSpinner, FaExclamationTriangle, FaCog, FaGamepad, FaLock, FaShare } from 'react-icons/fa'
import type { GroupWithMembers } from '@/types'

// Extended interface to include user profile data
interface ChatWithUserProfiles extends ChatWithParticipants {
  participantProfiles?: Array<{
    fid: number
    username: string
    display_name?: string
    pfp_url?: string
  }>
}

export default function GroupPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: userLoading, profile } = useUser()
  
  const groupId = params.groupId as string
  
  // Component state
  const [group, setGroup] = useState<GroupWithMembers | null>(null)
  const [chat, setChat] = useState<ChatWithUserProfiles | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [userRole, setUserRole] = useState<string | undefined>()
  const [showSettings, setShowSettings] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Fetch user profiles for chat participants
  const fetchUserProfiles = async (fids: number[]) => {
    if (fids.length === 0) return {}
    
    try {
      const response = await fetch('/api/farcaster/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fids })
      })
      
      if (!response.ok) {
        console.error('Failed to fetch user profiles')
        return {}
      }
      
      const data = await response.json()
      return data.users || {}
    } catch (error) {
      console.error('Error fetching user profiles:', error)
      return {}
    }
  }

  // Load group and chat data
  const loadGroupData = useCallback(async () => {
    if (!groupId || !profile?.id) return
    
    try {
      setError(null)
      
      // Load group information
      const groupData = await getGroupById(groupId, true)
      if (!groupData) {
        setError('Group not found')
        return
      }
      
      setGroup(groupData)
      
      // Check if user is a member
      const membershipCheck = await isGroupMember(groupId, profile.id)
      setIsMember(membershipCheck.isMember)
      setUserRole(membershipCheck.role)
      
      // If user is not a member, don't load chat
      if (!membershipCheck.isMember) {
        return
      }
      
      // Get or create group chat
      const groupChatId = await getOrCreateGroupChat(groupId, profile.id)
      setChatId(groupChatId)
      
      // Load chat data
      const chatData = await getChatById(groupChatId, profile.fid!)
      if (!chatData) {
        setError('Failed to load group chat')
        return
      }
      
      // Collect all unique FIDs from chat participants
      const allFids = chatData.participants
        .filter(p => p.fid)
        .map(p => p.fid!)
      
      // Fetch user profiles for all participants
      const userProfiles = await fetchUserProfiles(allFids)
      
      // Merge profile data with chat
      const chatWithProfiles: ChatWithUserProfiles = {
        ...chatData,
        participantProfiles: chatData.participants
          .filter(p => p.fid)
          .map(p => userProfiles[p.fid!])
          .filter(Boolean)
      }
      
      setChat(chatWithProfiles)
    } catch (err) {
      console.error('Error loading group data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load group')
    } finally {
      setIsLoading(false)
    }
  }, [groupId, profile?.id, profile?.fid])

  // Load data when component mounts or groupId changes
  useEffect(() => {
    if (isAuthenticated && groupId && profile?.id) {
      loadGroupData()
    }
  }, [isAuthenticated, groupId, profile?.id, loadGroupData])

  // Handle message sent
  const handleMessageSent = (message: MessageWithSender) => {
    console.log('Message sent:', message)
    // The MessageList component will handle adding the message via real-time subscription
  }

  // Handle message error
  const handleMessageError = (error: string) => {
    console.error('Message error:', error)
    // Could show a toast notification here
  }

  // Get platform icon
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

  // Get skill badge
  const getSkillBadge = (skill?: string) => {
    switch (skill) {
      case 'beginner': return { text: 'Beginner', color: 'bg-green-600' }
      case 'intermediate': return { text: 'Intermediate', color: 'bg-yellow-600' }
      case 'advanced': return { text: 'Advanced', color: 'bg-orange-600' }
      case 'expert': return { text: 'Expert', color: 'bg-red-600' }
      default: return { text: 'Any Level', color: 'bg-gray-600' }
    }
  }

  // Share group frame
  const shareGroupFrame = async () => {
    if (!group) return
    
    // Share the group page URL, not the frame endpoint
    const groupPageUrl = `${window.location.origin}/groups/${groupId}`
    const shareText = `🎮 Join my gaming group: ${group.name}!\n\n${group.description ? group.description + '\n\n' : ''}${group.primaryGame ? `Game: ${group.primaryGame}\n` : ''}Members: ${group.memberCount}/${group.maxMembers}\n\n`
    
    // Try to use Farcaster SDK if available (Mini App context)
    try {
      const { sdk } = await import('@farcaster/frame-sdk')
      
      // Check if we're in a Mini App context by trying to get context
      const context = await sdk.context
      if (context && context.client) {
        const result = await sdk.actions.composeCast({
          text: shareText,
          embeds: [groupPageUrl]
        })
        
        if (result?.cast) {
          console.log('Cast shared successfully:', result.cast.hash)
        }
        return
      }
    } catch (error) {
      console.error('Farcaster SDK not available, using web fallback:', error)
    }
    
    // Fallback for standalone web app - open Warpcast
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(groupPageUrl)}`
    window.open(farcasterUrl, '_blank')
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 pb-20">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-white">Sign In Required</h1>
          <p className="text-gray-300">You need to sign in to access this group.</p>
          <button
            onClick={() => router.push('/groups')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Groups
          </button>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  if (userLoading || isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 pb-20">
        <div className="text-center">
          <FaSpinner className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading group...</p>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  if (error || !group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 pb-20">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <FaExclamationTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Group Error</h1>
          <p className="text-red-300">{error || 'Group not found'}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/groups')}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Back to Groups
            </button>
            <button
              onClick={loadGroupData}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  // If user is not a member, show group info with join option
  if (!isMember) {
    const skillBadge = getSkillBadge(group.skillLevel)
    
    return (
      <main className="min-h-screen bg-gray-900 pb-20">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/groups')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
            </button>
            
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center space-x-2">
                <span>{group.name}</span>
                {group.isPrivate && <FaLock className="w-4 h-4 text-gray-400" />}
              </h1>
              <p className="text-sm text-gray-400 flex items-center">
                <FaUsers className="w-3 h-3 mr-1" />
                {group.memberCount} members
              </p>
            </div>
          </div>
        </div>

        {/* Group Info */}
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            {/* Group Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-2xl font-bold text-white mb-2">{group.name}</h2>
              {group.description && (
                <p className="text-gray-400 mb-4">{group.description}</p>
              )}
            </div>

            {/* Group Details */}
            <div className="space-y-4 mb-6">
              {group.primaryGame && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Primary Game</span>
                  <div className="flex items-center space-x-2">
                    <span>{getPlatformIcon(group.gamingPlatform)}</span>
                    <span className="text-white">{group.primaryGame}</span>
                  </div>
                </div>
              )}
              
              {group.gamingPlatform && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Platform</span>
                  <span className="text-white">{group.gamingPlatform}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Skill Level</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${skillBadge.color}`}>
                  {skillBadge.text}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Members</span>
                <span className="text-white">{group.memberCount} / {group.maxMembers}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Privacy</span>
                <span className="text-white">{group.isPrivate ? 'Private' : 'Public'}</span>
              </div>
            </div>

            {/* Join Action */}
            <div className="text-center">
              <p className="text-gray-400 mb-4">
                You need to be a member to access the group chat.
              </p>
              <button
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                onClick={() => {
                  // TODO: Implement join group functionality
                  alert('Join group functionality coming soon!')
                }}
              >
                Request to Join
              </button>
            </div>
          </div>
        </div>

        <BottomNavigation />
      </main>
    )
  }

  // Member view with chat
  return (
    <main className="min-h-screen bg-gray-900 flex flex-col pb-20">
      {/* Group Chat Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/groups')}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center space-x-2">
              <span>{group.name}</span>
              {group.isPrivate && <FaLock className="w-4 h-4 text-gray-400" />}
            </h1>
            <p className="text-sm text-gray-400 flex items-center">
              <FaUsers className="w-3 h-3 mr-1" />
              {group.memberCount} members
              {group.primaryGame && (
                <>
                  <span className="mx-2">•</span>
                  <FaGamepad className="w-3 h-3 mr-1" />
                  {group.primaryGame}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Group actions */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={shareGroupFrame}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Share Group"
          >
            <FaShare className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FaCog className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      {chatId ? (
        <div className="flex-1 flex flex-col min-h-0">
          <MessageList
            chatId={chatId}
            onNewMessage={(message) => console.log('New message received:', message)}
            className="flex-1"
          />
          
          {/* Message Composer */}
          <div className="p-4 border-t border-gray-700">
            <MessageComposer
              chatId={chatId}
              onMessageSent={handleMessageSent}
              onError={handleMessageError}
              placeholder={`Message ${group.name}...`}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Setting up group chat...</p>
          </div>
        </div>
      )}

      <BottomNavigation />

      {/* Group Settings Modal */}
      {showSettings && (
        <GroupSettingsModal
          group={group}
          userRole={userRole}
          onClose={() => setShowSettings(false)}
          onGroupUpdated={loadGroupData}
          onInviteMembers={() => setShowInviteModal(true)}
        />
      )}

      {/* Invite Members Modal */}
      {showInviteModal && (
        <InviteMembersModal
          group={group}
          onClose={() => setShowInviteModal(false)}
          onInvitesSent={loadGroupData}
        />
      )}
    </main>
  )
}

// Group Settings Modal Component
interface GroupSettingsModalProps {
  group: GroupWithMembers
  userRole?: string
  onClose: () => void
  onGroupUpdated: () => void
  onInviteMembers: () => void
}

function GroupSettingsModal({ group, userRole, onClose, onGroupUpdated, onInviteMembers }: GroupSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'permissions'>('info')
  const isAdmin = userRole === 'admin'
  const isModerator = userRole === 'moderator' || isAdmin

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Group Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Group Info
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Members ({group.memberCount})
          </button>
          {isModerator && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'permissions'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Permissions
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'info' && (
            <GroupInfoTab group={group} isAdmin={isAdmin} onGroupUpdated={onGroupUpdated} />
          )}
          {activeTab === 'members' && (
            <GroupMembersTab 
              group={group} 
              userRole={userRole} 
              onGroupUpdated={onGroupUpdated}
              onInviteMembers={onInviteMembers}
            />
          )}
          {activeTab === 'permissions' && isModerator && (
            <GroupPermissionsTab group={group} isAdmin={isAdmin} onGroupUpdated={onGroupUpdated} />
          )}
        </div>
      </div>
    </div>
  )
}

// Group Info Tab
function GroupInfoTab({ group, isAdmin, onGroupUpdated }: { group: GroupWithMembers, isAdmin: boolean, onGroupUpdated: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h3 className="text-xl font-bold text-white mb-2">{group.name}</h3>
        {group.description && (
          <p className="text-gray-400">{group.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-1">Primary Game</h4>
          <p className="text-white">{group.primaryGame || 'Not set'}</p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-1">Platform</h4>
          <p className="text-white">{group.gamingPlatform || 'Not set'}</p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-1">Skill Level</h4>
          <p className="text-white">{group.skillLevel || 'Any'}</p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-1">Privacy</h4>
          <p className="text-white">{group.isPrivate ? 'Private' : 'Public'}</p>
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Group Statistics</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Members:</span>
            <span className="text-white ml-2">{group.memberCount} / {group.maxMembers}</span>
          </div>
          <div>
            <span className="text-gray-400">Created:</span>
            <span className="text-white ml-2">
              {new Date(group.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={() => alert('Edit group functionality coming soon!')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Edit Group Settings
          </button>
        </div>
      )}
    </div>
  )
}

// Group Members Tab
function GroupMembersTab({ group, userRole, onGroupUpdated, onInviteMembers }: { 
  group: GroupWithMembers, 
  userRole?: string, 
  onGroupUpdated: () => void,
  onInviteMembers: () => void
}) {
  const isAdmin = userRole === 'admin'
  const isModerator = userRole === 'moderator' || isAdmin

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Group Members</h3>
        {isAdmin && (
          <button
            onClick={onInviteMembers}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Invite Members
          </button>
        )}
      </div>

      <div className="space-y-3">
        {group.members.map((member) => {
          // Handle different possible data structures for profile
          const profile = member.profile || {}
          const username = profile.username || profile.display_name || `User ${member.userId?.slice(-4) || 'Unknown'}`
          const displayName = profile.display_name || profile.username || username
          
          return (
            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative">
                  {profile.pfp_url ? (
                    <img 
                      src={profile.pfp_url} 
                      alt={username || 'User'} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide the image and show fallback
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : null}
                  <span 
                    className={`text-white font-bold text-sm absolute inset-0 flex items-center justify-center ${profile.pfp_url ? 'hidden' : ''}`}
                  >
                    {username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">{displayName}</p>
                  <p className="text-sm text-gray-400">
                    {member.role === 'admin' ? '👑 Admin' : 
                     member.role === 'moderator' ? '🛡️ Moderator' : '👤 Member'}
                  </p>
                </div>
              </div>

              {isModerator && member.role !== 'admin' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => alert('Member management coming soon!')}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
                  >
                    Manage
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Group Permissions Tab
function GroupPermissionsTab({ group, isAdmin, onGroupUpdated }: { group: GroupWithMembers, isAdmin: boolean, onGroupUpdated: () => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Group Permissions</h3>

      <div className="space-y-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Member Invites</h4>
          <p className="text-gray-400 text-sm mb-3">
            Allow members to invite others to the group
          </p>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={group.allowMemberInvites}
              disabled={!isAdmin}
              className="mr-2"
            />
            <span className="text-white">Members can invite others</span>
          </label>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Join Approval</h4>
          <p className="text-gray-400 text-sm mb-3">
            Require admin approval for new members
          </p>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={group.requireAdminApproval}
              disabled={!isAdmin}
              className="mr-2"
            />
            <span className="text-white">Require admin approval</span>
          </label>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Group Privacy</h4>
          <p className="text-gray-400 text-sm mb-3">
            Control who can see and join this group
          </p>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={group.isPrivate}
              disabled={!isAdmin}
              className="mr-2"
            />
            <span className="text-white">Private group</span>
          </label>
        </div>
      </div>

      {isAdmin && (
        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={() => alert('Save permissions functionality coming soon!')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
}

// Invite Members Modal Component
interface InviteMembersModalProps {
  group: GroupWithMembers
  onClose: () => void
  onInvitesSent: () => void
}

function InviteMembersModal({ group, onClose, onInvitesSent }: InviteMembersModalProps) {
  const { profile } = useUser()
  const [mutualFollowers, setMutualFollowers] = useState<any[]>([])
  const [selectedInvitees, setSelectedInvitees] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Load mutual followers
  useEffect(() => {
    const loadMutualFollowers = async () => {
      if (!profile?.fid) return

      try {
        setIsLoading(true)
        setError(null)

        // Fetch mutual followers
        const response = await fetch(`/api/farcaster/mutual-followers?fid=${profile.fid}&useCache=true`)
        if (!response.ok) throw new Error('Failed to fetch mutual followers')
        
        const data = await response.json()
        
        // Check if the response has the expected structure
        if (!data || !Array.isArray(data.data)) {
          console.error('Invalid API response structure:', data)
          throw new Error('Invalid response from mutual followers API')
        }
        
        // Filter out users who are already group members
        const existingMemberFids = new Set(
          group.members
            .map(member => member.profile?.fid)
            .filter(Boolean)
        )
        
        const availableFollowers = data.data.filter((follower: any) => 
          !existingMemberFids.has(follower.fid)
        )
        
        setMutualFollowers(availableFollowers)
      } catch (err) {
        console.error('Error loading mutual followers:', err)
        setError('Failed to load mutual followers')
      } finally {
        setIsLoading(false)
      }
    }

    loadMutualFollowers()
  }, [profile?.fid, group.members])

  // Filter followers based on search
  const filteredFollowers = mutualFollowers.filter(follower =>
    follower.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Toggle invitee selection
  const toggleInvitee = (fid: number) => {
    setSelectedInvitees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fid)) {
        newSet.delete(fid)
      } else {
        newSet.add(fid)
      }
      return newSet
    })
  }

  // Send invitations
  const handleSendInvitations = async () => {
    if (!profile?.id || selectedInvitees.size === 0) return

    setIsSending(true)
    setError(null)

    try {
      // Get profile IDs for selected FIDs
      const fidArray = Array.from(selectedInvitees)
      const { getProfileIdsByFids, createGroupInvitation } = await import('@/lib/supabase/groups')
      const fidToIdMap = await getProfileIdsByFids(fidArray)
      
      // Send invitations
      const invitationPromises = fidArray.map(async (fid) => {
        const profileId = fidToIdMap.get(fid)
        if (!profileId) {
          console.warn(`No profile found for FID ${fid}`)
          return { success: false, fid, error: 'Profile not found' }
        }
        
        try {
          const invitation = await createGroupInvitation(
            group.id,
            profile.id,
            profileId,
            `You've been invited to join "${group.name}"!`
          )
          return { success: true, fid, invitation }
        } catch (err: any) {
          console.warn(`Failed to invite user ${fid}:`, err)
          return { success: false, fid, error: err.message || 'Unknown error' }
        }
      })

      const results = await Promise.allSettled(invitationPromises)
      const successfulResults = results
        .filter(result => result.status === 'fulfilled' && result.value?.success)
        .map(result => (result as any).value)
      
      const failedResults = results
        .filter(result => result.status === 'fulfilled' && !result.value?.success)
        .map(result => (result as any).value)

      if (successfulResults.length > 0) {
        if (failedResults.length > 0) {
          // Some succeeded, some failed
          const failedReasons = failedResults.map(r => r.error).join(', ')
          setError(`${successfulResults.length} invitation(s) sent successfully. ${failedResults.length} failed: ${failedReasons}`)
        }
        onInvitesSent()
        onClose()
      } else {
        // All failed
        const uniqueErrors = [...new Set(failedResults.map(r => r.error))]
        setError(`Failed to send invitations: ${uniqueErrors.join(', ')}`)
      }
    } catch (err) {
      console.error('Error sending invitations:', err)
      setError('Failed to send invitations. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Invite Members to {group.name}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search mutual followers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading mutual followers...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Followers List */}
          {!isLoading && !error && (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredFollowers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">
                    {searchQuery ? 'No followers match your search.' : 'No mutual followers available to invite.'}
                  </p>
                </div>
              ) : (
                filteredFollowers.map((follower) => (
                  <div
                    key={follower.fid}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedInvitees.has(follower.fid)
                        ? 'bg-blue-900/20 border-blue-500'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }`}
                    onClick={() => toggleInvitee(follower.fid)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative">
                        {follower.pfpUrl ? (
                          <img 
                            src={follower.pfpUrl} 
                            alt={follower.username || 'User'} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide the image and show fallback
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : null}
                        <span 
                          className={`text-white font-bold text-sm absolute inset-0 flex items-center justify-center ${follower.pfpUrl ? 'hidden' : ''}`}
                        >
                          {follower.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {follower.display_name || follower.username}
                        </p>
                        <p className="text-sm text-gray-400">@{follower.username}</p>
                      </div>
                    </div>
                    
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedInvitees.has(follower.fid)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-400'
                    }`}>
                      {selectedInvitees.has(follower.fid) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-700 mt-6">
            <p className="text-sm text-gray-400">
              {selectedInvitees.size} member{selectedInvitees.size !== 1 ? 's' : ''} selected
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvitations}
                disabled={selectedInvitees.size === 0 || isSending}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isSending ? 'Sending...' : `Send ${selectedInvitees.size} Invitation${selectedInvitees.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 