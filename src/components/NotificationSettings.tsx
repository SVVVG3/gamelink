'use client'

import { useState, useEffect } from 'react'
import { NotificationPreferences } from '@/lib/notifications'

interface NotificationSettingsProps {
  userFid: number
  className?: string
}

export default function NotificationSettings({ userFid, className = '' }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load current preferences
  useEffect(() => {
    loadPreferences()
  }, [userFid])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/notifications/preferences?userFid=${userFid}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load preferences')
      }
      
      setPreferences(data.preferences)
    } catch (err: any) {
      console.error('Error loading notification preferences:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const updatedPrefs = { ...preferences, ...updates }
      
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid,
          preferences: {
            messages_enabled: updatedPrefs.messages_enabled,
            group_invites_enabled: updatedPrefs.group_invites_enabled,
            events_enabled: updatedPrefs.events_enabled,
            groups_enabled: updatedPrefs.groups_enabled,
          }
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update preferences')
      }

      setPreferences(data.preferences)
      setSuccessMessage('Notification preferences updated successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Error updating notification preferences:', err)
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!preferences || isSaving) return
    
    updatePreferences({
      [key]: !preferences[key]
    })
  }

  if (isLoading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🔔</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Notification Settings</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 border border-red-500 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Notification Settings</h3>
        </div>
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadPreferences}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!preferences) {
    return null
  }

  const notificationTypes = [
    {
      key: 'messages_enabled' as keyof NotificationPreferences,
      title: 'Messages',
      description: 'Get notified when you receive new messages in group chats or direct messages',
      icon: '💬'
    },
    {
      key: 'group_invites_enabled' as keyof NotificationPreferences,
      title: 'Group Invitations',
      description: 'Get notified when someone invites you to join a gaming group',
      icon: '👥'
    },
    {
      key: 'events_enabled' as keyof NotificationPreferences,
      title: 'Gaming Events',
      description: 'Get notified when your mutual followers create new gaming events',
      icon: '🎮'
    },
    {
      key: 'groups_enabled' as keyof NotificationPreferences,
      title: 'Public Groups',
      description: 'Get notified when your mutual followers create new public gaming groups',
      icon: '🌐'
    }
  ]

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">🔔</span>
        </div>
        <h3 className="text-lg font-semibold text-white">Notification Settings</h3>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-lg">
          <p className="text-green-400 text-sm">{successMessage}</p>
        </div>
      )}

      <div className="space-y-4">
        {notificationTypes.map((type) => (
          <div key={type.key} className="flex items-start justify-between p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-start space-x-3 flex-1">
              <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center mt-1">
                <span className="text-sm">{type.icon}</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">{type.title}</h4>
                <p className="text-gray-400 text-sm">{type.description}</p>
              </div>
            </div>
            
            <div className="ml-4">
              <button
                onClick={() => handleToggle(type.key)}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  preferences[type.key] 
                    ? 'bg-blue-600' 
                    : 'bg-gray-600'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences[type.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center mt-0.5">
            <span className="text-white text-xs">ℹ️</span>
          </div>
          <div>
            <h5 className="text-blue-400 font-medium mb-1">About Notifications</h5>
            <p className="text-blue-300 text-sm">
              Notifications are sent through Farcaster when you have the GameLink Mini App installed. 
              You can also manage notification permissions in your Farcaster client settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 