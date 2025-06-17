'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import BottomNavigation from '@/components/BottomNavigation'
import { FaArrowLeft, FaCalendarAlt, FaGamepad, FaSave, FaTimes, FaUsers } from 'react-icons/fa'
import Link from 'next/link'

interface EventFormData {
  title: string
  description: string
  game: string
  gamingPlatform: string
  eventType: 'casual' | 'tournament' | 'practice' | 'scrimmage' | 'ranked'
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'any'
  startTime: string
  endTime: string
  maxParticipants: number
  locationType: 'online' | 'in_person' | 'hybrid'
  connectionDetails: string
  physicalLocation: string
  isPrivate: boolean
  requireApproval: boolean
  allowSpectators: boolean
}

export default function CreateEventPage() {
  const { isAuthenticated, isLoading, farcasterProfile } = useUser()
  const router = useRouter()
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    game: '',
    gamingPlatform: 'PC',
    eventType: 'casual',
    skillLevel: 'any',
    startTime: '',
    endTime: '',
    maxParticipants: 8,
    locationType: 'online',
    connectionDetails: '',
    physicalLocation: '',
    isPrivate: false,
    requireApproval: false,
    allowSpectators: true
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 pb-20">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <FaCalendarAlt className="w-16 h-16 text-gray-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Sign In Required</h1>
          <p className="text-gray-300">You need to sign in to create gaming events</p>
          <Link 
            href="/events"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Link>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseInt(value) || 0 : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required'
    }
    
    if (!formData.game.trim()) {
      newErrors.game = 'Game is required'
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }
    
    if (formData.maxParticipants < 2) {
      newErrors.maxParticipants = 'Must allow at least 2 participants'
    }
    
    if (formData.maxParticipants > 1000) {
      newErrors.maxParticipants = 'Maximum 1000 participants allowed'
    }
    
    if (formData.locationType === 'online' && !formData.connectionDetails.trim()) {
      newErrors.connectionDetails = 'Connection details required for online events'
    }
    
    if (formData.locationType === 'in_person' && !formData.physicalLocation.trim()) {
      newErrors.physicalLocation = 'Physical location required for in-person events'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      console.log('🎮 Submitting event:', formData)
      
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          createdBy: farcasterProfile?.fid,  // Add user's FID
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone  // Add user's timezone
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create event')
      }

      console.log('✅ Event created successfully:', result.event)
      
      // Redirect to events page on success
      router.push('/events')
    } catch (error) {
      console.error('❌ Error creating event:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create event. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4 pb-20">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link 
              href="/events"
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <FaArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Create Gaming Event</h1>
              <p className="text-gray-400">Organize your next gaming session</p>
            </div>
          </div>
          
          {farcasterProfile?.pfpUrl && (
            <img
              src={farcasterProfile.pfpUrl}
              alt="Your profile"
              className="w-10 h-10 rounded-full ring-2 ring-blue-500"
            />
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <FaGamepad className="w-5 h-5 mr-2 text-blue-400" />
              Event Details
            </h2>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Friday Night Valorant Tournament"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Tell players what to expect..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Game */}
              <div>
                <label htmlFor="game" className="block text-sm font-medium text-gray-300 mb-2">
                  Game *
                </label>
                <input
                  type="text"
                  id="game"
                  name="game"
                  value={formData.game}
                  onChange={handleInputChange}
                  placeholder="e.g., Valorant, League of Legends, Fortnite"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.game && <p className="text-red-400 text-sm mt-1">{errors.game}</p>}
              </div>

                             {/* Gaming Platform & Event Type Row */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                   <label htmlFor="gamingPlatform" className="block text-sm font-medium text-gray-300 mb-2">
                     Platform
                   </label>
                   <select
                     id="gamingPlatform"
                     name="gamingPlatform"
                     value={formData.gamingPlatform}
                     onChange={handleInputChange}
                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   >
                     <option value="PC">PC</option>
                     <option value="PlayStation">PlayStation</option>
                     <option value="Xbox">Xbox</option>
                     <option value="Nintendo Switch">Nintendo Switch</option>
                     <option value="Mobile">Mobile</option>
                     <option value="Cross-platform">Cross-platform</option>
                   </select>
                 </div>

                 <div>
                   <label htmlFor="eventType" className="block text-sm font-medium text-gray-300 mb-2">
                     Event Type
                   </label>
                   <select
                     id="eventType"
                     name="eventType"
                     value={formData.eventType}
                     onChange={handleInputChange}
                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   >
                     <option value="casual">Casual</option>
                     <option value="tournament">Tournament</option>
                     <option value="practice">Practice</option>
                     <option value="scrimmage">Scrimmage</option>
                     <option value="ranked">Ranked</option>
                   </select>
                 </div>
               </div>

               {/* Skill Level */}
               <div>
                 <label htmlFor="skillLevel" className="block text-sm font-medium text-gray-300 mb-2">
                   Skill Level
                 </label>
                 <select
                   id="skillLevel"
                   name="skillLevel"
                   value={formData.skillLevel}
                   onChange={handleInputChange}
                   className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 >
                   <option value="any">Any Skill Level</option>
                   <option value="beginner">Beginner</option>
                   <option value="intermediate">Intermediate</option>
                   <option value="advanced">Advanced</option>
                   <option value="expert">Expert</option>
                 </select>
               </div>
             </div>
           </div>

           {/* Schedule & Location Section */}
           <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
             <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
               <FaCalendarAlt className="w-5 h-5 mr-2 text-green-400" />
               Schedule & Location
             </h2>
             
             <div className="space-y-4">
               {/* Date/Time Row */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                   <label htmlFor="startTime" className="block text-sm font-medium text-gray-300 mb-2">
                     Start Time *
                   </label>
                   <input
                     type="datetime-local"
                     id="startTime"
                     name="startTime"
                     value={formData.startTime}
                     onChange={handleInputChange}
                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   />
                   {errors.startTime && <p className="text-red-400 text-sm mt-1">{errors.startTime}</p>}
                 </div>

                 <div>
                   <label htmlFor="endTime" className="block text-sm font-medium text-gray-300 mb-2">
                     End Time (Optional)
                   </label>
                   <input
                     type="datetime-local"
                     id="endTime"
                     name="endTime"
                     value={formData.endTime}
                     onChange={handleInputChange}
                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   />
                 </div>
               </div>

               {/* Location Type */}
               <div>
                 <label htmlFor="locationType" className="block text-sm font-medium text-gray-300 mb-2">
                   Location Type
                 </label>
                 <select
                   id="locationType"
                   name="locationType"
                   value={formData.locationType}
                   onChange={handleInputChange}
                   className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 >
                   <option value="online">Online</option>
                   <option value="in_person">In Person</option>
                   <option value="hybrid">Hybrid</option>
                 </select>
               </div>

               {/* Connection Details (Online) */}
               {(formData.locationType === 'online' || formData.locationType === 'hybrid') && (
                 <div>
                   <label htmlFor="connectionDetails" className="block text-sm font-medium text-gray-300 mb-2">
                     Connection Details {formData.locationType === 'online' ? '*' : ''}
                   </label>
                   <textarea
                     id="connectionDetails"
                     name="connectionDetails"
                     value={formData.connectionDetails}
                     onChange={handleInputChange}
                     rows={2}
                     placeholder="Discord server, game lobby info, etc."
                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                   />
                   {errors.connectionDetails && <p className="text-red-400 text-sm mt-1">{errors.connectionDetails}</p>}
                 </div>
               )}

               {/* Physical Location (In Person) */}
               {(formData.locationType === 'in_person' || formData.locationType === 'hybrid') && (
                 <div>
                   <label htmlFor="physicalLocation" className="block text-sm font-medium text-gray-300 mb-2">
                     Physical Location {formData.locationType === 'in_person' ? '*' : ''}
                   </label>
                   <input
                     type="text"
                     id="physicalLocation"
                     name="physicalLocation"
                     value={formData.physicalLocation}
                     onChange={handleInputChange}
                     placeholder="Address or venue name"
                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   />
                   {errors.physicalLocation && <p className="text-red-400 text-sm mt-1">{errors.physicalLocation}</p>}
                 </div>
               )}
             </div>
           </div>

           {/* Settings Section */}
           <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
             <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
               <FaUsers className="w-5 h-5 mr-2 text-purple-400" />
               Event Settings
             </h2>
             
             <div className="space-y-4">
               {/* Max Participants */}
               <div>
                 <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-300 mb-2">
                   Squad Size (Max Participants) *
                 </label>
                 <input
                   type="number"
                   id="maxParticipants"
                   name="maxParticipants"
                   value={formData.maxParticipants}
                   onChange={handleInputChange}
                   min="2"
                   max="1000"
                   className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 />
                 {errors.maxParticipants && <p className="text-red-400 text-sm mt-1">{errors.maxParticipants}</p>}
               </div>

               {/* Toggle Settings */}
               <div className="space-y-3">
                 <label className="flex items-center">
                   <input
                     type="checkbox"
                     name="requireApproval"
                     checked={formData.requireApproval}
                     onChange={handleInputChange}
                     className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                   />
                   <span className="ml-3 text-sm text-gray-300">Require approval to join</span>
                 </label>

                 <label className="flex items-center">
                   <input
                     type="checkbox"
                     name="isPrivate"
                     checked={formData.isPrivate}
                     onChange={handleInputChange}
                     className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                   />
                   <span className="ml-3 text-sm text-gray-300">Private event (invite only)</span>
                 </label>

                 <label className="flex items-center">
                   <input
                     type="checkbox"
                     name="allowSpectators"
                     checked={formData.allowSpectators}
                     onChange={handleInputChange}
                     className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                   />
                   <span className="ml-3 text-sm text-gray-300">Allow spectators</span>
                 </label>
               </div>
             </div>
           </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href="/events"
              className="flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes className="w-4 h-4 mr-2" />
              Cancel
            </Link>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FaSave className="w-4 h-4 mr-2" />
                  Create Event
                </>
              )}
            </button>
          </div>

          {errors.submit && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-400">{errors.submit}</p>
            </div>
          )}
        </form>
      </div>
      <BottomNavigation />
    </main>
  )
} 