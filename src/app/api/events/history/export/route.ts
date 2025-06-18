import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const format = url.searchParams.get('format') || 'json'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format. Use csv or json' }, { status: 400 })
    }

    // Fetch user's event participation history
    const { data: participations, error: participationError } = await supabase
      .from('event_participants')
      .select(`
        *,
        events:event_id (
          id,
          title,
          description,
          game,
          gaming_platform,
          event_type,
          skill_level,
          start_time,
          end_time,
          timezone,
          max_participants,
          min_participants,
          location_type,
          status,
          created_by
        )
      `)
      .eq('user_id', userId)
      .order('registered_at', { ascending: false })

    if (participationError) {
      console.error('Error fetching participations:', participationError)
      return NextResponse.json({ error: 'Failed to fetch event history' }, { status: 500 })
    }

    if (!participations || participations.length === 0) {
      if (format === 'csv') {
        return new NextResponse('No data available', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="event-history.csv"'
          }
        })
      } else {
        return NextResponse.json({ events: [], message: 'No data available' })
      }
    }

    // Transform data for export
    const exportData = participations.map(participation => ({
      eventId: participation.event_id,
      eventTitle: participation.events?.title || 'Unknown Event',
      eventGame: participation.events?.game || 'Unknown Game',
      eventType: participation.events?.event_type || 'Unknown Type',
      eventStatus: participation.events?.status || 'Unknown Status',
      participationStatus: participation.status,
      role: participation.role,
      score: participation.score,
      placement: participation.placement,
      registeredAt: participation.registered_at,
      eventStartTime: participation.events?.start_time,
      eventEndTime: participation.events?.end_time,
      skillLevel: participation.events?.skill_level,
      gamingPlatform: participation.events?.gaming_platform,
      maxParticipants: participation.events?.max_participants,
      locationType: participation.events?.location_type
    }))

    if (format === 'csv') {
      const csv = convertToCSV(exportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="event-history.csv"'
        }
      })
    } else {
      return NextResponse.json({
        events: exportData,
        exportedAt: new Date().toISOString(),
        totalEvents: exportData.length
      })
    }

  } catch (error) {
    console.error('Error in event history export API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  // Get headers from the first object
  const headers = Object.keys(data[0])
  
  // Create CSV header row
  const csvHeaders = headers.join(',')
  
  // Create CSV data rows
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      // Handle null/undefined values and escape commas/quotes
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      // Escape quotes and wrap in quotes if contains comma or quote
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  )
  
  return [csvHeaders, ...csvRows].join('\n')
} 