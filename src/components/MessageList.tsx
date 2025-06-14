'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/hooks/useUser'
import { 
  getChatMessages, 
  subscribeToChatMessages,
  type MessageWithSender 
} from '@/lib/supabase/chats'
import { createClient } from '@/lib/supabase/client'
import { FaSpinner, FaExclamationTriangle } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

interface MessageListProps {
  chatId: string
  onNewMessage?: (message: MessageWithSender) => void
  className?: string
}

interface MessageBubbleProps {
  message: MessageWithSender
  isOwn: boolean
  showSender: boolean
  isUnread: boolean
}

function MessageBubble({ message, isOwn, showSender, isUnread }: MessageBubbleProps) {
  const router = useRouter()
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const handleAvatarClick = () => {
    if (message.sender_fid && !isOwn) {
      router.push(`/profile/${message.sender_fid}`)
    }
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs sm:max-w-md lg:max-w-lg ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender info (for group chats or when needed) */}
        {showSender && !isOwn && (
          <div className="flex items-center mb-1 px-1">
            {message.sender?.pfp_url && (
              <img
                src={message.sender.pfp_url}
                alt={message.sender.username}
                className="w-4 h-4 rounded-full mr-2 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                onClick={handleAvatarClick}
                title={`View ${message.sender.display_name || message.sender.username}'s profile`}
              />
            )}
            <span 
              className="text-xs text-gray-400 font-medium cursor-pointer hover:text-blue-400 transition-colors"
              onClick={handleAvatarClick}
              title={`View ${message.sender?.display_name || message.sender?.username || `User ${message.sender_fid}`}'s profile`}
            >
              {message.sender?.display_name || message.sender?.username || `User ${message.sender_fid}`}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`
            px-4 py-2 rounded-2xl relative
            ${isOwn
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-700 text-gray-100 rounded-bl-md'
            }
          `}
        >
          {/* Message content */}
          <div className="break-words whitespace-pre-wrap">
            {message.content}
          </div>

          {/* Message metadata */}
          <div className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
            <span>{formatTime(message.created_at)}</span>
            {message.is_edited && (
              <span className="ml-2 italic">edited</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MessageList({ chatId, onNewMessage, className = "" }: MessageListProps) {
  const { profile } = useUser()
  
  // Component state
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set())
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<any>(null)

  // Scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    })
  }

  // Fetch read status for messages
  const fetchReadStatus = async (messageIds: string[]) => {
    if (!profile?.id || messageIds.length === 0) return
    
    try {
      const supabase = createClient()
      const { data: readMessages, error } = await supabase
        .from('message_read_status')
        .select('message_id')
        .eq('user_id', profile.id)
        .in('message_id', messageIds)
      
      if (error) {
        console.error('Error fetching read status:', error)
        return
      }
      
      const readIds = new Set(readMessages?.map(r => r.message_id) || [])
      setReadMessageIds(readIds)
    } catch (err) {
      console.error('Error fetching read status:', err)
    }
  }

  // Load messages
  const loadMessages = async (before?: string) => {
    try {
      setError(null)
      const newMessages = await getChatMessages(chatId, 50, before)
      
      if (before) {
        // Prepend older messages
        setMessages(prev => [...newMessages, ...prev])
      } else {
        // Initial load or refresh
        setMessages(newMessages)
        // Scroll to bottom after initial load
        setTimeout(() => scrollToBottom(false), 100)
      }
      
      setHasMore(newMessages.length === 50)
      
      // Fetch read status for the loaded messages
      const messageIds = newMessages.map(m => m.id)
      await fetchReadStatus(messageIds)
    } catch (err) {
      console.error('Error loading messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle new message from real-time subscription
  const handleNewMessage = (newMessage: MessageWithSender) => {
    setMessages(prev => {
      // Check if message already exists (avoid duplicates)
      if (prev.some(msg => msg.id === newMessage.id)) {
        return prev
      }
      return [...prev, newMessage]
    })
    
    // Scroll to bottom for new messages
    setTimeout(() => scrollToBottom(), 100)
    
    // Notify parent component
    onNewMessage?.(newMessage)
  }

  // Add message from MessageComposer
  const addMessage = (message: MessageWithSender) => {
    handleNewMessage(message)
  }

  // Set up real-time subscription
  useEffect(() => {
    if (!chatId) return

    // Clean up previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    // Subscribe to new messages
    subscriptionRef.current = subscribeToChatMessages(chatId, (message) => {
      // Convert basic message to MessageWithSender format
      const messageWithSender: MessageWithSender = {
        ...message,
        sender: undefined // Will be populated by the query or can be enhanced
      }
      handleNewMessage(messageWithSender)
    })

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [chatId])

  // Load initial messages when chatId changes
  useEffect(() => {
    if (chatId) {
      setIsLoading(true)
      setMessages([])
      loadMessages()
    }
  }, [chatId])

  // Expose addMessage function to parent
  useEffect(() => {
    // This allows the MessageComposer to add messages directly
    if (typeof window !== 'undefined') {
      (window as any).addMessageToList = addMessage
    }
  }, [])

  if (isLoading && messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <FaSpinner className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (error && messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <FaExclamationTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-300 mb-2">Failed to load messages</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={() => loadMessages()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-gray-400 mb-2">No messages yet</p>
          <p className="text-gray-500 text-sm">Start the conversation!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Load more button */}
        {hasMore && messages.length > 0 && (
          <div className="text-center py-4">
            <button
              onClick={() => loadMessages(messages[0]?.created_at)}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => {
          const isOwn = message.sender_fid === profile?.fid
          const prevMessage = messages[index - 1]
          const showSender = !prevMessage || 
            prevMessage.sender_fid !== message.sender_fid ||
            (new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime()) > 300000 // 5 minutes
          const isUnread = !isOwn && !readMessageIds.has(message.id)

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwn}
              showSender={showSender}
              isUnread={isUnread}
            />
          )
        })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 border-t border-red-700/50">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
} 