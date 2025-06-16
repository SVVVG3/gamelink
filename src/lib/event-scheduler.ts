import { createClient } from '@supabase/supabase-js'
import { sendEventReminderNotification, sendEventStatusChangeNotification } from './notifications'

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
    remindersSent: number
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
      remindersSent: 0,
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
    
    // Find events that need reminders
    const eventsFor24hReminder = await findEventsNeedingReminder(now, '24h')
    const eventsFor1hReminder = await findEventsNeedingReminder(now, '1h')
    const eventsForStartingReminder = await findEventsNeedingReminder(now, 'starting')
    console.log(`[Event Scheduler] Found ${eventsFor24hReminder.length} events for 24h reminder, ${eventsFor1hReminder.length} for 1h reminder, ${eventsForStartingReminder.length} for starting reminder`)
    
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
    
    // Process event reminders
    const allReminderEvents = [
      ...eventsFor24hReminder.map((e: any) => ({ ...e, reminderType: '24h' as const })),
      ...eventsFor1hReminder.map((e: any) => ({ ...e, reminderType: '1h' as const })),
      ...eventsForStartingReminder.map((e: any) => ({ ...e, reminderType: 'starting' as const }))
    ]
    
    for (const event of allReminderEvents) {
      try {
        await sendEventReminderNotification(event.id, event.reminderType)
        result.details.remindersSent++
        console.log(`[Event Scheduler] Sent ${event.reminderType} reminder for event ${event.id}`)
      } catch (error) {
        const errorMsg = `Failed to send ${event.reminderType} reminder for event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        result.details.failed++
        console.error(`[Event Scheduler] ${errorMsg}`)
      }
    }
    
    result.processed = result.details.transitionedToLive + result.details.transitionedToCompleted + result.details.remindersSent + result.details.failed
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
  
  // Send status change notification to participants
  try {
    await sendEventStatusChangeNotification(eventId, 'live', 'upcoming')
  } catch (error) {
    console.error(`[Event Scheduler] Failed to send status change notification for event ${eventId}:`, error)
    // Don't throw error - status transition succeeded, notification failure is not critical
  }
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
  
  // Send status change notification to participants
  try {
    await sendEventStatusChangeNotification(eventId, 'completed', 'live')
  } catch (error) {
    console.error(`[Event Scheduler] Failed to send status change notification for event ${eventId}:`, error)
    // Don't throw error - status transition succeeded, notification failure is not critical
  }
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
 * Find events that need reminders sent
 */
async function findEventsNeedingReminder(currentTime: Date, reminderType: '24h' | '1h' | 'starting') {
  let timeCondition: Date
  
  switch (reminderType) {
    case '24h':
      // Events starting in 24 hours (±5 minutes window)
      timeCondition = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000)
      break
    case '1h':
      // Events starting in 1 hour (±5 minutes window)
      timeCondition = new Date(currentTime.getTime() + 60 * 60 * 1000)
      break
    case 'starting':
      // Events starting now (±2 minutes window)
      timeCondition = currentTime
      break
    default:
      throw new Error(`Invalid reminder type: ${reminderType}`)
  }
  
  // Create a 5-minute window around the target time (2 minutes for 'starting')
  const windowMinutes = reminderType === 'starting' ? 2 : 5
  const startWindow = new Date(timeCondition.getTime() - windowMinutes * 60 * 1000)
  const endWindow = new Date(timeCondition.getTime() + windowMinutes * 60 * 1000)
  
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, title, start_time, status')
    .eq('status', 'upcoming')
    .gte('start_time', startWindow.toISOString())
    .lte('start_time', endWindow.toISOString())
    .order('start_time', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch events for ${reminderType} reminder: ${error.message}`)
  }
  
  return data || []
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