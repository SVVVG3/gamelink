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
    if (!chat?.group_id || !groupData) {
      console.error('🚨 Share Group Error: Missing data', { groupId: chat?.group_id, groupData })
      return
    }
    
    console.log('🔍 Share Group Debug: Starting share process', { groupId: chat.group_id, groupData })
    
    // Share the group page URL, not the frame endpoint
    const groupPageUrl = `${window.location.origin}/groups/${chat.group_id}`
    const shareText = `🎮 Join my gaming group: ${groupData.name}!\n\n${groupData.description ? groupData.description + '\n\n' : ''}${groupData.primaryGame ? `Game: ${groupData.primaryGame}\n` : ''}Members: ${groupData.memberCount}/${groupData.maxMembers}\n\n`
    
    console.log('🔍 Share Group Debug: Generated content', { shareText, groupPageUrl })
    
    // Try to use Farcaster SDK if available (Mini App context)
    try {
      console.log('🔍 Share Group Debug: Attempting SDK import')
      const { sdk } = await import('@farcaster/frame-sdk')
      
      console.log('🔍 Share Group Debug: SDK imported, checking context')
      // Check if we're in a Mini App context by trying to get context
      const context = await sdk.context
      console.log('🔍 Share Group Debug: SDK context', context)
      
      if (context && context.client) {
        console.log('🔍 Share Group Debug: In mini app context, composing cast')
        const result = await sdk.actions.composeCast({
          text: shareText,
          embeds: [groupPageUrl]
        })
        
        console.log('🔍 Share Group Debug: Cast composition result', result)
        
        if (result?.cast) {
          console.log('✅ Cast shared successfully:', result.cast.hash)
        }
        return
      } else {
        console.log('🔍 Share Group Debug: Not in mini app context, using web fallback')
      }
    } catch (error) {
      console.error('🚨 Farcaster SDK not available, using web fallback:', error)
    }
    
    // Fallback for standalone web app - open Warpcast
    console.log('🔍 Share Group Debug: Opening web composer')
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(groupPageUrl)}`
    console.log('🔍 Share Group Debug: Web composer URL', farcasterUrl)
    window.open(farcasterUrl, '_blank')
  }

  // Share event frame function
  const shareEventFrame = async () => {
    console.log('🔍 Share Event Debug: Function called', { 
      eventData, 
      isEventChat, 
      eventDataExists: !!eventData,
      eventDataKeys: eventData ? Object.keys(eventData) : 'no eventData'
    })
    
    if (!eventData) {
      console.error('🚨 Share Event Error: Missing event data', { 
        eventData, 
        isEventChat,
        chatType: chat?.type,
        chatName: chat?.name
      })
      return
    }
    
    console.log('🔍 Share Event Debug: Starting share process', { eventData })
    
    // Share the event page URL
    const eventPageUrl = `${window.location.origin}/events/${eventData.id}`
    const shareText = `🎮 Join my gaming event: ${eventData.title}!\n\n${eventData.description ? eventData.description + '\n\n' : ''}${eventData.game ? `Game: ${eventData.game}\n` : ''}${eventData.gamingPlatform ? `Platform: ${eventData.gamingPlatform}\n` : ''}📅 ${new Date(eventData.startTime).toLocaleDateString()}\n\n`
    
    console.log('🔍 Share Event Debug: Generated content', { shareText, eventPageUrl })
    
    // Try to use Farcaster SDK if available (Mini App context)
    try {
      console.log('🔍 Share Event Debug: Attempting SDK import')
      const { sdk } = await import('@farcaster/frame-sdk')
      
      console.log('🔍 Share Event Debug: SDK imported, checking context')
      // Check if we're in a Mini App context by trying to get context
      const context = await sdk.context
      console.log('🔍 Share Event Debug: SDK context', context)
      
      if (context && context.client) {
        console.log('🔍 Share Event Debug: In mini app context, composing cast')
        const result = await sdk.actions.composeCast({
          text: shareText,
          embeds: [eventPageUrl]
        })
        
        console.log('🔍 Share Event Debug: Cast composition result', result)
        
        if (result?.cast) {
          console.log('✅ Event cast shared successfully:', result.cast.hash)
        }
        return
      } else {
        console.log('🔍 Share Event Debug: Not in mini app context, using web fallback')
      }
    } catch (error) {
      console.error('🚨 Farcaster SDK not available, using web fallback:', error)
    }
    
    // Fallback for standalone web app - open Warpcast
    console.log('🔍 Share Event Debug: Opening web composer')
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(eventPageUrl)}`
    console.log('🔍 Share Event Debug: Web composer URL', farcasterUrl)
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
      console.log('🔍 Event Chat Detection Debug:', {
        chatName: chatData.name,
        endsWithEventChat: chatData.name?.endsWith(' - Event Chat'),
        isEventChatCheck,
        chatType: chatData.type,
        groupId: chatData.group_id
      })
      setIsEventChat(isEventChatCheck)
      
      // Fetch group data if this is a group chat
      if (chatData.group_id) {
        try {
          const groupResponse = await fetch(`/api/groups/${chatData.group_id}`)
          if (groupResponse.ok) {
            const groupInfo = await groupResponse.json()
            setGroupData(groupInfo)
            
            // Check if current user is admin - fix admin check logic
            const isAdmin = groupInfo.createdBy === profile.id || 
              groupInfo.members?.some((member: any) => 
                member.profile?.fid === profile.fid && member.role === 'admin'
              )
            setIsGroupAdmin(isAdmin)
            
            console.log('🔍 Admin Check Debug:', {
              profileId: profile.id,
              profileFid: profile.fid,
              groupCreatedBy: groupInfo.createdBy,
              groupMembers: groupInfo.members?.map((m: any) => ({ fid: m.profile?.fid, role: m.role })),
              isAdmin
            })
          }
        } catch (error) {
          console.error('Error fetching group data:', error)
        }
      }
      
      // If this is an event chat, fetch event data (independent of group_id)
      if (isEventChatCheck) {
        try {
          console.log('🔍 Event Chat Debug: Fetching event data for chatId:', chatId)
          const eventApiUrl = `/api/events?chatId=${chatId}`
          console.log('🔍 Event Chat Debug: API URL:', eventApiUrl)
          
          const eventResponse = await fetch(eventApiUrl)
          console.log('🔍 Event Chat Debug: API response status:', eventResponse.status)
          
          if (eventResponse.ok) {
            const eventData = await eventResponse.json()
            console.log('🔍 Event Chat Debug: Full API response:', eventData)
            console.log('🔍 Event Chat Debug: Events array:', eventData.events)
            console.log('🔍 Event Chat Debug: Events array length:', eventData.events?.length)
            
            if (eventData.events && eventData.events.length > 0) {
              const basicEventData = eventData.events[0]
              console.log('🔍 Event Chat Debug: Basic event data:', basicEventData)
              
              // Fetch full event data with participants for admin detection
              const fullEventResponse = await fetch(`/api/events/${basicEventData.id}?userFid=${profile.fid}`)
              if (fullEventResponse.ok) {
                const fullEventData = await fullEventResponse.json()
                console.log('🔍 Event Chat Debug: Full event data:', fullEventData)
                setEventData(fullEventData.event)
                
                // Check if current user is event admin (organizer or admin participant)
                const isEventAdmin = fullEventData.event.createdBy === profile.id ||
                  fullEventData.event.participants?.some((participant: any) => 
                    participant.user_id === profile.id && participant.role === 'organizer'
                  )
                setIsGroupAdmin(isEventAdmin) // Reuse the same state for event admin
                
                console.log('🔍 Event Admin Check Debug:', {
                  profileId: profile.id,
                  profileFid: profile.fid,
                  eventCreatedBy: fullEventData.event.createdBy,
                  eventParticipants: fullEventData.event.participants?.map((p: any) => ({ 
                    user_id: p.user_id, 
                    role: p.role,
                    profile: p.profile 
                  })),
                  isEventAdmin
                })
              } else {
                console.log('🔍 Event Chat Debug: Full event fetch failed, using basic data')
                // Fallback to basic event data if full fetch fails
                setEventData(basicEventData)
                
                // Basic admin check using event creator
                const isEventAdmin = basicEventData.createdBy === profile.id
                setIsGroupAdmin(isEventAdmin)
                
                console.log('🔍 Event Admin Check Debug (Fallback):', {
                  profileId: profile.id,
                  eventCreatedBy: basicEventData.createdBy,
                  isEventAdmin
                })
              }
            } else {
              console.log('🔍 Event Chat Debug: No events found for chatId:', chatId)
              console.log('🔍 Event Chat Debug: This might mean:')
              console.log('  1. The event does not have chat_id set to this chatId')
              console.log('  2. The event was deleted')
              console.log('  3. There is a database inconsistency')
              console.log('🔍 Event Chat Debug: Chat info:', {
                chatId,
                chatName: chatData.name,
                chatType: chatData.type,
                groupId: chatData.group_id
              })
            }
          } else {
            console.log('🔍 Event Chat Debug: Event fetch failed with status:', eventResponse.status)
            const errorText = await eventResponse.text()
            console.log('🔍 Event Chat Debug: Error response:', errorText)
          }
        } catch (error) {
          console.error('🚨 Error fetching event data:', error)
          // Don't fail the entire chat loading if event data fails
        }
      }
      
      // Mark messages as read
      await markChatMessagesAsRead(chatId, profile.id)
      
    } catch (err) {
      console.error('Error loading chat:', err)
      setError(err instanceof Error ? err.message : 'Failed to load chat')
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

  // Debug admin status
  useEffect(() => {
    console.log('🔍 Admin Status Debug:', {
      isGroupAdmin,
      isEventChat,
      eventData: eventData ? 'exists' : 'null',
      groupData: groupData ? 'exists' : 'null',
      chatGroupId: chat?.group_id,
      profileId: profile?.id,
      profileFid: profile?.fid
    })
  }, [isGroupAdmin, isEventChat, eventData, groupData, chat?.group_id, profile?.id, profile?.fid])

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
    if (isEventChat && eventData) {
      // For event chats, navigate to event participants management
      router.push(`/events/${eventData.id}/participants`)
    } else if (chat?.group_id) {
      // For regular group chats, navigate to group members management
      router.push(`/groups/${chat.group_id}/members`)
    }
  }

  const handleEditGroup = () => {
    setShowInfoDropdown(false)
    if (isEventChat && eventData) {
      // For event chats, navigate to event editing
      router.push(`/events/${eventData.id}/edit`)
    } else if (chat?.group_id) {
      // For regular group chats, navigate to group editing
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
            onClick={() => router.push('/messages')}
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
                  {getChatDisplayName()}
                </h1>
                {chat?.type === 'group' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowMemberModal(true)}
                      className="text-sm text-gray-400 hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      {getParticipantInfo()}
                    </button>
                    {getChatLabel()}
                  </div>
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
                onClick={() => {
                  console.log('🔍 Info Dropdown Clicked:', {
                    isGroupAdmin,
                    isEventChat,
                    eventData: eventData ? 'exists' : 'null',
                    groupData: groupData ? 'exists' : 'null',
                    chatGroupId: chat?.group_id
                  })
                  setShowInfoDropdown(!showInfoDropdown)
                }}
                className="p-3 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
              >
                <FaEllipsisV className="w-4 h-4" />
              </button>
              
              {/* Info dropdown menu */}
              {showInfoDropdown && (
                <div 
                  ref={infoDropdownRef}
                  className="absolute right-0 top-full mt-2 w-52 bg-gray-800 border border-gray-600 rounded-xl shadow-xl z-50"
                >
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowInfoDropdown(false)
                        setShowMemberModal(true)
                      }}
                      className="w-full text-left px-4 py-4 text-sm text-gray-300 hover:bg-gray-700 active:bg-gray-600 flex items-center transition-colors"
                    >
                      <FaUsers className="w-5 h-5 mr-3" />
                      View Members
                    </button>
                    
                    {isGroupAdmin && (
                      <button
                        onClick={handleManageMembers}
                        className="w-full text-left px-4 py-4 text-sm text-gray-300 hover:bg-gray-700 active:bg-gray-600 flex items-center transition-colors"
                      >
                        <FaCog className="w-5 h-5 mr-3" />
                        Manage Members
                      </button>
                    )}
                    
                    <div className="border-t border-gray-700 my-2"></div>
                    
                    <button
                      onClick={handleLeaveChat}
                      className="w-full text-left px-4 py-4 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 active:bg-gray-600 flex items-center transition-colors"
                      disabled={leaveLoading}
                    >
                      <FaSignOutAlt className="w-5 h-5 mr-3" />
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

      {/* Member List Modal - made bigger vertically */}
      {showMemberModal && chat?.type === 'group' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[70vh] overflow-hidden">
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
            
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 80px)' }}>
              {chat.participantProfiles && chat.participantProfiles.length > 0 ? (
                <div className="space-y-3">
                  {chat.participantProfiles.map((participant) => {
                    // Check if this participant is an admin - fix crown display logic for both groups and events
                    let isParticipantAdmin = false
                    
                    if (isEventChat && eventData) {
                      // For event chats, check if participant is event organizer or admin
                      isParticipantAdmin = eventData.createdBy === participant.fid.toString() ||
                        eventData.participants?.some((eventParticipant: any) => 
                          eventParticipant.profile?.fid === participant.fid && 
                          (eventParticipant.role === 'organizer' || eventParticipant.role === 'admin')
                        )
                    } else if (groupData) {
                      // For group chats, check if participant is group creator or admin
                      isParticipantAdmin = groupData.createdBy === participant.fid.toString() ||
                        groupData.members?.some((member: any) => 
                          member.profile?.fid === participant.fid && member.role === 'admin'
                        )
                    }
                    
                    console.log('🔍 Crown Check Debug:', {
                      participantFid: participant.fid,
                      participantUsername: participant.username,
                      isEventChat,
                      eventCreatedBy: eventData?.createdBy,
                      eventParticipants: eventData?.participants?.filter((p: any) => p.profile?.fid === participant.fid).map((p: any) => ({ role: p.role })),
                      groupCreatedBy: groupData?.createdBy,
                      groupMembers: groupData?.members?.filter((m: any) => m.profile?.fid === participant.fid).map((m: any) => ({ role: m.role })),
                      isParticipantAdmin
                    })
                    
                    return (
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
                        {/* Show crown for actual admins */}
                        {isParticipantAdmin && (
                          <FaCrown className="w-4 h-4 text-yellow-500" title="Admin" />
                        )}
                      </div>
                    )
                  })}
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
