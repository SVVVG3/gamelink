import { createClient } from './client'
import type { Event, UpdateEventData } from '@/types'

const supabase = createClient()

// Status transition validation types and functions
export type EventStatus = 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled'

export interface StatusTransitionResult {
  isValid: boolean
  error?: string
}

// Define valid status transitions
const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  'draft': ['upcoming', 'cancelled'],
  'upcoming': ['live', 'cancelled'],
  'live': ['completed', 'cancelled'],
  'completed': [], // Cannot transition from completed
  'cancelled': [] // Cannot transition from cancelled
}

/**
 * Validates if a status transition is allowed
 */
export function validateStatusTransition(
  currentStatus: EventStatus, 
  newStatus: EventStatus
): StatusTransitionResult {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus]
  
  if (!allowedTransitions.includes(newStatus)) {
    return {
      isValid: false,
      error: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
    }
  }
  
  return { isValid: true }
}

/**
 * Validates time-based constraints for status transitions
 */
export function validateTimeBasedTransition(
  newStatus: EventStatus,
  startTime: string,
  endTime?: string
): StatusTransitionResult {
  const now = new Date()
  const eventStartTime = new Date(startTime)
  const eventEndTime = endTime ? new Date(endTime) : null

  switch (newStatus) {
    case 'live':
      // Allow starting event up to 30 minutes before start time or any time after
      const allowedStartTime = new Date(eventStartTime.getTime() - 30 * 60 * 1000) // 30 minutes before
      if (now < allowedStartTime) {
        return {
          isValid: false,
          error: `Event cannot be started yet. Event starts at ${eventStartTime.toLocaleString()}. You can start it 30 minutes before the scheduled time.`
        }
      }
      break

    case 'completed':
      // Allow completing event after start time
      if (now < eventStartTime) {
        return {
          isValid: false,
          error: 'Event cannot be completed before it has started'
        }
      }
      break

    case 'upcoming':
      // If transitioning back to upcoming (e.g., from draft), ensure start time is in future
      if (now >= eventStartTime) {
        return {
          isValid: false,
          error: 'Cannot set event to upcoming - start time must be in the future'
        }
      }
      break
  }

  return { isValid: true }
}

/**
 * Validates participant-based constraints for status transitions
 */
export async function validateParticipantBasedTransition(
  eventId: string,
  newStatus: EventStatus,
  minParticipants: number
): Promise<StatusTransitionResult> {
  if (newStatus === 'live') {
    try {
      // Check if minimum participants requirement is met
      const { data: participants, error } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .in('status', ['registered', 'confirmed'])

      if (error) {
        return {
          isValid: false,
          error: 'Unable to verify participant count'
        }
      }

      const participantCount = participants?.length || 0
      if (participantCount < minParticipants) {
        return {
          isValid: false,
          error: `Cannot start event - minimum ${minParticipants} participants required, but only ${participantCount} registered`
        }
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Error checking participant requirements'
      }
    }
  }

  return { isValid: true }
}

/**
 * Comprehensive status transition validation
 */
export async function validateEventStatusTransition(
  eventId: string,
  currentStatus: EventStatus,
  newStatus: EventStatus,
  startTime: string,
  endTime?: string,
  minParticipants: number = 1
): Promise<StatusTransitionResult> {
  // 1. Check basic transition rules
  const basicValidation = validateStatusTransition(currentStatus, newStatus)
  if (!basicValidation.isValid) {
    return basicValidation
  }

  // 2. Check time-based constraints
  const timeValidation = validateTimeBasedTransition(newStatus, startTime, endTime)
  if (!timeValidation.isValid) {
    return timeValidation
  }

  // 3. Check participant-based constraints
  const participantValidation = await validateParticipantBasedTransition(
    eventId, 
    newStatus, 
    minParticipants
  )
  if (!participantValidation.isValid) {
    return participantValidation
  }

  return { isValid: true }
}

export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) {
      console.error('Error fetching event:', error)
      return null
    }

    if (!event) {
      return null
    }

    // Transform database fields to match Event type
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      game: event.game,
      gamingPlatform: event.gaming_platform,
      eventType: event.event_type,
      skillLevel: event.skill_level,
      startTime: event.start_time,
      endTime: event.end_time,
      timezone: event.timezone,
      maxParticipants: event.max_participants,
      minParticipants: event.min_participants,
      requireApproval: event.require_approval,
      locationType: event.location_type,
      connectionDetails: event.connection_details,
      physicalLocation: event.physical_location,
      isPrivate: event.is_private,
      allowSpectators: event.allow_spectators,
      registrationDeadline: event.registration_deadline,
      status: event.status,
      createdBy: event.created_by,
      groupId: event.group_id,
      chatId: event.chat_id,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }
  } catch (error) {
    console.error('Error in getEventById:', error)
    return null
  }
}

export async function updateEvent(eventId: string, updateData: Partial<UpdateEventData>): Promise<Event | null> {
  try {
    // Transform the update data to match database field names
    const dbUpdateData: any = {}
    
    if (updateData.title !== undefined) dbUpdateData.title = updateData.title
    if (updateData.description !== undefined) dbUpdateData.description = updateData.description
    if (updateData.game !== undefined) dbUpdateData.game = updateData.game
    if (updateData.gamingPlatform !== undefined) dbUpdateData.gaming_platform = updateData.gamingPlatform
    if (updateData.eventType !== undefined) dbUpdateData.event_type = updateData.eventType
    if (updateData.skillLevel !== undefined) dbUpdateData.skill_level = updateData.skillLevel
    if (updateData.startTime !== undefined) dbUpdateData.start_time = updateData.startTime
    if (updateData.endTime !== undefined) dbUpdateData.end_time = updateData.endTime
    if (updateData.timezone !== undefined) dbUpdateData.timezone = updateData.timezone
    if (updateData.maxParticipants !== undefined) dbUpdateData.max_participants = updateData.maxParticipants
    if (updateData.minParticipants !== undefined) dbUpdateData.min_participants = updateData.minParticipants
    if (updateData.requireApproval !== undefined) dbUpdateData.require_approval = updateData.requireApproval
    if (updateData.locationType !== undefined) dbUpdateData.location_type = updateData.locationType
    if (updateData.connectionDetails !== undefined) dbUpdateData.connection_details = updateData.connectionDetails
    if (updateData.physicalLocation !== undefined) dbUpdateData.physical_location = updateData.physicalLocation
    if (updateData.isPrivate !== undefined) dbUpdateData.is_private = updateData.isPrivate
    if (updateData.allowSpectators !== undefined) dbUpdateData.allow_spectators = updateData.allowSpectators
    if (updateData.registrationDeadline !== undefined) dbUpdateData.registration_deadline = updateData.registrationDeadline
    if (updateData.status !== undefined) dbUpdateData.status = updateData.status

    // Add updated timestamp
    dbUpdateData.updated_at = new Date().toISOString()

    const { data: event, error } = await supabase
      .from('events')
      .update(dbUpdateData)
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      console.error('Error updating event:', error)
      throw new Error(`Failed to update event: ${error.message}`)
    }

    if (!event) {
      throw new Error('Event not found')
    }

    // Transform database fields to match Event type
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      game: event.game,
      gamingPlatform: event.gaming_platform,
      eventType: event.event_type,
      skillLevel: event.skill_level,
      startTime: event.start_time,
      endTime: event.end_time,
      timezone: event.timezone,
      maxParticipants: event.max_participants,
      minParticipants: event.min_participants,
      requireApproval: event.require_approval,
      locationType: event.location_type,
      connectionDetails: event.connection_details,
      physicalLocation: event.physical_location,
      isPrivate: event.is_private,
      allowSpectators: event.allow_spectators,
      registrationDeadline: event.registration_deadline,
      status: event.status,
      createdBy: event.created_by,
      groupId: event.group_id,
      chatId: event.chat_id,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }
  } catch (error) {
    console.error('Error in updateEvent:', error)
    throw error
  }
} 