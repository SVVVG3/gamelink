'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { getGroupById, getOrCreateGroupChat, isGroupMember } from '@/lib/supabase/groups'
import { getChatById, type ChatWithParticipants, type MessageWithSender } from '@/lib/supabase/chats'
import MessageList from '@/components/MessageList'
import MessageComposer from '@/components/MessageComposer'
import BottomNavigation from '@/components/BottomNavigation'
import { FaArrowLeft, FaUsers, FaSpinner, FaExclamationTriangle, FaCog, FaGamepad, FaLock } from 'react-icons/fa'
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
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
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
    </main>
  )
} 