'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useSocialData } from '@/contexts/SocialDataContext'
import { createDirectChat, createGroupChat } from '@/lib/supabase/chats'
import { FaTimes, FaUser, FaUsers, FaSearch, FaSpinner } from 'react-icons/fa'

interface MutualFollower {
  fid: number
  username: string
  displayName?: string
  pfpUrl?: string
  gamertags?: Array<{
    platform: string
    handle: string
  }>
}

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
  onChatCreated?: () => void
}

export default function NewChatModal({ isOpen, onClose, onChatCreated }: NewChatModalProps) {
  const router = useRouter()
  const { profile } = useUser()
  const { gamingFollowers, isLoadingMutuals, isLoadingGamertags, mutualsError, gamertagsError } = useSocialData()
  
  // Modal state
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct')
  const [selectedUsers, setSelectedUsers] = useState<MutualFollower[]>([])
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Local state
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setChatType('direct')
      setSelectedUsers([])
      setGroupName('')
      setSearchQuery('')
    }
  }, [isOpen])

  const handleUserToggle = (user: MutualFollower) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.fid === user.fid)
      
      if (isSelected) {
        return prev.filter(u => u.fid !== user.fid)
      } else {
        // For direct chats, only allow one selection
        if (chatType === 'direct') {
          return [user]
        }
        return [...prev, user]
      }
    })
  }

  const handleCreateChat = async () => {
    if (!profile?.fid) {
      alert('User profile not found')
      return
    }

    if (selectedUsers.length === 0) {
      alert('Please select at least one person to chat with')
      return
    }

    if (chatType === 'group' && !groupName.trim()) {
      alert('Please enter a group name')
      return
    }

    setIsCreatingChat(true)

    try {
      let chatId: string

      if (chatType === 'direct') {
        chatId = await createDirectChat(profile.fid, selectedUsers[0].fid)
      } else {
        const participantFids = selectedUsers.map(u => u.fid)
        chatId = await createGroupChat(groupName.trim(), participantFids, profile.fid)
      }

      // Navigate to the new chat
      router.push(`/messages/${chatId}`)
      onClose()
      onChatCreated?.()
    } catch (err) {
      console.error('Error creating chat:', err)
      alert(err instanceof Error ? err.message : 'Failed to create chat')
    } finally {
      setIsCreatingChat(false)
    }
  }

  // Filter followers based on search
  const filteredFollowers = gamingFollowers.filter((user: any) => {
    const query = searchQuery.toLowerCase()
    return (
      user.username.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query)
    )
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">New Chat</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Chat Type Selection */}
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Chat Type</h3>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setChatType('direct')
                  setSelectedUsers([])
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                  chatType === 'direct'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FaUser className="w-4 h-4" />
                Direct Message
              </button>
              <button
                onClick={() => {
                  setChatType('group')
                  setSelectedUsers([])
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                  chatType === 'group'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FaUsers className="w-4 h-4" />
                Group Chat
              </button>
            </div>
          </div>

          {/* Group Name Input (only for group chats) */}
          {chatType === 'group' && (
            <div className="p-6 border-b border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* User Search */}
          <div className="p-6 border-b border-gray-700">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your connections..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {(isLoadingMutuals || isLoadingGamertags) ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <FaSpinner className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400">
                    {isLoadingMutuals ? 'Loading your connections...' : 'Loading gamertags...'}
                  </p>
                </div>
              </div>
            ) : (mutualsError || gamertagsError) ? (
              <div className="p-6 text-center">
                <p className="text-red-400 mb-4">{mutualsError || gamertagsError}</p>
                <p className="text-gray-400 text-sm">Please refresh the page to try again</p>
              </div>
            ) : filteredFollowers.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-400">
                  {searchQuery ? 'No connections found matching your search.' : 'No mutual connections found.'}
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-2">
                <p className="text-sm text-gray-400 mb-4">
                  {chatType === 'direct' 
                    ? 'Select a gaming connection to message:' 
                    : `Select gaming connections for the group (${selectedUsers.length} selected):`
                  }
                </p>
                {filteredFollowers.map((user) => {
                  const isSelected = selectedUsers.some(u => u.fid === user.fid)
                  return (
                    <button
                      key={user.fid}
                      onClick={() => handleUserToggle(user)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {user.pfpUrl ? (
                        <img
                          src={user.pfpUrl}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                          <FaUser className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-medium">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-sm opacity-75">@{user.username}</p>
                        {user.gamertags && user.gamertags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.gamertags.slice(0, 3).map((gamertag, index) => (
                              <span
                                key={index}
                                className="text-xs px-2 py-1 bg-gray-600 rounded-full"
                              >
                                {gamertag.platform}: {gamertag.handle}
                              </span>
                            ))}
                            {user.gamertags.length > 3 && (
                              <span className="text-xs px-2 py-1 bg-gray-600 rounded-full">
                                +{user.gamertags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateChat}
              disabled={selectedUsers.length === 0 || isCreatingChat || (chatType === 'group' && !groupName.trim())}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isCreatingChat ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${chatType === 'direct' ? 'Chat' : 'Group'}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 