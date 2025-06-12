'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { 
  createGamertag, 
  updateGamertag, 
  deleteGamertag, 
  type Gamertag, 
  type CreateGamertagData,
  type Platform 
} from '@/lib/supabase/gamertags'
import { 
  SiPlaystation, 
  SiSteam, 
  SiNintendoswitch, 
  SiEpicgames, 
  SiDiscord, 
  SiRiotgames 
} from 'react-icons/si'
import { FaGamepad, FaXbox } from 'react-icons/fa'

interface GamertagFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

// Platform configuration with icons and validation
const PLATFORMS: Record<Platform, {
  name: string
  icon: React.ReactNode
  placeholder: string
  validation: RegExp
  errorMessage: string
}> = {
  PSN: {
    name: 'PlayStation Network',
    icon: <SiPlaystation className="w-5 h-5 text-blue-500" />,
    placeholder: 'e.g., SVVVG3_Gaming',
    validation: /^[a-zA-Z0-9_-]{3,16}$/,
    errorMessage: '3-16 characters, letters, numbers, hyphens, underscores only'
  },
  Xbox: {
    name: 'Xbox Live',
    icon: <FaXbox className="w-5 h-5 text-green-500" />,
    placeholder: 'e.g., SVVVG3 Gaming',
    validation: /^[a-zA-Z0-9 ]{1,15}$/,
    errorMessage: '1-15 characters, letters, numbers, spaces only'
  },
  Steam: {
    name: 'Steam',
    icon: <SiSteam className="w-5 h-5 text-blue-400" />,
    placeholder: 'e.g., svvvg3 or 76561198123456789',
    validation: /^[a-zA-Z0-9_.-]{3,32}$/,
    errorMessage: '3-32 characters, letters, numbers, dots, hyphens, underscores'
  },
  Nintendo: {
    name: 'Nintendo Switch',
    icon: <SiNintendoswitch className="w-5 h-5 text-red-500" />,
    placeholder: 'e.g., SW-1234-5678-9012',
    validation: /^SW-\d{4}-\d{4}-\d{4}$/,
    errorMessage: 'Format: SW-XXXX-XXXX-XXXX (12 digits)'
  },
  Epic: {
    name: 'Epic Games',
    icon: <SiEpicgames className="w-5 h-5 text-gray-300" />,
    placeholder: 'e.g., SVVVG3_Epic',
    validation: /^[a-zA-Z0-9_-]{3,16}$/,
    errorMessage: '3-16 characters, letters, numbers, hyphens, underscores only'
  },
  Discord: {
    name: 'Discord',
    icon: <SiDiscord className="w-5 h-5 text-indigo-500" />,
    placeholder: 'e.g., svvvg3#1234',
    validation: /^.{2,32}#\d{4}$/,
    errorMessage: 'Format: username#1234 (2-32 characters + #discriminator)'
  },
  Riot: {
    name: 'Riot Games',
    icon: <SiRiotgames className="w-5 h-5 text-orange-500" />,
    placeholder: 'e.g., SVVVG3#TAG1',
    validation: /^[a-zA-Z0-9 ]{3,16}(#[a-zA-Z0-9]{3,5})?$/,
    errorMessage: '3-16 characters, optional #tagline'
  },
  PokemonGO: {
    name: 'Pokémon GO',
    icon: <FaGamepad className="w-5 h-5 text-yellow-500" />,
    placeholder: 'e.g., 123456789012',
    validation: /^\d{12}$/,
    errorMessage: '12-digit trainer code (numbers only)'
  }
}

export default function GamertagForm({ onSuccess, onCancel }: GamertagFormProps) {
  const { profile, gamertags, refreshData } = useUser()
  
  // Form state
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('PSN')
  const [username, setUsername] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // Edit mode state
  const [editingGamertag, setEditingGamertag] = useState<Gamertag | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Validate username based on platform
  const validateUsername = (platform: Platform, value: string): boolean => {
    if (!value.trim()) return false
    return PLATFORMS[platform].validation.test(value)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile?.id) {
      setError('Profile not found. Please try refreshing the page.')
      return
    }

    // Validate username
    if (!validateUsername(selectedPlatform, username)) {
      setValidationError(PLATFORMS[selectedPlatform].errorMessage)
      return
    }

    // Check for duplicate platform (only if not editing)
    if (!editingGamertag && gamertags.some(g => g.platform === selectedPlatform)) {
      setValidationError(`You already have a ${selectedPlatform} gamertag. Edit the existing one instead.`)
      return
    }

    setIsLoading(true)
    setError(null)
    setValidationError(null)

    try {
      if (editingGamertag) {
        // Update existing gamertag
        await updateGamertag(profile.id, editingGamertag.platform, {
          gamertag: username.trim(),
          is_public: isPublic
        })
      } else {
        // Create new gamertag
        const gamertagData: CreateGamertagData = {
          profile_id: profile.id,
          platform: selectedPlatform,
          gamertag: username.trim(),
          is_public: isPublic
        }
        await createGamertag(gamertagData)
      }

      // Refresh data and reset form
      await refreshData()
      resetForm()
      onSuccess?.()
    } catch (err) {
      console.error('Error saving gamertag:', err)
      setError(err instanceof Error ? err.message : 'Failed to save gamertag')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle delete
  const handleDelete = async (gamertag: Gamertag) => {
    if (!confirm('Are you sure you want to delete this gamertag?')) return

    if (!profile?.id) {
      setError('Profile not found. Please try refreshing the page.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await deleteGamertag(profile.id, gamertag.platform)
      await refreshData()
    } catch (err) {
      console.error('Error deleting gamertag:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete gamertag')
    } finally {
      setIsLoading(false)
    }
  }

  // Start editing a gamertag
  const startEdit = (gamertag: Gamertag) => {
    setEditingGamertag(gamertag)
    setSelectedPlatform(gamertag.platform)
    setUsername(gamertag.gamertag)
    setIsPublic(gamertag.is_public)
    setShowForm(true)
    setError(null)
    setValidationError(null)
  }

  // Reset form
  const resetForm = () => {
    setEditingGamertag(null)
    setSelectedPlatform('PSN')
    setUsername('')
    setIsPublic(true)
    setShowForm(false)
    setError(null)
    setValidationError(null)
  }

  // Handle username input change with validation
  const handleUsernameChange = (value: string) => {
    setUsername(value)
    if (validationError && validateUsername(selectedPlatform, value)) {
      setValidationError(null)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Existing Gamertags */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
          <h3 className="text-base sm:text-lg font-medium text-white">Your Gamertags</h3>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 min-h-[44px] w-full sm:w-auto"
          >
            ➕ Add Gamertag
          </button>
        </div>

        {gamertags.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {gamertags.map((gamertag) => (
              <div key={gamertag.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-lg space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                    {PLATFORMS[gamertag.platform].icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm sm:text-base">{gamertag.platform}</div>
                    <div className="text-sm text-gray-300 truncate">{gamertag.gamertag}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      {gamertag.is_public ? (
                        <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded border border-green-700">Public</span>
                      ) : (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-600">Private</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 justify-end">
                  <button
                    onClick={() => startEdit(gamertag)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-300 bg-blue-900/30 border border-blue-700 rounded-md hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 min-h-[44px]"
                    disabled={isLoading}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(gamertag)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-300 bg-red-900/30 border border-red-700 rounded-md hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900 min-h-[44px]"
                    disabled={isLoading}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-300 mb-2 text-sm sm:text-base">No gamertags added yet</p>
            <p className="text-xs sm:text-sm text-gray-400 px-4">Add your gaming platform usernames to connect with friends!</p>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base sm:text-lg font-medium text-white">
              {editingGamertag ? 'Edit Gamertag' : 'Add New Gamertag'}
            </h4>
            <button
              onClick={() => {
                resetForm()
                onCancel?.()
              }}
              className="text-gray-400 hover:text-gray-200 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-md">
              <p className="text-xs sm:text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Platform Selection */}
            {!editingGamertag && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gaming Platform
                </label>
                <div className="relative">
                  <div className="flex items-center space-x-3 mb-2 p-3 bg-gray-700 border border-gray-600 rounded-md">
                    <div className="flex items-center justify-center w-6 h-6">
                      {PLATFORMS[selectedPlatform].icon}
                    </div>
                    <span className="text-white font-medium">{PLATFORMS[selectedPlatform].name}</span>
                  </div>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => {
                      setSelectedPlatform(e.target.value as Platform)
                      setUsername('')
                      setValidationError(null)
                    }}
                    className="w-full px-3 py-3 text-base bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px]"
                  >
                    {Object.entries(PLATFORMS).map(([key, platform]) => (
                      <option key={key} value={key} className="bg-gray-700 text-white">
                        {platform.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Username Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {PLATFORMS[selectedPlatform].name} Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder={PLATFORMS[selectedPlatform].placeholder}
                className={`w-full px-3 py-3 text-base bg-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px] text-white placeholder-gray-400 ${
                  validationError ? 'border-red-500' : 'border-gray-600'
                }`}
                required
              />
              {validationError && (
                <p className="mt-2 text-xs sm:text-sm text-red-400">{validationError}</p>
              )}
            </div>

            {/* Privacy Toggle */}
            <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-offset-gray-800 mt-0.5 flex-shrink-0"
                />
                <div>
                  <span className="text-sm font-medium text-gray-200 block">
                    Make this gamertag public
                  </span>
                  <p className="mt-1 text-xs text-gray-400">
                    Public gamertags are visible to your Farcaster friends. Private gamertags are only visible to you.
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex-1 sm:flex-initial"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingGamertag ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    {editingGamertag ? '💾 Update Gamertag' : '➕ Add Gamertag'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  onCancel?.()
                }}
                className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-800 min-h-[44px] flex-1 sm:flex-initial"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
} 