'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { getChatById, markChatMessagesAsRead, type ChatWithParticipants, type MessageWithSender } from '@/lib/supabase/chats'
import { isGroupMember, getGroupById } from '@/lib/supabase/groups'
import MessageList from '@/components/MessageList'
import MessageComposer from '@/components/MessageComposer'
import BottomNavigation from '@/components/BottomNavigation'
import FarcasterIcon from '@/components/FarcasterIcon'
import { FaArrowLeft, FaUsers, FaSpinner, FaExclamationTriangle, FaCog, FaUserPlus, FaEdit, FaEllipsisV } from 'react-icons/fa'

// Extended interface to include user profile data and group info
interface ChatWithUserProfiles extends ChatWithParticipants {
  group_id?: string
  participantProfiles?: Array<{
    fid: number
    username: string
    display_name?: string
    pfp_url?: string
  }>
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: userLoading, profile } = useUser()
  
  const chatId = params.chatId as string
  
  // Component state
  const [chat, setChat] = useState<ChatWithUserProfiles | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGroupAdmin, setIsGroupAdmin] = useState(false)
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const [groupData, setGroupData] = useState<any>(null)

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

  // Share group frame function
  const shareGroupFrame = async () => {
    if (!chat?.group_id || !groupData) return
    
    // Share the group page URL, not the frame endpoint
    const groupPageUrl = `${window.location.origin}/groups/${chat.group_id}`
    const shareText = `🎮 Join my gaming group: ${groupData.name}!\n\n${groupData.description ? groupData.description + '\n\n' : ''}${groupData.primaryGame ? `Game: ${groupData.primaryGame}\n` : ''}Members: ${groupData.memberCount}/${groupData.maxMembers}\n\n`
    
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

  // Load chat data
  const loadChat = useCallback(async () => {
    if (!chatId || !profile?.fid) return
    
    try {
      setError(null)
      const chatData = await getChatById(chatId, profile.fid)
      
      if (!chatData) {
        setError('Chat not found')
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
      
      // Check if user is admin of the group (if this is a group chat)
      if (chatData.type === 'group' && (chatData as any).group_id && profile?.id) {
        try {
          const membershipInfo = await isGroupMember((chatData as any).group_id, profile.id)
          setIsGroupAdmin(membershipInfo.isMember && (membershipInfo.role === 'admin' || membershipInfo.role === 'moderator'))
          
          // Also fetch group data for sharing
          const groupInfo = await getGroupById((chatData as any).group_id, false)
          setGroupData(groupInfo)
        } catch (adminError) {
          console.error('Error checking admin status:', adminError)
          setIsGroupAdmin(false)
        }
      } else {
        setIsGroupAdmin(false)
      }
      
      // Mark all messages in this chat as read
      if (profile?.id) {
        await markChatMessagesAsRead(chatId, profile.id)
      }
    } catch (err) {
      console.error('Error loading chat:', err)
      setError(err instanceof Error ? err.message : 'Failed to load chat')
    } finally {
      setIsLoading(false)
    }
  }, [chatId, profile?.fid, profile?.id])

  // Load chat when component mounts or chatId changes
  useEffect(() => {
    if (isAuthenticated && chatId && profile?.fid) {
      loadChat()
    }
  }, [isAuthenticated, chatId, profile?.fid, loadChat])

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

  // Get chat display name
  const getChatDisplayName = () => {
    if (!chat) return 'Chat'
    
    if (chat.type === 'group') {
      return chat.name || 'Group Chat'
    }
    
    // For direct chats, show the other participant's name
    const otherParticipantProfile = chat.participantProfiles?.find(p => p.fid !== profile?.fid)
    if (otherParticipantProfile) {
      return otherParticipantProfile.display_name || otherParticipantProfile.username
    }
    
    // Fallback to FID if profile not found
    const otherParticipant = chat.participants.find(p => p.fid !== profile?.fid)
    if (otherParticipant) {
      return `User ${otherParticipant.fid}`
    }
    
    return 'Direct Chat'
  }

  // Get participant count display
  const getParticipantInfo = () => {
    if (!chat) return ''
    
    if (chat.type === 'group') {
      return `${chat.participant_count} members`
    }
    
    return 'Direct message'
  }

  // Handle admin menu actions
  const handleManageMembers = () => {
    if (chat?.group_id) {
      router.push(`/groups/${chat.group_id}/members`)
    }
    setShowAdminMenu(false)
  }

  const handleEditGroup = () => {
    if (chat?.group_id) {
      router.push(`/groups/${chat.group_id}/edit`)
    }
    setShowAdminMenu(false)
  }

  // Close admin menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowAdminMenu(false)
    if (showAdminMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showAdminMenu])

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 pb-20">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-white">Sign In Required</h1>
          <p className="text-gray-300">You need to sign in to access this chat.</p>
          <button
            onClick={() => router.push('/messages')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Messages
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
          <p className="text-gray-300">Loading chat...</p>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 pb-20">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <FaExclamationTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Chat Error</h1>
          <p className="text-red-300">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/messages')}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Back to Messages
            </button>
            <button
              onClick={loadChat}
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

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col pb-20">
      {/* Fixed Chat Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/messages')}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          
          <div>
            <h1 className="text-lg font-semibold text-white">
              {getChatDisplayName()}
            </h1>
            <p className="text-sm text-gray-400 flex items-center">
              <FaUsers className="w-3 h-3 mr-1" />
              {getParticipantInfo()}
            </p>
          </div>
        </div>

        {/* Chat actions */}
        <div className="flex items-center space-x-2">
          {chat?.type === 'group' && (
            <button
              onClick={shareGroupFrame}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Share Group"
            >
              <FarcasterIcon className="w-4 h-4" />
            </button>
          )}
          
          {chat?.type === 'group' && isGroupAdmin && (
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAdminMenu(!showAdminMenu)
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FaEllipsisV className="w-4 h-4" />
              </button>
              
              {showAdminMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-20">
                  <button
                    onClick={handleManageMembers}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center space-x-2 rounded-t-lg transition-colors"
                  >
                    <FaUsers className="w-4 h-4" />
                    <span>Manage Members</span>
                  </button>
                  <button
                    onClick={handleEditGroup}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center space-x-2 rounded-b-lg transition-colors"
                  >
                    <FaEdit className="w-4 h-4" />
                    <span>Edit Group Settings</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {chat?.type === 'group' && !isGroupAdmin && (
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              <FaUsers className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area - with top padding for fixed header */}
      <div className="flex-1 flex flex-col pt-16 pb-32">
        <MessageList
          chatId={chatId}
          onNewMessage={(message) => console.log('New message received:', message)}
          className="flex-1"
        />
      </div>

      {/* Fixed Message Composer */}
      <div className="fixed bottom-20 left-0 right-0 z-10 p-4 bg-gray-900 border-t border-gray-700">
        <MessageComposer
          chatId={chatId}
          onMessageSent={handleMessageSent}
          onError={handleMessageError}
          placeholder={`Message ${getChatDisplayName()}...`}
        />
      </div>

      <BottomNavigation />
    </main>
  )
} 