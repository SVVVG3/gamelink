import { NextRequest, NextResponse } from 'next/server'
import { getGroupById } from '@/lib/supabase/groups'

interface RouteParams {
  params: Promise<{ groupId: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { groupId } = await params
    
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    console.log('🔍 API: Fetching group data for ID:', groupId)
    
    // Fetch group data with members to determine admin status
    const groupData = await getGroupById(groupId, true)
    
    if (!groupData) {
      console.log('🔍 API: Group not found:', groupId)
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    console.log('🔍 API: Successfully fetched group data:', {
      id: groupData.id,
      name: groupData.name,
      memberCount: groupData.members?.length || 0,
      createdBy: groupData.createdBy
    })
    
    return NextResponse.json(groupData)
  } catch (error) {
    console.error('🚨 API: Error fetching group:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group data' },
      { status: 500 }
    )
  }
} 