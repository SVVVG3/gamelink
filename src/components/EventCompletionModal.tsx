'use client'

import { useState, useEffect } from 'react'
import { FaCheckCircle, FaTimes, FaUsers, FaTrophy, FaEye, FaEyeSlash, FaDownload, FaShare, FaExclamationTriangle } from 'react-icons/fa'
import { Event, EventParticipant, Profile } from '@/types'
import { generateLeaderboardShareText } from '@/lib/achievements'

interface EventCompletionModalProps {
  event: Event
  participants: (EventParticipant & { profile: Profile })[]
  isOpen: boolean
  onClose: () => void
  onComplete: (completionData: EventCompletionData) => Promise<void>
}

interface EventCompletionData {
  resultsPublic: boolean
  notifyParticipants: boolean
  archiveEvent: boolean
  shareResults: boolean
  completionNotes?: string
}

interface CompletionChecklist {
  participantsMarked: boolean
  resultsRecorded: boolean
  scoresValidated: boolean
  noShowsMarked: boolean
}

export default function EventCompletionModal({ 
  event,
  participants,
  isOpen, 
  onClose, 
  onComplete 
}: EventCompletionModalProps) {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [completionData, setCompletionData] = useState<EventCompletionData>({
    resultsPublic: true,
    notifyParticipants: true,
    archiveEvent: true,
    shareResults: false,
    completionNotes: ''
  })

  // Calculate completion checklist
  const [checklist, setChecklist] = useState<CompletionChecklist>({
    participantsMarked: false,
    resultsRecorded: false,
    scoresValidated: false,
    noShowsMarked: false
  })

  useEffect(() => {
    if (isOpen && participants) {
      const attendedCount = participants.filter((p: EventParticipant & { profile: Profile }) => p.status === 'attended').length
      const noShowCount = participants.filter((p: EventParticipant & { profile: Profile }) => p.status === 'no_show').length
      const confirmedCount = participants.filter((p: EventParticipant & { profile: Profile }) => p.status === 'confirmed').length
      const scoredCount = participants.filter((p: EventParticipant & { profile: Profile }) => p.score !== null || p.placement !== null).length
      
      setChecklist({
        participantsMarked: attendedCount > 0 || noShowCount > 0,
        resultsRecorded: scoredCount > 0,
        scoresValidated: scoredCount === attendedCount,
        noShowsMarked: confirmedCount === 0 // All confirmed participants should be marked as attended or no-show
      })
    }
  }, [isOpen, participants])

  // Calculate event statistics
  const stats = {
    total: participants?.length || 0,
    attended: participants?.filter((p: EventParticipant & { profile: Profile }) => p.status === 'attended').length || 0,
    no_show: participants?.filter((p: EventParticipant & { profile: Profile }) => p.status === 'no_show').length || 0,
    scored: participants?.filter((p: EventParticipant & { profile: Profile }) => p.score !== null || p.placement !== null).length || 0,
    ranked: participants?.filter((p: EventParticipant & { profile: Profile }) => p.placement !== null).length || 0
  }

  const attendanceRate = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0

  const handleComplete = async () => {
    setLoading(true)
    try {
      console.log('🔍 EventCompletion: Starting event completion process...')
      console.log('🔍 EventCompletion: Original participants data:', participants.map(p => ({ 
        id: p.id, 
        username: p.profile?.username, 
        status: p.status, 
        score: p.score, 
        placement: p.placement 
      })))
      
      // Complete the event first
      await onComplete(completionData)
      console.log('🔍 EventCompletion: Event completion API call finished')
      
      // If sharing is enabled, fetch fresh participant data and share the results
      if (completionData.shareResults) {
        try {
          console.log('🔍 EventCompletion: Fetching fresh participant data after completion...')
          
          // Fetch fresh participant data with updated scores/placements
          const response = await fetch(`/api/events/${event.id}`)
          if (!response.ok) {
            throw new Error('Failed to fetch updated event data')
          }
          
          const eventData = await response.json()
          console.log('🔍 EventCompletion: Raw API response:', eventData)
          
          const freshParticipants: (EventParticipant & { profile: Profile })[] = eventData.event?.participants || eventData.participants || []
          
          console.log('🔍 EventCompletion: Fresh participants data:', freshParticipants.map(p => ({ 
            id: p.id, 
            username: p.profile?.username, 
            status: p.status, 
            score: p.score, 
            placement: p.placement 
          })))
          
          const attendedParticipants = freshParticipants.filter(p => p.status === 'attended')
          console.log('🔍 EventCompletion: Attended participants:', attendedParticipants.length, attendedParticipants.map(p => ({ username: p.profile?.username, placement: p.placement, score: p.score })))
          
          const topParticipants = attendedParticipants
            .filter(p => p.placement !== null)
            .sort((a, b) => (a.placement || 0) - (b.placement || 0))
            .slice(0, 3)
            .map(p => ({
              profile: p.profile,
              placement: p.placement || 0,
              score: p.score || null
            }))
          
          console.log('🔍 EventCompletion: Top participants:', topParticipants.length, topParticipants.map(p => ({ username: p.profile?.username, placement: p.placement, score: p.score })))
          
          // Generate the share text with properly formatted attendees
          const allAttendees = attendedParticipants.map(p => ({
            profile: p.profile,
            placement: p.placement || 0,
            score: p.score || null
          }))
          
          console.log('🔍 EventCompletion: All attendees:', allAttendees.length, allAttendees.map(p => ({ username: p.profile?.username, placement: p.placement, score: p.score })))
          
          const shareText = generateLeaderboardShareText(
            event, 
            topParticipants, 
            attendedParticipants.length,
            allAttendees
          )
          
          console.log('🔍 EventCompletion: Generated share text:', shareText)
          
          // Use Farcaster SDK for proper mini app sharing
          const baseUrl = window.location.origin
          const eventUrl = `${baseUrl}/events/${event.id}`
          
          // Try to use Farcaster SDK first (using the correct pattern)
          try {
            const { sdk } = await import('@farcaster/frame-sdk')
            
            // Check if we're in a Mini App context
            const context = await sdk.context
            if (context && context.client) {
              const result = await sdk.actions.composeCast({
                text: shareText,
                embeds: [eventUrl]
              })
              
              if (result?.cast) {
                console.log('✅ Results shared via Farcaster SDK:', result.cast.hash)
              }
              return
            }
          } catch (sdkError) {
            console.log('SDK not available, falling back to web composer:', sdkError)
          }
          
          // Fallback for standalone web app - open Farcaster web composer
          const farcasterUrl = `https://farcaster.xyz/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(eventUrl)}`
          if (typeof window !== 'undefined' && window.open) {
            window.open(farcasterUrl, '_blank')
            console.log('✅ Results shared via Farcaster web composer')
          }
        } catch (shareError) {
          console.error('Error sharing results:', shareError)
          // Don't fail the completion if sharing fails
        }
      }
      
      onClose()
    } catch (error) {
      console.error('Error completing event:', error)
      alert('Failed to complete event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const allChecklistComplete = Object.values(checklist).every(Boolean)
  const canProceed = currentStep === 1 ? allChecklistComplete : true

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <FaCheckCircle className="w-5 h-5 mr-2 text-green-400" />
                Complete Event
              </h2>
              <p className="text-gray-300 text-sm mt-1">{event.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center mt-4 space-x-2">
            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              1. Pre-Completion Check
            </div>
            <div className="w-8 h-px bg-gray-600"></div>
            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              2. Final Configuration
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Event Statistics */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Event Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                    <div className="text-blue-300 text-xl font-bold">{stats.total}</div>
                    <div className="text-blue-400 text-xs">Total</div>
                  </div>
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                    <div className="text-green-300 text-xl font-bold">{stats.attended}</div>
                    <div className="text-green-400 text-xs">Attended</div>
                  </div>
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                    <div className="text-red-300 text-xl font-bold">{stats.no_show}</div>
                    <div className="text-red-400 text-xs">No Show</div>
                  </div>
                  <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
                    <div className="text-purple-300 text-xl font-bold">{attendanceRate}%</div>
                    <div className="text-purple-400 text-xs">Attendance</div>
                  </div>
                </div>
                
                {stats.scored > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                        <div className="text-yellow-300 text-xl font-bold">{stats.scored}</div>
                        <div className="text-yellow-400 text-xs">Scored</div>
                      </div>
                      <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-3">
                        <div className="text-orange-300 text-xl font-bold">{stats.ranked}</div>
                        <div className="text-orange-400 text-xs">Ranked</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Completion Checklist */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Pre-Completion Checklist</h3>
                
                <div className="space-y-2">
                  <div className={`flex items-center p-3 rounded-lg border ${
                    checklist.participantsMarked 
                      ? 'bg-green-900/20 border-green-700' 
                      : 'bg-red-900/20 border-red-700'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                      checklist.participantsMarked ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {checklist.participantsMarked ? (
                        <FaCheckCircle className="w-3 h-3 text-white" />
                      ) : (
                        <FaTimes className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">Participants Status Marked</div>
                      <div className="text-gray-400 text-sm">
                        {checklist.participantsMarked 
                          ? `${stats.attended} attended, ${stats.no_show} no-shows marked`
                          : 'Mark participants as attended or no-show'
                        }
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center p-3 rounded-lg border ${
                    checklist.resultsRecorded 
                      ? 'bg-green-900/20 border-green-700' 
                      : 'bg-yellow-900/20 border-yellow-700'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                      checklist.resultsRecorded ? 'bg-green-600' : 'bg-yellow-600'
                    }`}>
                      {checklist.resultsRecorded ? (
                        <FaCheckCircle className="w-3 h-3 text-white" />
                      ) : (
                        <FaTrophy className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">Results Recorded</div>
                      <div className="text-gray-400 text-sm">
                        {checklist.resultsRecorded 
                          ? `${stats.scored} participants have scores or placements`
                          : 'Optional: Record scores and placements for participants'
                        }
                      </div>
                    </div>
                  </div>

                  {stats.scored > 0 && (
                    <div className={`flex items-center p-3 rounded-lg border ${
                      checklist.scoresValidated 
                        ? 'bg-green-900/20 border-green-700' 
                        : 'bg-yellow-900/20 border-yellow-700'
                    }`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                        checklist.scoresValidated ? 'bg-green-600' : 'bg-yellow-600'
                      }`}>
                        {checklist.scoresValidated ? (
                          <FaCheckCircle className="w-3 h-3 text-white" />
                        ) : (
                          <FaExclamationTriangle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">Scores Validated</div>
                        <div className="text-gray-400 text-sm">
                          {checklist.scoresValidated 
                            ? 'All attended participants have been scored'
                            : `${stats.attended - stats.scored} attended participants missing scores`
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!allChecklistComplete && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-start">
                    <FaExclamationTriangle className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-yellow-300 font-medium">Action Required</div>
                      <div className="text-yellow-200 text-sm mt-1">
                        Please complete the checklist items above before proceeding. 
                        You can return to the Live Dashboard to mark participant attendance and record results.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Final Configuration</h3>
              
              {/* Results Publication Options */}
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Results Publication</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={completionData.resultsPublic}
                        onChange={(e) => setCompletionData(prev => ({ ...prev, resultsPublic: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                        completionData.resultsPublic ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
                      }`}>
                        {completionData.resultsPublic && <FaCheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium flex items-center">
                          <FaEye className="w-4 h-4 mr-2" />
                          Make Results Public
                        </div>
                        <div className="text-gray-400 text-sm">
                          Results will be visible to all participants and spectators
                        </div>
                      </div>
                    </label>

                    {!completionData.resultsPublic && (
                      <div className="ml-8 text-sm text-gray-400 flex items-center">
                        <FaEyeSlash className="w-4 h-4 mr-2" />
                        Results will only be visible to organizers
                      </div>
                    )}
                  </div>
                </div>

                {/* Notification Options */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Notifications</h4>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completionData.notifyParticipants}
                      onChange={(e) => setCompletionData(prev => ({ ...prev, notifyParticipants: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                      completionData.notifyParticipants ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
                    }`}>
                      {completionData.notifyParticipants && <FaCheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">Notify Participants</div>
                      <div className="text-gray-400 text-sm">
                        Send completion notification to all participants
                      </div>
                    </div>
                  </label>
                </div>

                {/* Archive Options */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Archival</h4>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completionData.archiveEvent}
                      onChange={(e) => setCompletionData(prev => ({ ...prev, archiveEvent: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                      completionData.archiveEvent ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
                    }`}>
                      {completionData.archiveEvent && <FaCheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">Add to Event Archive</div>
                      <div className="text-gray-400 text-sm">
                        Event will be searchable in completed events archive
                      </div>
                    </div>
                  </label>
                </div>

                {/* Results Sharing */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Social Sharing</h4>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completionData.shareResults}
                      onChange={(e) => setCompletionData(prev => ({ ...prev, shareResults: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                      completionData.shareResults ? 'bg-purple-600 border-purple-600' : 'border-gray-600'
                    }`}>
                      {completionData.shareResults && <FaCheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium flex items-center">
                        <FaShare className="w-4 h-4 mr-2" />
                        Share Results on Farcaster
                      </div>
                      <div className="text-gray-400 text-sm">
                        Post leaderboard with top 3 winners and thank all participants
                      </div>
                    </div>
                  </label>
                </div>

                {/* Completion Notes */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Completion Notes (Optional)</h4>
                  <textarea
                    value={completionData.completionNotes}
                    onChange={(e) => setCompletionData(prev => ({ ...prev, completionNotes: e.target.value }))}
                    placeholder="Add any final notes about the event..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t border-gray-700 bg-gray-800">
          {currentStep === 2 && (
            <div className="text-sm text-gray-400 mb-4 text-center">
              Review settings and complete the event
            </div>
          )}
          
          <div className="flex items-center justify-between">
            {currentStep === 1 && (
              <div className="text-sm text-gray-400">
                Complete the checklist to proceed
              </div>
            )}
            {currentStep === 2 && <div></div>}
            
            <div className="flex space-x-3">
              {currentStep === 2 && (
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
                >
                  Back
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              
              {currentStep === 1 && (
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceed}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    canProceed
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
              )}
              
              {currentStep === 2 && (
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  {loading ? 'Completing...' : 'Complete Event'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 