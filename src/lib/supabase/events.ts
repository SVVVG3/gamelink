import { createClient } from './client'
import type { Event, UpdateEventData } from '@/types'

const supabase = createClient()

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
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }
  } catch (error) {
    console.error('Error in updateEvent:', error)
    throw error
  }
} 