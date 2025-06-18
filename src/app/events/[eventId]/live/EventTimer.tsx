'use client'

import { useState, useEffect } from 'react'
import { Event } from '@/types'

interface EventTimerProps {
  event: Event
}

export default function EventTimer({ event }: EventTimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const startTime = new Date(event.startTime)
  const endTime = event.endTime ? new Date(event.endTime) : null
  const timeElapsed = Math.max(0, currentTime.getTime() - startTime.getTime())
  const totalDuration = endTime ? endTime.getTime() - startTime.getTime() : null
  
  // Calculate progress percentage
  const progressPercentage = totalDuration 
    ? Math.min(100, (timeElapsed / totalDuration) * 100)
    : 0

  // Format time display
  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  // Calculate time remaining
  const timeRemaining = endTime ? Math.max(0, endTime.getTime() - currentTime.getTime()) : null

  return (
    <div className="space-y-4">
      {/* Event Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-medium">LIVE</span>
          </div>
          <div className="text-gray-300">
            Started {formatDuration(timeElapsed)} ago
          </div>
        </div>
        
        {timeRemaining && timeRemaining > 0 && (
          <div className="text-gray-300">
            {formatDuration(timeRemaining)} remaining
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {totalDuration && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-300">
            <span>Event Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Time Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
          <div className="text-gray-400 font-medium">Started At</div>
          <div className="text-white">
            {startTime.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              timeZoneName: 'short'
            })}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
          <div className="text-gray-400 font-medium">Duration</div>
          <div className="text-white">
            {formatDuration(timeElapsed)}
          </div>
        </div>
        
        {endTime && (
          <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
            <div className="text-gray-400 font-medium">
              {timeRemaining && timeRemaining > 0 ? 'Ends In' : 'Ended At'}
            </div>
            <div className="text-white">
              {timeRemaining && timeRemaining > 0 
                ? formatDuration(timeRemaining)
                : endTime.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 