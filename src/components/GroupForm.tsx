'use client'

import React, { useState, useEffect } from 'react'
import { createGroup, createGroupInvitation, checkGroupNameExists, getProfileIdsByFids } from '../lib/supabase/groups'
import { useUser } from '../hooks/useUser'
import { useSocialData } from '../contexts/SocialDataContext'
import type { CreateGroupData, MutualFollower } from '../types'

interface GroupFormProps {
  onSuccess?: (groupId: string) => void
  onCancel?: () => void
  className?: string
}

const GAMING_PLATFORMS = [
  'PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile', 'Any'
] as const

const SKILL_LEVELS = [
  { value: 'any', label: 'Any Skill Level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
] as const

const POPULAR_GAMES = [
  'Apex Legends', 'Valorant', 'League of Legends', 'Counter-Strike 2', 
  'Overwatch 2', 'Call of Duty', 'Fortnite', 'Rocket League',
  'Minecraft', 'Among Us', 'Fall Guys', 'Destiny 2'
] as const

export default function GroupForm({ onSuccess, onCancel, className = '' }: GroupFormProps) {
  const { isAuthenticated, profile } = useUser()
  const { mutualFollowers, isLoadingMutuals } = useSocialData()

  // Form state
  const [formData, setFormData] = useState<CreateGroupData>({
    name: '',
    description: '',
    primaryGame: '',
    gamingPlatform: 'Any',
    skillLevel: 'any',
    isPrivate: false,
    maxMembers: 50,
    allowMemberInvites: true,
    requireAdminApproval: false
  })

  // UI state
  const [selectedInvitees, setSelectedInvitees] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentStep, setCurrentStep] = useState<'basic' | 'invites'>('basic')

  // Filtered mutual followers for invitation
  const filteredFollowers = mutualFollowers.filter(follower =>
    follower.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleInputChange = (field: keyof CreateGroupData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const toggleInvitee = (fid: number) => {
    setSelectedInvitees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fid)) {
        newSet.delete(fid)
      } else {
        newSet.add(fid)
      }
      return newSet
    })
  }

  const validateForm = async (): Promise<string | null> => {
    if (!formData.name.trim()) return 'Group name is required'
    if (formData.name.length < 3) return 'Group name must be at least 3 characters'
    if (formData.name.length > 100) return 'Group name must be less than 100 characters'
    if (formData.description && formData.description.length > 500) return 'Description must be less than 500 characters'
    if ((formData.maxMembers || 0) < 2) return 'Group must allow at least 2 members'
    if ((formData.maxMembers || 0) > 1000) return 'Group cannot have more than 1000 members'
    
    // Check for duplicate group name
    if (profile && formData.name.trim()) {
      const nameExists = await checkGroupNameExists(formData.name, profile.id)
      if (nameExists) {
        return 'You already have a group with this name. Please choose a different name.'
      }
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated || !profile) {
      setError('You must be signed in to create a group')
      return
    }

    const validationError = await validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create the group
      const group = await createGroup(formData, profile.id)

      // Send invitations to selected mutual followers
      if (selectedInvitees.size > 0) {
        try {
          // Get profile IDs for all selected FIDs
          const fidArray = Array.from(selectedInvitees)
          const fidToIdMap = await getProfileIdsByFids(fidArray)
          
          const invitationPromises = fidArray.map(async (fid) => {
            const profileId = fidToIdMap.get(fid)
            if (!profileId) {
              console.warn(`No profile found for FID ${fid}`)
              return null
            }
            
            try {
              return await createGroupInvitation(
                group.id,
                profile.id,
                profileId, // Now using the correct profile ID
                `You've been invited to join "${group.name}"!`
              )
            } catch (err) {
              console.warn(`Failed to invite user ${fid}:`, err)
              return null
            }
          })

          await Promise.allSettled(invitationPromises)
        } catch (err) {
          console.warn('Failed to send some invitations:', err)
        }
      }

      // Success!
      onSuccess?.(group.id)
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        primaryGame: '',
        gamingPlatform: 'Any',
        skillLevel: 'any',
        isPrivate: false,
        maxMembers: 50,
        allowMemberInvites: true,
        requireAdminApproval: false
      })
      setSelectedInvitees(new Set())
      setCurrentStep('basic')

    } catch (err) {
      console.error('Error creating group:', err)
      setError(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Sign In Required</h3>
          <p className="text-gray-400">You must be signed in to create a group.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Create New Gaming Group</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center mb-6">
        <div className={`flex items-center ${currentStep === 'basic' ? 'text-blue-400' : 'text-green-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'basic' ? 'border-blue-400 bg-blue-400' : 'border-green-400 bg-green-400'
          }`}>
            {currentStep === 'basic' ? '1' : '✓'}
          </div>
          <span className="ml-2 text-sm font-medium">Group Details</span>
        </div>
        <div className="flex-1 h-px bg-gray-600 mx-4"></div>
        <div className={`flex items-center ${currentStep === 'invites' ? 'text-blue-400' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'invites' ? 'border-blue-400 bg-blue-400' : 'border-gray-600'
          }`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Invite Friends</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {currentStep === 'basic' && (
          <div className="space-y-6">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter a catchy group name..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
              />
              <p className="mt-1 text-xs text-gray-400">{formData.name.length}/100 characters</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your group's purpose, goals, or playstyle..."
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-400">{(formData.description || '').length}/500 characters</p>
            </div>

            {/* Primary Game */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Primary Game
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.primaryGame || ''}
                  onChange={(e) => handleInputChange('primaryGame', e.target.value)}
                  placeholder="Enter game name or select from popular games below..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  list="popular-games"
                />
                <datalist id="popular-games">
                  {POPULAR_GAMES.map(game => (
                    <option key={game} value={game} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_GAMES.slice(0, 6).map(game => (
                    <button
                      key={game}
                      type="button"
                      onClick={() => handleInputChange('primaryGame', game)}
                      className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full border border-gray-600 transition-colors"
                    >
                      {game}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gaming Platform */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gaming Platform
              </label>
              <select
                value={formData.gamingPlatform || 'Any'}
                onChange={(e) => handleInputChange('gamingPlatform', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {GAMING_PLATFORMS.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Skill Level
              </label>
              <select
                value={formData.skillLevel || 'any'}
                onChange={(e) => handleInputChange('skillLevel', e.target.value as any)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SKILL_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {/* Group Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Group Settings</h3>
              
              {/* Max Members */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Members
                </label>
                <input
                  type="number"
                  min="2"
                  max="1000"
                  value={formData.maxMembers}
                  onChange={(e) => handleInputChange('maxMembers', parseInt(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">Private Group</label>
                  <p className="text-xs text-gray-400">Only invited members can see and join this group</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('isPrivate', !formData.isPrivate)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                    formData.isPrivate ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.isPrivate ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Member Invites */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">Allow Member Invites</label>
                  <p className="text-xs text-gray-400">Let members invite their friends to the group</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('allowMemberInvites', !formData.allowMemberInvites)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                    formData.allowMemberInvites ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.allowMemberInvites ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Admin Approval */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">Require Admin Approval</label>
                  <p className="text-xs text-gray-400">New members need admin approval to join</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('requireAdminApproval', !formData.requireAdminApproval)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                    formData.requireAdminApproval ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.requireAdminApproval ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Next Step Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep('invites')}
                disabled={!formData.name.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Next: Invite Friends
              </button>
            </div>
          </div>
        )}

        {currentStep === 'invites' && (
          <div className="space-y-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Invite Mutual Followers
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or display name..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Selected Count */}
            <div className="text-sm text-gray-400">
              {selectedInvitees.size} of {filteredFollowers.length} followers selected
            </div>

            {/* Mutual Followers List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {isLoadingMutuals ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                  <p className="mt-2 text-gray-400">Loading mutual followers...</p>
                </div>
              ) : filteredFollowers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">
                    {searchQuery ? 'No followers found matching your search.' : 'No mutual followers found.'}
                  </p>
                </div>
              ) : (
                filteredFollowers.map((follower) => (
                  <div
                    key={follower.fid}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedInvitees.has(follower.fid)
                        ? 'bg-blue-900 border-blue-500'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                    }`}
                    onClick={() => toggleInvitee(follower.fid)}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={follower.pfpUrl}
                        alt={follower.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="text-white font-medium">{follower.displayName || follower.username}</p>
                        <p className="text-gray-400 text-sm">@{follower.username}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedInvitees.has(follower.fid)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-400'
                    }`}>
                      {selectedInvitees.has(follower.fid) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('basic')}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
              >
                {isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{isSubmitting ? 'Creating Group...' : 'Create Group'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </form>
    </div>
  )
} 