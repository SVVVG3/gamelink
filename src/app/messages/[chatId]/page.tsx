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
import { FaArrowLeft, FaUsers, FaSpinner, FaExclamationTriangle, FaCog, FaUserPlus, FaEdit, FaEllipsisV, FaTimes } from 'react-icons/fa'

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
  const [eventData, setEventData] = useState<any>(null)
  const [isEventChat, setIsEventChat] = useState(false)
  const [showMemberList, setShowMemberList] = useState(false)

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

  // Share event frame function
  const shareEventFrame = async () => {
    if (!eventData) return
    
    // Share the event page URL
    const eventPageUrl = `${window.location.origin}/events/${eventData.id}`
    const shareText = `🎮 Join my gaming event: ${eventData.title}!\n\n${eventData.description ? eventData.description + '\n\n' : ''}${eventData.game ? `Game: ${eventData.game}\n` : ''}${eventData.gamingPlatform ? `Platform: ${eventData.gamingPlatform}\n` : ''}📅 ${new Date(eventData.startTime).toLocaleDateString()}\n\n`
    
    // Try to use Farcaster SDK if available (Mini App context)
    try {
      const { sdk } = await import('@farcaster/frame-sdk')
      
      // Check if we're in a Mini App context by trying to get context
      const context = await sdk.context
      if (context && context.client) {
        const result = await sdk.actions.composeCast({
          text: shareText,
          embeds: [eventPageUrl]
        })
        
        if (result?.cast) {
          console.log('Event cast shared successfully:', result.cast.hash)
        }
        return
      }
    } catch (error) {
      console.error('Farcaster SDK not available, using web fallback:', error)
    }
    
    // Fallback for standalone web app - open Warpcast
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(eventPageUrl)}`
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
      
      // Check if this is an event chat
      const isEventChatCheck = chatData.name?.endsWith(' - Event Chat') || false
      setIsEventChat(isEventChatCheck)
      
      // If it's an event chat, fetch event data
      if (isEventChatCheck) {
        try {
          const response = await fetch(`/api/events?chatId=${chatId}`)
          if (response.ok) {
            const eventsData = await response.json()
            if (eventsData.events && eventsData.events.length > 0) {
              setEventData(eventsData.events[0])
            }
          }
        } catch (eventError) {
          console.error('Error fetching event data:', eventError)
        }
      }
      
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
      let displayName = chat.name || 'Group Chat'
      // Remove "- Event Chat" suffix for event chats
      if (displayName.endsWith(' - Event Chat')) {
        displayName = displayName.replace(' - Event Chat', '')
      }
      return displayName
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

  // Handle showing member list
  const handleShowMemberList = () => {
    setShowMemberList(true)
  }

  // Handle admin menu actions
  const handleManageMembers = () => {
    if (chat?.group_id) {
      router.push(`/groups/${chat.group_id}/members`)
    } else if (isEventChat && eventData) {
      router.push(`/events/${eventData.id}`)
    }
    setShowAdminMenu(false)
  }

  const handleEditGroup = () => {
    if (chat?.group_id) {
      router.push(`/groups/${chat.group_id}/edit`)
    } else if (isEventChat && eventData) {
      router.push(`/events/${eventData.id}`)
    }
    setShowAdminMenu(false)
  }

  const handleLeaveChat = async () => {
    if (!profile?.fid || !chatId) return
    
    try {
      const response = await fetch(`/api/chats/${chatId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid: profile.fid
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to leave chat')
      }

      // Redirect back to messages page
      router.push('/messages')
    } catch (error) {
      console.error('Error leaving chat:', error)
      setError(error instanceof Error ? error.message : 'Failed to leave chat')
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
            {chat?.type === 'group' ? (
              <button
                onClick={handleShowMemberList}
                className="text-sm text-gray-400 flex items-center hover:text-gray-300 transition-colors"
              >
                <FaUsers className="w-3 h-3 mr-1" />
                {getParticipantInfo()}
              </button>
            ) : (
              <p className="text-sm text-gray-400 flex items-center">
                <FaUsers className="w-3 h-3 mr-1" />
                {getParticipantInfo()}
              </p>
            )}
          </div>
        </div>

        {/* Chat actions */}
        <div className="flex items-center space-x-2">
          {chat?.type === 'group' && (
            <button
              onClick={isEventChat ? shareEventFrame : shareGroupFrame}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title={isEventChat ? "Share Event" : "Share Group"}
            >
              <FarcasterIcon className="w-4 h-4" />
            </button>
          )}
          
          {chat?.type === 'group' && (
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
                  {isGroupAdmin && (
                    <>
                      <button
                        onClick={handleManageMembers}
                        className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center space-x-2 rounded-t-lg transition-colors"
                      >
                        <FaUsers className="w-4 h-4" />
                        <span>{isEventChat ? 'View Event' : 'Manage Members'}</span>
                      </button>
                      <button
                        onClick={handleEditGroup}
                        className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                      >
                        <FaEdit className="w-4 h-4" />
                        <span>{isEventChat ? 'Event Settings' : 'Edit Group Settings'}</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleLeaveChat}
                    className={`w-full px-4 py-3 text-left text-red-400 hover:bg-gray-700 flex items-center space-x-2 transition-colors ${
                      isGroupAdmin ? '' : 'rounded-t-lg'
                    } rounded-b-lg`}
                  >
                    <FaArrowLeft className="w-4 h-4" />
                    <span>Leave Chat</span>
                  </button>
                </div>
              )}
            </div>
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

      {/* Member List Modal */}
      {showMemberList && chat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  {isEventChat ? 'Event Participants' : 'Group Members'}
                </h3>
                <button
                  onClick={() => setShowMemberList(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {chat.participant_count} {chat.participant_count === 1 ? 'member' : 'members'}
              </p>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-96">
              {chat.participantProfiles && chat.participantProfiles.length > 0 ? (
                <div className="space-y-3">
                  {chat.participantProfiles.map((participant) => (
                    <button
                      key={participant.fid}
                      onClick={() => {
                        setShowMemberList(false)
                        router.push(`/profile/${participant.fid}`)
                      }}
                      className="w-full flex items-center space-x-3 p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <img
                        src={participant.pfp_url || '/default-avatar.png'}
                        alt={participant.display_name || participant.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium">
                          {participant.display_name || participant.username}
                        </p>
                        <p className="text-gray-400 text-sm">@{participant.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FaUsers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No members found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </main>
  )
} 