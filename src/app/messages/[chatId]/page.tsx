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
import { FaArrowLeft, FaUsers, FaSpinner, FaExclamationTriangle, FaCog, FaUserPlus, FaEdit, FaEllipsisV, FaTimes, FaShare, FaInfoCircle, FaSignOutAlt, FaCrown } from 'react-icons/fa'

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
  const [showParticipants, setShowParticipants] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

  // Derived state for direct chats
  const otherParticipant = chat?.type === 'direct' && chat?.participantProfiles 
    ? chat.participantProfiles.find(p => p.fid !== profile?.fid)
    : null

  // Participant count for display
  const participantCount = chat?.participant_count || 0

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
      setLeaveLoading(true)
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
    } finally {
      setLeaveLoading(false)
      setShowAdminMenu(false)
    }
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
    <div className="message-page-container">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-3">
            {chat?.type === 'direct' && otherParticipant ? (
              <>
                {otherParticipant.pfp_url ? (
                  <img 
                    src={otherParticipant.pfp_url} 
                    alt={otherParticipant.display_name || otherParticipant.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {(otherParticipant.display_name || otherParticipant.username)?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-semibold text-white">
                    {otherParticipant.display_name || `@${otherParticipant.username}`}
                  </h1>
                  <p className="text-sm text-gray-400">
                    @{otherParticipant.username}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <h1 className="text-lg font-semibold text-white">
                  {chat?.name || 'Chat'}
                </h1>
                {chat?.type === 'group' && (
                  <p className="text-sm text-gray-400">
                    {getParticipantInfo()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat actions */}
        <div className="flex items-center space-x-2">
          {chat?.type === 'group' && (
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="View participants"
            >
              <FaUsers className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Chat info"
          >
            <FaInfoCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="message-list-container">
        <MessageList
          chatId={chatId}
        />
      </div>

      {/* Message Composer */}
      <div className="message-composer-container">
        <MessageComposer
          chatId={chatId}
          onMessageSent={handleMessageSent}
          onError={(error) => {
            console.error('Message composer error:', error)
          }}
          className="border-0 rounded-none"
        />
      </div>

      {/* Participants Sidebar */}
      {showParticipants && chat?.type === 'group' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="w-80 bg-gray-800 h-full overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Participants</h2>
              <button
                onClick={() => setShowParticipants(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {chat.participantProfiles && chat.participantProfiles.length > 0 ? (
                chat.participantProfiles.map((participant) => (
                  <div key={participant.fid} className="flex items-center space-x-3">
                    {participant.pfp_url ? (
                      <img 
                        src={participant.pfp_url} 
                        alt={participant.display_name || participant.username}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {(participant.display_name || participant.username)?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {participant.display_name || `@${participant.username}`}
                      </p>
                      <p className="text-sm text-gray-400">
                        @{participant.username}
                      </p>
                    </div>
                    {isGroupAdmin && (
                      <FaCrown className="w-4 h-4 text-yellow-500" title="Admin" />
                    )}
                  </div>
                ))
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

      {/* Chat Info Sidebar */}
      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="w-80 bg-gray-800 h-full overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Chat Info</h2>
              <button
                onClick={() => setShowInfo(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Chat Name</label>
                <p className="text-white">{chat?.name || 'Unnamed Chat'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Type</label>
                <p className="text-white capitalize">{chat?.type || 'Unknown'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Created</label>
                <p className="text-white">
                  {chat?.created_at ? new Date(chat.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              
              {chat?.type === 'group' && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Members</label>
                  <p className="text-white">{getParticipantInfo()}</p>
                </div>
              )}

              {/* Leave Chat Button */}
              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={handleLeaveChat}
                  className="w-full flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  disabled={leaveLoading}
                >
                  {leaveLoading ? 'Leaving...' : 'Leave Chat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 