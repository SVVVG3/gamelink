import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserNotificationPreferences, createDefaultNotificationPreferences } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userFid = url.searchParams.get('userFid')
    
    if (!userFid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 400 }
      )
    }

    console.log(`📱 Getting notification preferences for FID: ${userFid}`)
    
    const preferences = await getUserNotificationPreferences(parseInt(userFid))
    
    if (!preferences) {
      // Create default preferences if none exist
      const defaultPrefs = await createDefaultNotificationPreferences(parseInt(userFid))
      return NextResponse.json({
        preferences: defaultPrefs || {
          user_fid: parseInt(userFid),
          messages_enabled: true,
          group_invites_enabled: true,
          events_enabled: true,
          groups_enabled: true
        }
      })
    }
    
    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('Error getting notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userFid, preferences } = await request.json()
    
    if (!userFid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 400 }
      )
    }

    console.log(`📱 Updating notification preferences for FID: ${userFid}`, preferences)
    
    const supabase = await createClient()
    
    // Verify the user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fid')
      .eq('fid', userFid)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Update or create preferences
    const { data: updatedPrefs, error: updateError } = await supabase
      .from('notification_preferences')
      .upsert({
        user_fid: userFid,
        messages_enabled: preferences.messages_enabled ?? true,
        group_invites_enabled: preferences.group_invites_enabled ?? true,
        events_enabled: preferences.events_enabled ?? true,
        groups_enabled: preferences.groups_enabled ?? true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_fid'
      })
      .select()
      .single()

    if (updateError) {
      console.error('Error updating notification preferences:', updateError)
      return NextResponse.json(
        { error: 'Failed to update preferences', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ Notification preferences updated successfully')
    
    return NextResponse.json({
      success: true,
      preferences: updatedPrefs,
      message: 'Notification preferences updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 