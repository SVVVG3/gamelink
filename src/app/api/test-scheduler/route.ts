import { NextResponse } from 'next/server'
import { processScheduledStatusTransitions } from '@/lib/event-scheduler'

/**
 * GET /api/test-scheduler
 * Manual test endpoint for the event scheduler
 * This is for development/testing only
 */
export async function GET() {
  try {
    console.log('[Test Scheduler] Manually triggering scheduler...')
    
    const result = await processScheduledStatusTransitions()
    
    return NextResponse.json({
      message: 'Scheduler test completed',
      result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Test Scheduler] Error:', error)
    
    return NextResponse.json({
      error: 'Scheduler test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 