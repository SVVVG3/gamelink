'use client'

import { useState } from 'react'
import { Event, EventParticipant } from '@/types'

interface EventControlsProps {
  event: Event
  participants: EventParticipant[]
  onEventUpdate: (event: Event) => void
}

export default function EventControls({ 
  event, 
  participants, 
  onEventUpdate 
}: EventControlsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null)

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

  // Send notification to all participants
  const broadcastNotification = async (message: string) => {
    setLoading('broadcast')
    
    try {
      const response = await fetch(`/api/events/${event.id}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          title: `Event Update: ${event.title}`
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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Statistics</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Participants</span>
            <span className="text-lg font-medium text-gray-900">{stats.total}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Attendance Rate</span>
            <span className="text-lg font-medium text-green-600">{attendanceRate}%</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-green-600 font-medium">{stats.attended}</div>
              <div className="text-green-500">Present</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="text-blue-600 font-medium">{stats.confirmed}</div>
              <div className="text-blue-500">Confirmed</div>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <div className="text-red-600 font-medium">{stats.no_show}</div>
              <div className="text-red-500">No Show</div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Controls</h3>
        
        <div className="space-y-3">
          {/* Complete Event */}
          <button
            onClick={() => setShowConfirmDialog('completed')}
            disabled={loading !== null}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {loading === 'completed' ? 'Completing...' : 'Complete Event'}
          </button>

          {/* Emergency Controls */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Emergency Controls</h4>
            
            <div className="space-y-2">
              <button
                onClick={() => setShowConfirmDialog('cancelled')}
                disabled={loading !== null}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading === 'broadcast' ? 'Sending...' : 'Broadcast Message'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="space-y-3">
          <button
            onClick={() => {
              if (event.chatId) {
                window.open(`/messages/${event.chatId}`, '_blank')
              } else {
                alert('No chat associated with this event')
              }
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Action
            </h3>
            
            <p className="text-gray-600 mb-6">
              {showConfirmDialog === 'completed' && 
                'Are you sure you want to complete this event? This action cannot be undone.'
              }
              {showConfirmDialog === 'cancelled' && 
                'Are you sure you want to cancel this event? All participants will be notified.'
              }
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateEventStatus(showConfirmDialog)}
                className={`flex-1 font-medium py-2 px-4 rounded-lg transition-colors ${
                  showConfirmDialog === 'completed'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 