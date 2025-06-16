import { NextRequest, NextResponse } from 'next/server'
import { sendEventReminderNotification, sendEventStatusChangeNotification } from '@/lib/notifications'

/**
 * GET /api/test-reminder?eventId=xxx&type=24h|1h|starting|status&newStatus=live|completed|cancelled
 * Manual test endpoint for event reminder and status change notifications
 * This is for development/testing only
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const type = searchParams.get('type')
    const newStatus = searchParams.get('newStatus')
    const oldStatus = searchParams.get('oldStatus')
    
    if (!eventId) {
      return NextResponse.json({
        error: 'eventId parameter is required',
        usage: 'GET /api/test-reminder?eventId=xxx&type=24h|1h|starting|status&newStatus=live|completed|cancelled'
      }, { status: 400 })
    }
    
    if (!type) {
      return NextResponse.json({
        error: 'type parameter is required',
        usage: 'GET /api/test-reminder?eventId=xxx&type=24h|1h|starting|status&newStatus=live|completed|cancelled'
      }, { status: 400 })
    }
    
    console.log(`[Test Reminder] Testing ${type} notification for event ${eventId}`)
    
    let result
    
    if (type === 'status') {
      if (!newStatus) {
        return NextResponse.json({
          error: 'newStatus parameter is required for status type',
          usage: 'GET /api/test-reminder?eventId=xxx&type=status&newStatus=live|completed|cancelled&oldStatus=upcoming'
        }, { status: 400 })
      }
      
      result = await sendEventStatusChangeNotification(eventId, newStatus, oldStatus || undefined)
    } else if (['24h', '1h', 'starting'].includes(type)) {
      result = await sendEventReminderNotification(eventId, type as '24h' | '1h' | 'starting')
    } else {
      return NextResponse.json({
        error: 'Invalid type parameter',
        validTypes: ['24h', '1h', 'starting', 'status'],
        usage: 'GET /api/test-reminder?eventId=xxx&type=24h|1h|starting|status&newStatus=live|completed|cancelled'
      }, { status: 400 })
    }
    
    return NextResponse.json({
      message: `${type} notification test completed`,
      eventId,
      type,
      ...(newStatus && { newStatus, oldStatus }),
      result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Test Reminder] Error:', error)
    
    return NextResponse.json({
      error: 'Reminder test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 