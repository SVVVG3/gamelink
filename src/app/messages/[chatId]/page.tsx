'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { getChatById, type ChatWithParticipants, type MessageWithSender } from '@/lib/supabase/chats'
import MessageList from '@/components/MessageList'
import MessageComposer from '@/components/MessageComposer'
import BottomNavigation from '@/components/BottomNavigation'
import { FaArrowLeft, FaUsers, FaSpinner, FaExclamationTriangle } from 'react-icons/fa'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: userLoading, profile } = useUser()
  
  const chatId = params.chatId as string
  
  // Component state
  const [chat, setChat] = useState<ChatWithParticipants | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      
      setChat(chatData)
    } catch (err) {
      console.error('Error loading chat:', err)
      setError(err instanceof Error ? err.message : 'Failed to load chat')
    } finally {
      setIsLoading(false)
    }
  }, [chatId, profile?.fid])

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
    const otherParticipant = chat.participants.find(p => p.fid !== profile?.fid)
    if (otherParticipant) {
      // We'd need to fetch the profile data for the display name
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
      {/* Chat Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
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

        {/* Chat actions (future: settings, info, etc.) */}
        <div className="flex items-center space-x-2">
          {chat?.type === 'group' && (
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              <FaUsers className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
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
            placeholder={`Message ${getChatDisplayName()}...`}
          />
        </div>
      </div>

      <BottomNavigation />
    </main>
  )
} 