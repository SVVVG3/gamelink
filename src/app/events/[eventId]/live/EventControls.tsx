'use client'

import { useState } from 'react'
import { Event, EventParticipant, Profile } from '@/types'
import { useUser } from '@/hooks/useUser'
import EventCompletionModal from '@/components/EventCompletionModal'
import ResultsShareModal from '@/components/ResultsShareModal'
import { FaShare } from 'react-icons/fa'

interface EventControlsProps {
  event: Event
  participants: (EventParticipant & { profile: Profile })[]
  onEventUpdate: (event: Event) => void
}

export default function EventControls({ 
  event, 
  participants, 
  onEventUpdate 
}: EventControlsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const { farcasterProfile } = useUser()

  // Update event status
  const updateEventStatus = async (newStatus: string) => {
    setLoading(newStatus)
    
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update event status')
      }

      const updatedEvent = await response.json()
      onEventUpdate(updatedEvent)
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Failed to update event status')
    } finally {
      setLoading(null)
      setShowConfirmDialog(null)
    }
  }

  // Handle event completion with modal workflow
  const handleEventCompletion = async (completionData: any) => {
    setLoading('completed')
    
    try {
      // Determine final status based on archive option
      const finalStatus = completionData.archiveEvent ? 'archived' : 'completed'
      
      // Update event status
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: finalStatus,
          completionData 
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${completionData.archiveEvent ? 'archive' : 'complete'} event`)
      }

      const updatedEvent = await response.json()
      onEventUpdate(updatedEvent)

      // Send completion notification if requested
      if (completionData.notifyParticipants) {
        const message = completionData.archiveEvent 
          ? `Event "${event.title}" has been completed and archived! Thank you for participating.`
          : `Event "${event.title}" has been completed! Thank you for participating.`
        await broadcastNotification(message)
      }

      const successMessage = completionData.archiveEvent 
        ? 'Event completed and archived successfully!'
        : 'Event completed successfully!'
      alert(successMessage)
    } catch (error) {
      console.error('Error completing event:', error)
      throw error // Re-throw to let modal handle the error
    } finally {
      setLoading(null)
    }
  }

  // Send notification to all participants
  const broadcastNotification = async (message: string) => {
    setLoading('broadcast')
    
    try {
      // Get current user FID from the user context
      const userFid = farcasterProfile?.fid
      if (!userFid) {
        throw new Error('User not authenticated')
      }

      const response = await fetch(`/api/events/${event.id}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          title: `Event Update: ${event.title}`,
          userFid: userFid
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send notification')
      }

      alert('Notification sent to all participants')
    } catch (error) {
      console.error('Error sending notification:', error)
      alert('Failed to send notification')
    } finally {
      setLoading(null)
    }
  }

  // Quick stats
  const stats = {
    total: participants.length,
    attended: participants.filter(p => p.status === 'attended').length,
    confirmed: participants.filter(p => p.status === 'confirmed').length,
    no_show: participants.filter(p => p.status === 'no_show').length,
  }

  const attendanceRate = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Event Statistics</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Total Participants</span>
            <span className="text-lg font-medium text-white">{stats.total}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Attendance Rate</span>
            <span className="text-lg font-medium text-green-400">{attendanceRate}%</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2">
              <div className="text-green-300 font-medium">{stats.attended}</div>
              <div className="text-green-400">Present</div>
            </div>
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-2">
              <div className="text-blue-300 font-medium">{stats.confirmed}</div>
              <div className="text-blue-400">Confirmed</div>
            </div>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-2">
              <div className="text-red-300 font-medium">{stats.no_show}</div>
              <div className="text-red-400">No Show</div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Controls */}
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Event Controls</h3>
        
        <div className="space-y-3">
          {/* Complete Event */}
          <button
            onClick={() => setShowCompletionModal(true)}
            disabled={loading !== null}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {loading === 'completed' ? 'Completing...' : 'Complete Event'}
          </button>

          {/* Emergency Controls */}
          <div className="border-t border-gray-600 pt-3">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Emergency Controls</h4>
            
            <div className="space-y-2">
              <button
                onClick={() => setShowConfirmDialog('cancelled')}
                disabled={loading !== null}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading === 'cancelled' ? 'Cancelling...' : 'Cancel Event'}
              </button>
              
              <button
                onClick={() => {
                  const message = prompt('Enter message to broadcast to all participants:')
                  if (message) {
                    broadcastNotification(message)
                  }
                }}
                disabled={loading !== null}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading === 'broadcast' ? 'Sending...' : 'Broadcast Message'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        
        <div className="space-y-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <FaShare className="w-4 h-4" />
            <span>Share Results</span>
          </button>
          
          <button
            onClick={() => {
              if (event.chatId) {
                window.open(`/messages/${event.chatId}`, '_blank')
              } else {
                alert('No chat associated with this event')
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Open Event Chat
          </button>
          
          <button
            onClick={() => window.open(`/events/${event.id}`, '_blank')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            View Event Page
          </button>
        </div>
      </div>

      {/* Cancellation Confirmation Dialog */}
      {showConfirmDialog === 'cancelled' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Confirm Cancellation
            </h3>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to cancel this event? All participants will be notified.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateEventStatus('cancelled')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Completion Modal */}
      <EventCompletionModal
        event={event}
        participants={participants}
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onComplete={handleEventCompletion}
      />

      {/* Results Share Modal */}
      <ResultsShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        event={event}
        leaderboard={participants.map(p => ({
          profile: p.profile,
          placement: p.placement || 0,
          score: p.score || null,
          status: p.status
        }))}
        shareType="leaderboard"
      />
    </div>
  )
} 