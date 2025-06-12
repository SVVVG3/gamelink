'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { getUserChats, type ChatWithParticipants } from '@/lib/supabase/chats'
import BottomNavigation from '@/components/BottomNavigation'
import NewChatModal from '@/components/NewChatModal'
import { FaComments, FaPlus, FaSearch, FaUsers, FaUser, FaSpinner } from 'react-icons/fa'

export default function MessagesPage() {
  const { isAuthenticated, isLoading, farcasterProfile, profile } = useUser()
  const router = useRouter()
  
  // Component state
  const [chats, setChats] = useState<ChatWithParticipants[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)

  // Load user's chats
  const loadChats = useCallback(async () => {
    if (!profile?.fid) return
    
    setIsLoadingChats(true)
    setError(null)
    
    try {
      const userChats = await getUserChats(profile.fid)
      setChats(userChats)
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
    
    // For direct chats, search by participant names (when we have that data)
    // This would need participant profile data to be fully functional
    
    return false
  })

  // Format chat display name
  const getChatDisplayName = (chat: ChatWithParticipants) => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat'
    }
    
    // For direct chats, show the other participant
    const otherParticipant = chat.participants.find(p => p.fid !== profile?.fid)
    if (otherParticipant) {
      return `User ${otherParticipant.fid}`
    }
    
    return 'Direct Chat'
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
              
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => router.push(`/messages/${chat.id}`)}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 hover:border-gray-600 transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-4">
                    {/* Chat Avatar */}
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                      {chat.type === 'group' ? (
                        <FaUsers className="w-6 h-6 text-gray-400" />
                      ) : (
                        <FaUser className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium truncate">
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
              ))}
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