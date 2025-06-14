'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { sendMessage, type SendMessageData, type MessageWithSender } from '@/lib/supabase/chats'
import { FaPaperPlane, FaSpinner, FaSmile, FaPaperclip } from 'react-icons/fa'

interface MessageComposerProps {
  chatId: string
  onMessageSent?: (message: MessageWithSender) => void
  onError?: (error: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  testMode?: boolean // Bypass authentication for testing
}

export default function MessageComposer({
  chatId,
  onMessageSent,
  onError,
  placeholder = "Type a message...",
  disabled = false,
  className = "",
  testMode = false
}: MessageComposerProps) {
  const { isAuthenticated, profile } = useUser()
  
  // Component state
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [message])

  // Focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus()
    }
  }, [disabled])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!testMode && (!isAuthenticated || !profile)) {
      const errorMsg = 'You must be signed in to send messages'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    if (!message.trim()) {
      return // Don't send empty messages
    }

    if (!chatId) {
      const errorMsg = 'No chat selected'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (testMode) {
        // In test mode, create a mock message instead of sending to database
        const mockMessage = {
          id: `test-${Date.now()}`,
          chat_id: chatId,
          sender_id: 'test-user',
          sender_fid: 466111,
          content: message.trim(),
          message_type: 'text' as const,
          reply_to: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_edited: false,
          is_deleted: false,
          sender: {
            fid: 466111,
            username: 'test-user',
            display_name: 'Test User',
            pfp_url: undefined
          }
        }
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Clear the input
        setMessage('')
        
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }

        // Notify parent component
        onMessageSent?.(mockMessage)
        
        // Focus back to textarea
        textareaRef.current?.focus()
        
      } else {
        const messageData: SendMessageData = {
          chat_id: chatId,
          content: message.trim(),
          message_type: 'text'
        }

        const sentMessage = await sendMessage(messageData, profile?.fid)
        
        // Send notification to other chat participants
        try {
          const response = await fetch('/api/notifications/message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messageId: sentMessage.id
            })
          })
          
          if (!response.ok) {
            console.warn('Failed to send message notification:', await response.text())
          } else {
            console.log('✅ Message notification sent successfully')
          }
        } catch (notificationError) {
          console.warn('Error sending message notification:', notificationError)
          // Don't fail the message send if notification fails
        }
        
        // Clear the input
        setMessage('')
        
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }

        // Immediately add message to the list (optimistic update)
        // This ensures the user sees their message right away
        if (typeof window !== 'undefined' && (window as any).addMessageToList) {
          (window as any).addMessageToList(sentMessage)
        }

        // Notify parent component
        onMessageSent?.(sentMessage)
        
        // Focus back to textarea
        textareaRef.current?.focus()
      }
      
    } catch (err) {
      console.error('Error sending message:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && message.trim()) {
        handleSubmit(e as React.FormEvent)
      }
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    setError(null) // Clear error when user starts typing
  }

  // Clear error after a few seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  if (!testMode && !isAuthenticated) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${className}`}>
        <p className="text-gray-400 text-center text-sm">
          Sign in to send messages
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg ${className}`}>
      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 border-b border-red-700/50">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="flex items-end p-3 gap-3">
        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className={`
              w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg 
              text-white placeholder-gray-400 resize-none overflow-hidden
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              ${isFocused ? 'border-blue-500' : 'border-gray-600'}
            `}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          
          {/* Character count (optional, for long messages) */}
          {message.length > 500 && (
            <div className="absolute bottom-1 right-2 text-xs text-gray-400">
              {message.length}/2000
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Emoji button (future feature) */}
          <button
            type="button"
            disabled={disabled || isLoading}
            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add emoji (coming soon)"
          >
            <FaSmile className="w-4 h-4" />
          </button>

          {/* Attachment button (future feature) */}
          <button
            type="button"
            disabled={disabled || isLoading}
            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file (coming soon)"
          >
            <FaPaperclip className="w-4 h-4" />
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={disabled || isLoading || !message.trim()}
            className={`
              p-3 rounded-lg transition-all duration-200 font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
              ${message.trim() && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-700 text-gray-400'
              }
            `}
            title={isLoading ? 'Sending...' : 'Send message (Enter)'}
          >
            {isLoading ? (
              <FaSpinner className="w-4 h-4 animate-spin" />
            ) : (
              <FaPaperPlane className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Helper text */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </p>
        {testMode && (
          <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
            Test Mode
          </span>
        )}
      </div>
    </div>
  )
} 