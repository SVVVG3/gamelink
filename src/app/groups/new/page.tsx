'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import GroupForm from '@/components/GroupForm'
import { useUser } from '@/hooks/useUser'

export default function NewGroupPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useUser()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleGroupCreated = (groupId: string) => {
    console.log('✅ Group created successfully:', groupId)
    setIsNavigating(true)
    
    // Navigate to the group page after creation
    router.push(`/groups/${groupId}`)
  }

  const handleCancel = () => {
    router.back()
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-gray-800 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-white mb-4">Sign In Required</h1>
          <p className="text-gray-400 mb-6">
            You need to sign in with Farcaster to create a group.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              disabled={isNavigating}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Create Gaming Group</h1>
              <p className="text-gray-400 mt-1">
                Bring together gamers for your favorite games and activities
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <GroupForm
            onSuccess={handleGroupCreated}
            onCancel={handleCancel}
            className="w-full"
          />
        </div>
      </div>

      {/* Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-white text-lg font-medium">Creating your group...</p>
            <p className="text-gray-400 mt-2">Redirecting to your new group</p>
          </div>
        </div>
      )}
    </div>
  )
} 