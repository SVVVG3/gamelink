'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft, FaSave, FaSpinner } from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import { getGroupById, updateGroup } from '@/lib/supabase/groups'
import BottomNavigation from '@/components/BottomNavigation'
import type { Group } from '@/types'

interface Props {
  params: Promise<{ groupId: string }>
}

export default function EditGroupClient({ params }: Props) {
  const router = useRouter()
  const { isAuthenticated, isLoading: userLoading, profile } = useUser()
  
  const [groupId, setGroupId] = useState<string>('')
  const [group, setGroup] = useState<Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    primaryGame: '',
    gamingPlatform: '',
    skillLevel: 'any' as 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'any',
    maxMembers: 50,
    isPrivate: false,
    allowMemberInvites: true,
    requireAdminApproval: false
  })

  useEffect(() => {
    const getGroupId = async () => {
      const resolvedParams = await params
      setGroupId(resolvedParams.groupId)
    }
    getGroupId()
  }, [params])

  // Load group data
  useEffect(() => {
    const loadGroup = async () => {
      if (!groupId || !profile?.id) return

      try {
        setError(null)
        const groupData = await getGroupById(groupId)
        
        if (!groupData) {
          setError('Group not found')
          return
        }

        // Check if user is admin (you might need to check membership role)
        if (groupData.createdBy !== profile.id) {
          setError('You are not authorized to edit this group')
          return
        }

        setGroup(groupData)
        
        // Populate form with existing data
        setFormData({
          name: groupData.name || '',
          description: groupData.description || '',
          primaryGame: groupData.primaryGame || '',
          gamingPlatform: groupData.gamingPlatform || '',
          skillLevel: groupData.skillLevel || 'any',
          maxMembers: groupData.maxMembers || 50,
          isPrivate: groupData.isPrivate || false,
          allowMemberInvites: groupData.allowMemberInvites || true,
          requireAdminApproval: groupData.requireAdminApproval || false
        })
      } catch (err) {
        console.error('Error loading group:', err)
        setError(err instanceof Error ? err.message : 'Failed to load group')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated && groupId && profile?.id) {
      loadGroup()
    }
  }, [isAuthenticated, groupId, profile?.id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group || !profile?.id) return

    setIsSaving(true)
    setError(null)

    try {
      await updateGroup(groupId, formData)
      
      // Navigate back to group details
      router.push(`/groups/${groupId}`)
    } catch (err) {
      console.error('Error updating group:', err)
      setError(err instanceof Error ? err.message : 'Failed to update group')
    } finally {
      setIsSaving(false)
    }
  }

  // Loading state
  if (userLoading || isLoading) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading group...</p>
        </div>
      </main>
    )
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-gray-900 pb-20">
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <Link 
            href={`/groups/${groupId}`}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Group
          </Link>
        </div>
        
        <div className="p-4">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <h2 className="text-red-400 font-medium mb-2">Error</h2>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
        
        <BottomNavigation />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <Link 
            href={`/groups/${groupId}`}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Group
          </Link>
          
          <h1 className="text-xl font-bold text-white">Edit Group</h1>
          
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Form */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Group Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your group"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Primary Game
                </label>
                <input
                  type="text"
                  name="primaryGame"
                  value={formData.primaryGame}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What game does your group focus on?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gaming Platform
                </label>
                <select
                  name="gamingPlatform"
                  value={formData.gamingPlatform}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Platform</option>
                  <option value="PC">PC</option>
                  <option value="PlayStation">PlayStation</option>
                  <option value="Xbox">Xbox</option>
                  <option value="Nintendo Switch">Nintendo Switch</option>
                  <option value="Mobile">Mobile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Skill Level
                </label>
                <select
                  name="skillLevel"
                  value={formData.skillLevel}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="any">Any Level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Members
                </label>
                <input
                  type="number"
                  name="maxMembers"
                  value={formData.maxMembers}
                  onChange={handleInputChange}
                  min="2"
                  max="1000"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Group Settings */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Group Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isPrivate"
                  checked={formData.isPrivate}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-300">
                  Private group (invite only)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="allowMemberInvites"
                  checked={formData.allowMemberInvites}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-300">
                  Allow members to invite others
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="requireAdminApproval"
                  checked={formData.requireAdminApproval}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-300">
                  Require admin approval for new members
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href={`/groups/${groupId}`}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </Link>
            
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
            >
              {isSaving ? (
                <>
                  <FaSpinner className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FaSave className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      <BottomNavigation />
    </main>
  )
} 