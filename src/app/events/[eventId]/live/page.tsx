import { Suspense } from 'react'
import LiveEventDashboard from './LiveEventDashboard'

interface LiveEventPageProps {
  params: Promise<{
    eventId: string
  }>
}

export default async function LiveEventPage({ params }: LiveEventPageProps) {
  const resolvedParams = await params
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<LiveEventDashboardSkeleton />}>
        <LiveEventDashboard eventId={resolvedParams.eventId} />
      </Suspense>
    </div>
  )
}

function LiveEventDashboardSkeleton() {
  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 