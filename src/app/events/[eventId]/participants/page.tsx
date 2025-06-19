import { Suspense } from 'react'
import ParticipantsClient from './ParticipantsClient'

interface Props {
  params: Promise<{ eventId: string }>
}

export default async function EventParticipantsPage({ params }: Props) {
  const { eventId } = await params

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    }>
      <ParticipantsClient eventId={eventId} />
    </Suspense>
  )
} 