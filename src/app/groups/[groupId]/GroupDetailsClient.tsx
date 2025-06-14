'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { getGroupById, getOrCreateGroupChat, isGroupMember, migrateGroupMembersToChats, addGroupMember } from '@/lib/supabase/groups'
import { getChatById, type ChatWithParticipants, type MessageWithSender } from '@/lib/supabase/chats'
import MessageList from '@/components/MessageList'
import MessageComposer from '@/components/MessageComposer'
import BottomNavigation from '@/components/BottomNavigation'
import { FaArrowLeft, FaUsers, FaSpinner, FaExclamationTriangle, FaCog, FaGamepad, FaLock, FaTimes, FaUserPlus } from 'react-icons/fa'
import FarcasterIcon from '@/components/FarcasterIcon'
import type { GroupWithMembers } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'



// Extended interface to include user profile data
interface ChatWithUserProfiles extends ChatWithParticipants {
  participantProfiles?: Array<{
    fid: number
    username: string
    display_name?: string
    pfp_url?: string
  }>
}

interface Props {
  params: Promise<{ groupId: string }>
}

export default function GroupDetailsClient({ params }: Props) {
  const router = useRouter()
  const { isAuthenticated, isLoading: userLoading, profile } = useUser()
  
  const [groupId, setGroupId] = useState<string>('')
  
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
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    const getGroupId = async () => {
      const resolvedParams = await params
      setGroupId(resolvedParams.groupId)
    }
    getGroupId()
  }, [params])

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
    if (!groupId || !profile?.id) {
      console.log('🔍 loadGroupData: Missing groupId or profile', { groupId, profileId: profile?.id })
      return
    }
    
    try {
      setError(null)
      console.log('🔍 loadGroupData: Starting to load group', { groupId, profileId: profile.id })
      
      // Load group information
      const groupData = await getGroupById(groupId, true)
      console.log('🔍 loadGroupData: Group data loaded', { groupData: !!groupData, groupId })
      
      if (!groupData) {
        console.log('🔍 loadGroupData: Group not found')
        setError('Group not found')
        return
      }
      
      setGroup(groupData)
      
      // Check if user is a member
      const membershipCheck = await isGroupMember(groupId, profile.id)
      console.log('🔍 loadGroupData: Membership check', { 
        isMember: membershipCheck.isMember, 
        role: membershipCheck.role,
        groupId,
        profileId: profile.id
      })
      
      setIsMember(membershipCheck.isMember)
      setUserRole(membershipCheck.role)
      
      // If user is not a member, don't load chat
      if (!membershipCheck.isMember) {
        console.log('🔍 loadGroupData: User is not a member, stopping here')
        return
      }
      
      // Get or create group chat
      console.log('🔍 loadGroupData: Getting group chat')
      const groupChatId = await getOrCreateGroupChat(groupId, profile.id)
      console.log('🔍 loadGroupData: Group chat ID', { groupChatId })
      setChatId(groupChatId)
      
      // Load chat data
      const chatData = await getChatById(groupChatId, profile.fid!)
      console.log('🔍 loadGroupData: Chat data loaded', { chatData: !!chatData })
      
      if (!chatData) {
        console.log('🔍 loadGroupData: Failed to load chat data')
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
      console.log('🔍 loadGroupData: Successfully loaded everything')
    } catch (err) {
      console.error('🔍 loadGroupData: Error loading group data:', err)
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

  // Join group
  const joinGroup = async () => {
    if (!group || !profile?.id) return
    
    setIsJoining(true)
    try {
      await addGroupMember(groupId, profile.id)
      console.log('🔍 joinGroup: Group joined successfully')
      
      // Reload group data to get chat access
      await loadGroupData()
    } catch (error) {
      console.error('🔍 joinGroup: Error joining group:', error)
      setError(error instanceof Error ? error.message : 'Failed to join group')
    } finally {
      setIsJoining(false)
    }
  }

  // Loading state
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

  // Authentication required
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 pb-20">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <FaLock className="w-16 h-16 text-gray-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Authentication Required</h1>
          <p className="text-gray-300">Please sign in to view this group.</p>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  // Error state
  if (error || !group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 pb-20">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Group Not Found</h1>
          <p className="text-gray-300">{error || 'This group could not be found or you don\'t have permission to view it.'}</p>
          <Link 
            href="/groups"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Groups
          </Link>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  // Not a member view
  if (!isMember) {
    const skillBadge = getSkillBadge(group.skillLevel)
    
    return (
      <main className="min-h-screen bg-gray-900 pb-20">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/groups"
              className="flex items-center text-gray-300 hover:text-white transition-colors"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back to Groups
            </Link>
            
            <button
              onClick={shareGroupFrame}
              className="flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
            >
              <FarcasterIcon className="w-4 h-4 mr-2" />
              Share
            </button>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
              {getPlatformIcon(group.gamingPlatform)}
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">{group.name}</h1>
              {group.description && (
                <p className="text-gray-300 mb-3">{group.description}</p>
              )}
              
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center text-gray-400">
                  <FaUsers className="w-4 h-4 mr-1" />
                  <span>{group.memberCount}/{group.maxMembers} members</span>
                </div>
                
                {group.isPrivate && (
                  <div className="flex items-center text-yellow-400">
                    <FaLock className="w-4 h-4 mr-1" />
                    <span>Private</span>
                  </div>
                )}
                
                <span className={`px-2 py-1 rounded-full text-xs ${skillBadge.color} text-white`}>
                  {skillBadge.text}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Group Info */}
        <div className="p-4 space-y-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Group Information</h2>
            
            <div className="space-y-4">
              {/* Group Creator */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Created by</label>
                <div className="flex items-center space-x-2">
                  {/* Find creator from members list */}
                  {(() => {
                    const creator = group.members?.find(member => 
                      member.userId === group.createdBy && member.role === 'admin'
                    )
                    return creator ? (
                      <>
                        {creator.profile?.pfp_url && (
                          <img
                            src={creator.profile.pfp_url}
                            alt={creator.profile.display_name || creator.profile.username}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <p className="text-white font-medium">
                          {creator.profile?.display_name || creator.profile?.username || 'Group Creator'}
                        </p>
                      </>
                    ) : (
                      <p className="text-white font-medium">Group Creator</p>
                    )
                  })()}
                </div>
              </div>
              
              {group.primaryGame && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Primary Game</label>
                  <p className="text-white font-medium">{group.primaryGame}</p>
                </div>
              )}
              
                             {group.gamingPlatform && (
                 <div>
                   <label className="text-sm text-gray-400 block mb-1">Platform</label>
                   <p className="text-white font-medium flex items-center">
                     {getPlatformIcon(group.gamingPlatform)} 
                     <span className="ml-2">{group.gamingPlatform}</span>
                   </p>
                 </div>
               )}
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Skill Level</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm ${skillBadge.color} text-white`}>
                  {skillBadge.text}
                </span>
              </div>
            </div>
          </div>

          {group.isPrivate ? (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FaLock className="w-5 h-5 text-yellow-400" />
                <h3 className="text-yellow-400 font-medium">Private Group</h3>
              </div>
              <p className="text-yellow-300 text-sm">
                This is a private group. You need an invitation to join.
              </p>
            </div>
          ) : (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-3">
                <FaUsers className="w-5 h-5 text-blue-400" />
                <h3 className="text-blue-400 font-medium">Join This Group</h3>
              </div>
              <p className="text-blue-300 text-sm mb-4">
                This is a public group. Click below to join and start participating in discussions!
              </p>
              <button
                onClick={joinGroup}
                disabled={isJoining}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
              >
                {isJoining ? (
                  <>
                    <FaSpinner className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <FaUserPlus className="w-4 h-4 mr-2" />
                    Join Group
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        
        <BottomNavigation />
      </main>
    )
  }

  // Member view with chat
  return (
    <main className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <Link 
            href="/groups"
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Groups
          </Link>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={shareGroupFrame}
              className="flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
            >
              <FarcasterIcon className="w-4 h-4 mr-2" />
              Share
            </button>
            
            {(userRole === 'admin' || userRole === 'moderator') && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
              >
                <FaCog className="w-4 h-4 mr-2" />
                Settings
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start space-x-4">
                     <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-xl">
             {getPlatformIcon(group.gamingPlatform)}
           </div>
          
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white mb-1">{group.name}</h1>
            
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center">
                <FaUsers className="w-4 h-4 mr-1" />
                <span>{group.memberCount} members</span>
              </div>
              
              {group.isPrivate && (
                <div className="flex items-center text-yellow-400">
                  <FaLock className="w-4 h-4 mr-1" />
                  <span>Private</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      {chatId && chat ? (
        <div className="flex flex-col h-[calc(100vh-140px)]">
                     <MessageList 
             chatId={chatId}
             onNewMessage={handleMessageSent}
           />
           <MessageComposer 
             chatId={chatId}
             onMessageSent={handleMessageSent}
             onError={handleMessageError}
           />
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FaSpinner className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Loading chat...</p>
          </div>
        </div>
      )}
      
      <BottomNavigation />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Group Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <button
                onClick={() => {
                  setShowSettings(false)
                  // Navigate to edit group page
                  window.location.href = `/groups/${groupId}/edit`
                }}
                className="w-full flex items-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <FaCog className="w-4 h-4 mr-2" />
                Edit Group Details
              </button>
              
              <button
                onClick={() => {
                  setShowSettings(false)
                  // Navigate to manage members page
                  window.location.href = `/groups/${groupId}/members`
                }}
                className="w-full flex items-center px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <FaUsers className="w-4 h-4 mr-2" />
                Manage Members
              </button>
              
              <button
                onClick={() => setShowSettings(false)}
                className="w-full flex items-center px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <FaTimes className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
} 