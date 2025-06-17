import { NextRequest, NextResponse } from 'next/server'
import { processScheduledStatusTransitions, schedulerHealthCheck } from '@/lib/event-scheduler'

/**
 * GET /api/scheduler/status-transitions
 * Processes scheduled event status transitions
 * This endpoint is designed to be called by Vercel cron job (which uses GET)
 */
export async function GET(request: NextRequest) {
  try {
    // Log all incoming requests to help debug cron execution
    const userAgent = request.headers.get('user-agent')
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    console.log('[Scheduler API] Received GET request:', {
      userAgent,
      hasAuthHeader: !!authHeader,
      hasCronSecret: !!cronSecret,
      timestamp: new Date().toISOString()
    })
    
    // Temporarily disable CRON_SECRET check for debugging
    // TODO: Re-enable this after confirming Vercel cron is working
    /*
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Scheduler API] Unauthorized cron request - auth header:', authHeader)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    */
    
    console.log('[Scheduler API] Processing scheduled status transitions...')
    
    // Process the status transitions
    const result = await processScheduledStatusTransitions()
    
    // Log the results
    console.log('[Scheduler API] Scheduler completed:', {
      success: result.success,
      processed: result.processed,
      details: result.details,
      errorCount: result.errors.length
    })
    
    // Return appropriate status code based on results
    const statusCode = result.success ? 200 : 207 // 207 = Multi-Status (partial success)
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'All status transitions processed successfully'
        : 'Some status transitions failed',
      processed: result.processed,
      details: result.details,
      errors: result.errors,
      timestamp: new Date().toISOString()
    }, { status: statusCode })
    
  } catch (error) {
    console.error('[Scheduler API] Unexpected error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * POST /api/scheduler/status-transitions
 * Health check endpoint for manual testing
 */
export async function POST() {
  try {
    const healthCheck = await schedulerHealthCheck()
    
    return NextResponse.json({
      healthy: healthCheck.healthy,
      message: healthCheck.message,
      timestamp: new Date().toISOString(),
      service: 'event-scheduler',
      note: 'This is a health check endpoint. The actual scheduler runs on GET requests.'
    }, { 
      status: healthCheck.healthy ? 200 : 503 
    })
    
  } catch (error) {
    console.error('[Scheduler API] Health check failed:', error)
    
    return NextResponse.json({
      healthy: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      service: 'event-scheduler'
    }, { status: 503 })
  }
} 