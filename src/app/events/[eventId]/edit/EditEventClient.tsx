'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft, FaSave, FaSpinner } from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import { getEventById, updateEvent } from '@/lib/supabase/events'
import BottomNavigation from '@/components/BottomNavigation'
import type { Event } from '@/types'

interface Props {
  params: Promise<{ eventId: string }>
}

export default function EditEventClient({ params }: Props) {
  const router = useRouter()
  const { isAuthenticated, isLoading: userLoading, profile } = useUser()
  
  const [eventId, setEventId] = useState<string>('')
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    game: '',
    eventDate: '',
    eventTime: '',
    maxParticipants: 8,
    minParticipants: 2,
    eventType: 'casual' as 'casual' | 'competitive' | 'tournament',
    locationType: 'online' as 'online' | 'in_person' | 'hybrid',
    connectionDetails: '',
    physicalLocation: '',
    allowSpectators: false,
    requiresApproval: false,
    registrationDeadline: ''
  })

  useEffect(() => {
    const getEventId = async () => {
      const resolvedParams = await params
      setEventId(resolvedParams.eventId)
    }
    getEventId()
  }, [params])

  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId || !profile?.id) return

      try {
        setError(null)
        const eventData = await getEventById(eventId)
        
        if (!eventData) {
          setError('Event not found')
          return
        }

        // Check if user is the organizer
        if (eventData.createdBy !== profile.id) {
          setError('You are not authorized to edit this event')
          return
        }

        setEvent(eventData)
        
        // Parse the event date and time
        const eventDateTime = new Date(eventData.startTime)
        const eventDate = eventDateTime.toISOString().split('T')[0]
        const eventTime = eventDateTime.toTimeString().slice(0, 5)
        
        // Parse registration deadline if it exists
        let registrationDeadline = ''
        if (eventData.registrationDeadline) {
          const deadlineDateTime = new Date(eventData.registrationDeadline)
          registrationDeadline = deadlineDateTime.toISOString().slice(0, 16)
        }

        // Populate form with existing data
        setFormData({
          title: eventData.title || '',
          description: eventData.description || '',
          game: eventData.game || '',
          eventDate,
          eventTime,
          maxParticipants: eventData.maxParticipants || 8,
          minParticipants: eventData.minParticipants || 2,
          eventType: eventData.eventType || 'casual',
          locationType: eventData.locationType || 'online',
          connectionDetails: eventData.connectionDetails || '',
          physicalLocation: eventData.physicalLocation || '',
          allowSpectators: eventData.allowSpectators || false,
          requiresApproval: eventData.requiresApproval || false,
          registrationDeadline
        })
      } catch (err) {
        console.error('Error loading event:', err)
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated && eventId && profile?.id) {
      loadEvent()
    }
  }, [isAuthenticated, eventId, profile?.id])

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
    if (!event || !profile?.id) return

    setIsSaving(true)
    setError(null)

    try {
      // Combine date and time
      const eventDateTime = new Date(`${formData.eventDate}T${formData.eventTime}`)
      
      // Parse registration deadline
      let registrationDeadline: Date | null = null
      if (formData.registrationDeadline) {
        registrationDeadline = new Date(formData.registrationDeadline)
      }

      const updateData = {
        title: formData.title,
        description: formData.description,
        game: formData.game,
        startTime: eventDateTime.toISOString(),
        maxParticipants: formData.maxParticipants,
        minParticipants: formData.minParticipants,
        eventType: formData.eventType,
        locationType: formData.locationType,
        connectionDetails: formData.connectionDetails,
        physicalLocation: formData.physicalLocation,
        allowSpectators: formData.allowSpectators,
        requireApproval: formData.requiresApproval,
        registrationDeadline: registrationDeadline?.toISOString() || null
      }

      await updateEvent(eventId, updateData)
      
      // Navigate back to event details
      router.push(`/events/${eventId}`)
    } catch (err) {
      console.error('Error updating event:', err)
      setError(err instanceof Error ? err.message : 'Failed to update event')
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
          <p className="text-gray-300">Loading event...</p>
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
            href={`/events/${eventId}`}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Event
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
            href={`/events/${eventId}`}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Event
          </Link>
          
          <h1 className="text-xl font-bold text-white">Edit Event</h1>
          
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Form */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Event Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter event title"
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
                  placeholder="Describe your event"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game *
                </label>
                <input
                  type="text"
                  name="game"
                  value={formData.game}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What game will you be playing?"
                />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Schedule</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Date *
                </label>
                <input
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Time *
                </label>
                <input
                  type="time"
                  name="eventTime"
                  value={formData.eventTime}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Participants</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Players
                </label>
                <input
                  type="number"
                  name="minParticipants"
                  value={formData.minParticipants}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Players
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Event Type & Location */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Event Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Type
                </label>
                <select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="casual">Casual</option>
                  <option value="competitive">Competitive</option>
                  <option value="tournament">Tournament</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location Type
                </label>
                <select
                  name="locationType"
                  value={formData.locationType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="online">Online</option>
                  <option value="in_person">In Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {(formData.locationType === 'online' || formData.locationType === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Connection Details
                  </label>
                  <textarea
                    name="connectionDetails"
                    value={formData.connectionDetails}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Discord server, game lobby info, etc."
                  />
                </div>
              )}

              {(formData.locationType === 'in_person' || formData.locationType === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Physical Location
                  </label>
                  <input
                    type="text"
                    name="physicalLocation"
                    value={formData.physicalLocation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Address or venue name"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Additional Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="allowSpectators"
                  checked={formData.allowSpectators}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-300">
                  Allow spectators to join
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="requiresApproval"
                  checked={formData.requiresApproval}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-300">
                  Require approval for participants
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Registration Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  name="registrationDeadline"
                  value={formData.registrationDeadline}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href={`/events/${eventId}`}
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