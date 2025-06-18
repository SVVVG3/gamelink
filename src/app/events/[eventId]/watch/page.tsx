'use client'

import { Suspense } from 'react'
import SpectatorView from './SpectatorView'

interface PageProps {
  params: Promise<{ eventId: string }>
}

export default async function WatchEventPage({ params }: PageProps) {
  const { eventId } = await params

  return (
    <div className="min-h-screen bg-gray-900">
      <Suspense fallback={<SpectatorViewSkeleton />}>
        <SpectatorView eventId={eventId} />
      </Suspense>
    </div>
  )
}

function SpectatorViewSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 p-4 space-y-6">
      {/* Header Skeleton */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>

      {/* Timer Skeleton */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/4"></div>
          <div className="h-12 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>

      {/* Leaderboard Skeleton */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                </div>
                <div className="h-6 w-16 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 