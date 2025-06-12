'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MessageComposer from './MessageComposer'
import MessageList from './MessageList'
import { FaArrowLeft } from 'react-icons/fa'

interface TestMessageComposerProps {
  chatId: string
}

export default function TestMessageComposer({ chatId }: TestMessageComposerProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])

  const handleMessageSent = (message: any) => {
    console.log('Message sent:', message)
    // Add the message to our local state for testing
    setMessages(prev => [...prev, message])
  }

  const handleMessageError = (error: string) => {
    console.error('Message error:', error)
    alert(`Error: ${error}`)
  }

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col pb-20">
      {/* Header */}
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
              Test Chat (No Auth)
            </h1>
            <p className="text-sm text-gray-400">
              Testing MessageComposer functionality
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 p-4">
        {/* Test Messages Display */}
        <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
          <h3 className="text-white font-medium mb-4">Test Messages:</h3>
          {messages.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No messages yet. Try sending one below!
            </p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-3">
                  <p className="text-white">{msg.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Message Composer */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-white font-medium mb-4">MessageComposer Test:</h3>
          <MessageComposer
            chatId={chatId}
            onMessageSent={handleMessageSent}
            onError={handleMessageError}
            placeholder="Type a test message..."
            testMode={true}
          />
          
          <div className="mt-4 text-sm text-gray-400">
            <p>• This is a test interface for the MessageComposer component</p>
            <p>• Messages won't be saved to the database without authentication</p>
            <p>• Check the browser console for detailed logs</p>
          </div>
        </div>
      </div>
    </main>
  )
} 