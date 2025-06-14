'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { getUserChats, type ChatWithParticipants } from '@/lib/supabase/chats'
import BottomNavigation from '@/components/BottomNavigation'
import NewChatModal from '@/components/NewChatModal'
import { FaComments, FaPlus, FaSearch, FaUsers, FaUser, FaSpinner } from 'react-icons/fa'
import { createClient } from '@/lib/supabase/client'

// Extended interface to include user profile data
interface ChatWithUserProfiles extends ChatWithParticipants {
  participantProfiles?: Array<{
    fid: number
    username: string
    display_name?: string
    pfp_url?: string
  }>
}

export default function MessagesPage() {
  const { isAuthenticated, isLoading, farcasterProfile, profile } = useUser()
  const router = useRouter()
  
  // Component state
  const [chats, setChats] = useState<ChatWithUserProfiles[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

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

  // Fetch unread message counts for each chat
  const fetchUnreadCounts = async (chatIds: string[]) => {
    if (!profile?.id || chatIds.length === 0) return
    
    try {
      const supabase = createClient()
      const counts: Record<string, number> = {}
      
      for (const chatId of chatIds) {
        // Get all messages in this chat (excluding own messages)
        const { data: allMessages, error: messagesError } = await supabase
          .from('messages')
          .select('id')
          .eq('chat_id', chatId)
          .neq('sender_id', profile.id)

        if (messagesError) {
          console.error('Error fetching messages for chat:', chatId, messagesError)
          counts[chatId] = 0
          continue
        }

        const messageIds = allMessages?.map((msg: any) => msg.id) || []
        
        if (messageIds.length > 0) {
          // Get read message IDs for this user
          const { data: readMessages, error: readError } = await supabase
            .from('message_read_status')
            .select('message_id')
            .eq('user_id', profile.id)
            .in('message_id', messageIds)

          if (readError) {
            console.error('Error fetching read status for chat:', chatId, readError)
            counts[chatId] = 0
          } else {
            const readMessageIds = new Set(readMessages?.map((r: any) => r.message_id) || [])
            const unreadCount = messageIds.filter((id: string) => !readMessageIds.has(id)).length
            counts[chatId] = unreadCount
          }
        } else {
          counts[chatId] = 0
        }
      }
      
      setUnreadCounts(counts)
    } catch (error) {
      console.error('Error fetching unread counts:', error)
    }
  }

  // Load user's chats
  const loadChats = useCallback(async () => {
    if (!profile?.fid) return
    
    setIsLoadingChats(true)
    setError(null)
    
    try {
      const userChats = await getUserChats(profile.fid)
      
      // Collect all unique FIDs from chat participants
      const allFids = new Set<number>()
      userChats.forEach(chat => {
        chat.participants.forEach(participant => {
          if (participant.fid) {
            allFids.add(participant.fid)
          }
        })
      })
      
      // Fetch user profiles for all participants
      const userProfiles = await fetchUserProfiles(Array.from(allFids))
      
      // Merge profile data with chats
      const chatsWithProfiles: ChatWithUserProfiles[] = userChats.map(chat => ({
        ...chat,
        participantProfiles: chat.participants
          .filter(p => p.fid)
          .map(p => userProfiles[p.fid!])
          .filter(Boolean)
      }))
      
      setChats(chatsWithProfiles)
      
      // Fetch unread counts for all chats
      const chatIds = chatsWithProfiles.map(chat => chat.id)
      await fetchUnreadCounts(chatIds)
    } catch (err) {
      console.error('Error loading chats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load chats')
    } finally {
      setIsLoadingChats(false)
    }
  }, [profile?.fid])

  // Load chats when user is authenticated
  useEffect(() => {
    if (isAuthenticated && profile?.fid) {
      loadChats()
    }
  }, [isAuthenticated, profile?.fid, loadChats])

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    
    // Search by chat name
    if (chat.name?.toLowerCase().includes(query)) return true
    
    // Search by participant usernames and display names
    const matchesParticipant = chat.participantProfiles?.some(participant => 
      participant.username.toLowerCase().includes(query) ||
      participant.display_name?.toLowerCase().includes(query)
    )
    
    if (matchesParticipant) return true
    
    return false
  })

  // Format chat display name
  const getChatDisplayName = (chat: ChatWithUserProfiles) => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat'
    }
    
    // For direct chats, show the other participant
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

  // Get chat avatar URL
  const getChatAvatarUrl = (chat: ChatWithUserProfiles) => {
    if (chat.type === 'direct') {
      const otherParticipantProfile = chat.participantProfiles?.find(p => p.fid !== profile?.fid)
      return otherParticipantProfile?.pfp_url
    }
    return null // Group chats don't have individual avatars for now
  }

  // Format last message time
  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center space-y-6 sm:space-y-8 max-w-md mx-auto">
          <div>
            <FaComments className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Messages
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 px-2">
              Sign in to start messaging your gaming friends
            </p>
          </div>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-900 pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-300">Loading messages...</p>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 pb-20">
      <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              💬 Messages
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              Chat with your gaming friends and organize teams
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {(farcasterProfile?.pfpUrl || profile?.pfp_url) && (
              <img
                src={farcasterProfile?.pfpUrl || profile?.pfp_url || ''}
                alt="Your profile"
                className="w-10 h-10 rounded-full ring-2 ring-blue-500"
              />
            )}
          </div>
        </div>

        {/* Search and New Chat */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button 
            onClick={() => setIsNewChatModalOpen(true)}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <FaPlus className="w-4 h-4 mr-2" />
            New Chat
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-700/50 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
            <button
              onClick={loadChats}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Chat List */}
        <div className="space-y-4">
          {isLoadingChats ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FaSpinner className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-400">Loading chats...</p>
              </div>
            </div>
          ) : filteredChats.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Your Conversations
                </h2>
                <span className="text-sm text-gray-400">
                  {filteredChats.length} chat{filteredChats.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {filteredChats.map((chat) => {
                const hasUnread = unreadCounts[chat.id] > 0
                
                return (
                  <div
                    key={chat.id}
                    onClick={() => router.push(`/messages/${chat.id}`)}
                    className={`
                      border rounded-lg p-4 hover:border-gray-600 transition-all cursor-pointer group
                      ${hasUnread 
                        ? 'bg-purple-900/20 border-purple-700/50 hover:bg-purple-900/30' 
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Chat Avatar */}
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-colors overflow-hidden relative
                        ${hasUnread 
                          ? 'bg-purple-700 group-hover:bg-purple-600' 
                          : 'bg-gray-700 group-hover:bg-gray-600'
                        }
                      `}>
                        {/* Unread indicator dot */}
                        {hasUnread && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-gray-900"></div>
                        )}
                        
                        {getChatAvatarUrl(chat) ? (
                          <img
                            src={getChatAvatarUrl(chat)!}
                            alt={getChatDisplayName(chat)}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : chat.type === 'group' ? (
                          <FaUsers className="w-6 h-6 text-gray-400" />
                        ) : (
                          <FaUser className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-medium truncate ${hasUnread ? 'text-white font-semibold' : 'text-white'}`}>
                            {getChatDisplayName(chat)}
                          </h3>
                          <span className="text-xs text-gray-400 ml-2">
                            {formatLastMessageTime(chat.last_message_at)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-gray-400 truncate">
                            {chat.type === 'group' 
                              ? `${chat.participant_count} members`
                              : 'Direct message'
                            }
                          </p>
                          
                          {/* Chat type indicator */}
                          <div className="flex items-center space-x-1">
                            {/* Unread count indicator */}
                            {unreadCounts[chat.id] > 0 && (
                              <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                                {unreadCounts[chat.id]}
                              </span>
                            )}
                            
                            {chat.type === 'group' && (
                              <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                                Group
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 sm:p-12 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto">
                  <FaComments className="w-10 h-10 text-blue-400" />
                </div>
                
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                    No conversations yet
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    Start chatting with your gaming friends! Create a new chat or wait for someone to message you.
                  </p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4 text-left">
                  <h4 className="text-white font-medium mb-2">💬 Test the MessageComposer:</h4>
                  <p className="text-sm text-gray-300 mb-3">
                    We've created test interfaces for you to try out the messaging system!
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push('/test-chat')}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      🧪 Test MessageComposer (No Auth Required)
                    </button>
                    <button
                      onClick={() => {
                        if (profile?.fid) {
                          router.push('/messages/bede26a9-e172-41d5-b4b9-d99f1ffbdcb8')
                        } else {
                          alert('Please wait for your profile to load')
                        }
                      }}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      💬 Open Test Chat (Requires Auth)
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Use the green button to test the component functionality without authentication issues.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNavigation />
      
      {/* New Chat Modal */}
      <NewChatModal 
        isOpen={isNewChatModalOpen} 
        onClose={() => setIsNewChatModalOpen(false)}
        onChatCreated={loadChats}
      />
    </main>
  )
} 