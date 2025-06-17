import { NextResponse } from 'next/server'

/**
 * GET /api/test-scheduler
 * Manual test endpoint for the event scheduler
 * This is for development/testing only
 */
export async function GET() {
  try {
    // Check if we have the required environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        error: 'Service role key not configured',
        message: 'SUPABASE_SERVICE_ROLE_KEY environment variable is required',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    console.log('[Test Scheduler] Manually triggering scheduler...')
    
    // Dynamic import to avoid build-time initialization
    const { processScheduledStatusTransitions } = await import('@/lib/event-scheduler')
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