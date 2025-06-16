import { createClient } from '@supabase/supabase-js'

// Create a service role client for background operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export interface SchedulerResult {
  success: boolean
  processed: number
  errors: string[]
  details: {
    transitionedToLive: number
    transitionedToCompleted: number
    failed: number
  }
}

/**
 * Process all events that need automatic status transitions
 * This function should be called by a scheduled job (cron)
 */
export async function processScheduledStatusTransitions(): Promise<SchedulerResult> {
  const result: SchedulerResult = {
    success: true,
    processed: 0,
    errors: [],
    details: {
      transitionedToLive: 0,
      transitionedToCompleted: 0,
      failed: 0
    }
  }

  try {
    console.log('[Event Scheduler] Starting scheduled status transitions...')
    
    // Get current time with buffer for processing delays
    const now = new Date()
    const bufferMinutes = 2 // 2-minute buffer for processing delays
    const nowWithBuffer = new Date(now.getTime() - bufferMinutes * 60 * 1000)
    
    // Find events that need to transition to 'live'
    const eventsToStart = await findEventsToStart(nowWithBuffer)
    console.log(`[Event Scheduler] Found ${eventsToStart.length} events to start`)
    
    // Find events that need to transition to 'completed'
    const eventsToComplete = await findEventsToComplete(nowWithBuffer)
    console.log(`[Event Scheduler] Found ${eventsToComplete.length} events to complete`)
    
    // Process transitions to 'live'
    for (const event of eventsToStart) {
      try {
        await transitionEventToLive(event.id)
        result.details.transitionedToLive++
        console.log(`[Event Scheduler] Transitioned event ${event.id} to live`)
      } catch (error) {
        const errorMsg = `Failed to start event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        result.details.failed++
        console.error(`[Event Scheduler] ${errorMsg}`)
      }
    }
    
    // Process transitions to 'completed'
    for (const event of eventsToComplete) {
      try {
        await transitionEventToCompleted(event.id)
        result.details.transitionedToCompleted++
        console.log(`[Event Scheduler] Transitioned event ${event.id} to completed`)
      } catch (error) {
        const errorMsg = `Failed to complete event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        result.details.failed++
        console.error(`[Event Scheduler] ${errorMsg}`)
      }
    }
    
    result.processed = result.details.transitionedToLive + result.details.transitionedToCompleted + result.details.failed
    result.success = result.errors.length === 0
    
    console.log(`[Event Scheduler] Completed processing. Results:`, result.details)
    
    return result
    
  } catch (error) {
    const errorMsg = `Scheduler failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`[Event Scheduler] ${errorMsg}`)
    result.errors.push(errorMsg)
    result.success = false
    return result
  }
}

/**
 * Find events that should transition from 'upcoming' to 'live'
 */
async function findEventsToStart(currentTime: Date) {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, title, start_time, status')
    .eq('status', 'upcoming')
    .lte('start_time', currentTime.toISOString())
    .order('start_time', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch events to start: ${error.message}`)
  }
  
  return data || []
}

/**
 * Find events that should transition from 'live' to 'completed'
 */
async function findEventsToComplete(currentTime: Date) {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, title, end_time, status')
    .eq('status', 'live')
    .lte('end_time', currentTime.toISOString())
    .order('end_time', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch events to complete: ${error.message}`)
  }
  
  return data || []
}

/**
 * Transition an event from 'upcoming' to 'live'
 */
async function transitionEventToLive(eventId: string) {
  const { error } = await supabaseAdmin
    .from('events')
    .update({ 
      status: 'live',
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .eq('status', 'upcoming') // Ensure it's still in the expected state
  
  if (error) {
    throw new Error(`Failed to transition event to live: ${error.message}`)
  }
  
  // Auto-confirm registered participants when event starts
  await autoConfirmParticipants(eventId)
}

/**
 * Transition an event from 'live' to 'completed'
 */
async function transitionEventToCompleted(eventId: string) {
  const { error } = await supabaseAdmin
    .from('events')
    .update({ 
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .eq('status', 'live') // Ensure it's still in the expected state
  
  if (error) {
    throw new Error(`Failed to transition event to completed: ${error.message}`)
  }
  
  // Mark no-shows after event completion (with grace period)
  await markNoShows(eventId)
}

/**
 * Auto-confirm registered participants when event starts
 * This implements Task 2.3 requirement
 */
async function autoConfirmParticipants(eventId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('event_participants')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('event_id', eventId)
      .eq('status', 'registered')
    
    if (error) {
      console.error(`[Event Scheduler] Failed to auto-confirm participants for event ${eventId}:`, error.message)
    } else {
      console.log(`[Event Scheduler] Auto-confirmed registered participants for event ${eventId}`)
    }
  } catch (error) {
    console.error(`[Event Scheduler] Error auto-confirming participants for event ${eventId}:`, error)
  }
}

/**
 * Mark no-shows after event completion
 * This implements Task 2.3 requirement with configurable grace period
 */
async function markNoShows(eventId: string, gracePeriodMinutes: number = 15) {
  try {
    // Only mark as no-show if they were confirmed but never marked as attended
    // and the grace period has passed
    const graceTime = new Date(Date.now() - gracePeriodMinutes * 60 * 1000)
    
    const { error } = await supabaseAdmin
      .from('event_participants')
      .update({ 
        status: 'no_show',
        updated_at: new Date().toISOString()
      })
      .eq('event_id', eventId)
      .in('status', ['registered', 'confirmed'])
      .lt('updated_at', graceTime.toISOString())
    
    if (error) {
      console.error(`[Event Scheduler] Failed to mark no-shows for event ${eventId}:`, error.message)
    } else {
      console.log(`[Event Scheduler] Marked no-shows for event ${eventId} (grace period: ${gracePeriodMinutes} minutes)`)
    }
  } catch (error) {
    console.error(`[Event Scheduler] Error marking no-shows for event ${eventId}:`, error)
  }
}

/**
 * Health check function to verify scheduler is working
 */
export async function schedulerHealthCheck(): Promise<{ healthy: boolean; message: string }> {
  try {
    // Test database connection
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('count')
      .limit(1)
    
    if (error) {
      return { healthy: false, message: `Database connection failed: ${error.message}` }
    }
    
    return { healthy: true, message: 'Scheduler is healthy and database is accessible' }
  } catch (error) {
    return { 
      healthy: false, 
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
} 