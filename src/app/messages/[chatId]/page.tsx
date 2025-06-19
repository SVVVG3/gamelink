'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { getChatById, markChatMessagesAsRead, type ChatWithParticipants, type MessageWithSender } from '@/lib/supabase/chats'
import { isGroupMember, getGroupById } from '@/lib/supabase/groups'
import MessageList from '@/components/MessageList'
import MessageComposer from '@/components/MessageComposer'
import BottomNavigation from '@/components/BottomNavigation'
import FarcasterIcon from '@/components/FarcasterIcon'
import { FaArrowLeft, FaUsers, FaSpinner, FaExclamationTriangle, FaCog, FaUserPlus, FaEdit, FaEllipsisV, FaTimes, FaShare, FaInfoCircle, FaSignOutAlt, FaCrown, FaChevronDown } from 'react-icons/fa'

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
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showInfoDropdown, setShowInfoDropdown] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  
  // Refs for click outside detection
  const infoDropdownRef = useRef<HTMLDivElement>(null)

  // Derived state for direct chats
  const otherParticipant = chat?.type === 'direct' && chat?.participantProfiles 
    ? chat.participantProfiles.find(p => p.fid !== profile?.fid)
    : null

  // Participant count for display
  const participantCount = chat?.participant_count || 0

  // Handle click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoDropdownRef.current && !infoDropdownRef.current.contains(event.target as Node)) {
        setShowInfoDropdown(false)
      }
    }

    if (showInfoDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showInfoDropdown])

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
          if (membershipInfo?.role === 'admin') {
            setIsGroupAdmin(true)
          }
          
          // Fetch group data for sharing
          const groupInfo = await getGroupById((chatData as any).group_id)
          if (groupInfo) {
            setGroupData(groupInfo)
          }
        } catch (error) {
          console.error('Error checking group admin status:', error)
        }
      }
      
      // Mark messages as read
      await markChatMessagesAsRead(chatId, profile.id!)
    } catch (error) {
      console.error('Error loading chat:', error)
      setError('Failed to load chat')
    } finally {
      setIsLoading(false)
    }
  }, [chatId, profile?.fid, profile?.id])

  // Load chat on mount and when dependencies change
  useEffect(() => {
    if (profile?.fid) {
      loadChat()
    }
  }, [loadChat])

  const handleMessageSent = (message: MessageWithSender) => {
    // Refresh chat to update last message
    loadChat()
  }

  const handleMessageError = (error: string) => {
    setError(error)
  }

  const getChatDisplayName = () => {
    if (chat?.type === 'direct') {
      return otherParticipant?.display_name || `@${otherParticipant?.username}` || 'Direct Chat'
    }
    
    if (isEventChat) {
      // Remove the " - Event Chat" suffix for display
      return chat?.name?.replace(' - Event Chat', '') || 'Event Chat'
    }
    
    return chat?.name || 'Group Chat'
  }

  const getChatLabel = () => {
    if (chat?.type === 'direct') {
      return null
    }
    
    if (isEventChat) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Event
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Group
      </span>
    )
  }

  const getParticipantInfo = () => {
    if (chat?.type === 'direct') return null
    return `${participantCount} member${participantCount !== 1 ? 's' : ''}`
  }

  const handleManageMembers = () => {
    setShowInfoDropdown(false)
    if (chat?.group_id) {
      router.push(`/groups/${chat.group_id}/members`)
    }
  }

  const handleEditGroup = () => {
    setShowInfoDropdown(false)
    if (chat?.group_id) {
      router.push(`/groups/${chat.group_id}/edit`)
    }
  }

  const handleLeaveChat = async () => {
    if (!chatId || !profile?.fid) return
    
    setLeaveLoading(true)
    try {
      const response = await fetch(`/api/chats/${chatId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid: profile.fid
        })
      })

      if (!response.ok) {
        throw new Error('Failed to leave chat')
      }

      // Navigate back to messages list
      router.push('/messages')
    } catch (error) {
      console.error('Error leaving chat:', error)
      setError('Failed to leave chat')
    } finally {
      setLeaveLoading(false)
    }
  }

  // Loading states
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
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-semibold text-white">
                    {getChatDisplayName()}
                  </h1>
                  {getChatLabel()}
                </div>
                {chat?.type === 'group' && (
                  <button
                    onClick={() => setShowMemberModal(true)}
                    className="text-sm text-gray-400 hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    {getParticipantInfo()}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat actions */}
        <div className="flex items-center space-x-2">
          {/* Farcaster Share Button */}
          {chat?.type === 'group' && (
            <button
              onClick={isEventChat ? shareEventFrame : shareGroupFrame}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={isEventChat ? "Share Event" : "Share Group"}
            >
              <FarcasterIcon className="w-5 h-5" />
            </button>
          )}
          
          {/* Info Dropdown */}
          {chat?.type === 'group' && (
            <div className="relative" ref={infoDropdownRef}>
              <button
                onClick={() => setShowInfoDropdown(!showInfoDropdown)}
                className="p-2 text-gray-400 hover:text-white transition-colors flex items-center"
                title="Chat options"
              >
                <FaEllipsisV className="w-4 h-4" />
              </button>
              
              {showInfoDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowMemberModal(true)
                        setShowInfoDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                    >
                      <FaUsers className="w-4 h-4 mr-3" />
                      View Members
                    </button>
                    
                    {isGroupAdmin && (
                      <button
                        onClick={handleManageMembers}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                      >
                        <FaCog className="w-4 h-4 mr-3" />
                        Manage Members
                      </button>
                    )}
                    
                    <div className="border-t border-gray-700 my-1"></div>
                    
                    <button
                      onClick={handleLeaveChat}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 flex items-center"
                      disabled={leaveLoading}
                    >
                      <FaSignOutAlt className="w-4 h-4 mr-3" />
                      {leaveLoading ? 'Leaving...' : 'Leave Chat'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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

      {/* Member List Modal */}
      {showMemberModal && chat?.type === 'group' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {isEventChat ? 'Event Participants' : 'Group Members'}
              </h2>
              <button
                onClick={() => setShowMemberModal(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 max-h-80 overflow-y-auto">
              {chat.participantProfiles && chat.participantProfiles.length > 0 ? (
                <div className="space-y-3">
                  {chat.participantProfiles.map((participant) => (
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

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
} 
