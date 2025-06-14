import { Suspense } from 'react'
import EditGroupClient from './EditGroupClient'

interface Props {
  params: Promise<{ groupId: string }>
}

export default function EditGroupPage({ params }: Props) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading group editor...</p>
        </div>
      </div>
    }>
      <EditGroupClient params={params} />
    </Suspense>
  )
} 