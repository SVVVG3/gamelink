import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
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
          require_approval,
          location_type,
          connection_details,
          physical_location,
          is_private,
          allow_spectators,
          registration_deadline,
          status,
          created_by,
          group_id,
          chat_id,
          created_at,
          updated_at
        ),
        profile:user_id (
          id,
          username,
          display_name,
          bio,
          pfp_url,
          fid,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('registered_at', { ascending: false })

    if (participationError) {
      console.error('Error fetching participations:', participationError)
      return NextResponse.json({ error: 'Failed to fetch event history' }, { status: 500 })
    }

    // Get participant counts for each event
    const eventIds = participations?.map(p => p.event_id) || []
    
    const { data: participantCounts, error: countError } = await supabase
      .from('event_participants')
      .select('event_id')
      .in('event_id', eventIds)
      .in('status', ['registered', 'confirmed', 'attended'])

    if (countError) {
      console.error('Error fetching participant counts:', countError)
    }

    // Calculate participant counts by event
    const eventParticipantCounts = participantCounts?.reduce((acc, p) => {
      acc[p.event_id] = (acc[p.event_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Transform data for frontend
    const events = participations?.map(participation => ({
      ...participation.events,
      participation: {
        ...participation,
        profile: participation.profile
      },
      participantCount: eventParticipantCounts[participation.event_id] || 0
    })) || []

    // Calculate user statistics
    const statistics = calculateUserStatistics(participations || [])
    
    // Calculate performance trends
    const trends = calculatePerformanceTrends(participations || [])
    
    // Calculate achievements
    const achievements = calculateAchievements(participations || [], statistics)

    return NextResponse.json({
      events,
      statistics,
      trends,
      achievements
    })

  } catch (error) {
    console.error('Error in event history API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateUserStatistics(participations: any[]): any {
  const totalEvents = participations.length
  const eventsAttended = participations.filter(p => p.status === 'attended').length
  const eventsOrganized = participations.filter(p => p.role === 'organizer').length
  const eventsWon = participations.filter(p => p.placement === 1).length
  
  const scoredEvents = participations.filter(p => p.score !== null)
  const averageScore = scoredEvents.length > 0 
    ? Math.round(scoredEvents.reduce((sum, p) => sum + (p.score || 0), 0) / scoredEvents.length)
    : 0

  const rankedEvents = participations.filter(p => p.placement !== null)
  const averagePlacement = rankedEvents.length > 0
    ? Math.round(rankedEvents.reduce((sum, p) => sum + (p.placement || 0), 0) / rankedEvents.length)
    : 0

  const attendanceRate = totalEvents > 0 ? Math.round((eventsAttended / totalEvents) * 100) : 0

  // Calculate favorite game
  const gameCount = participations.reduce((acc, p) => {
    if (p.events?.game) {
      acc[p.events.game] = (acc[p.events.game] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const favoriteGame = Object.keys(gameCount).reduce((a, b) => 
    gameCount[a] > gameCount[b] ? a : b, '')

  const totalScore = scoredEvents.reduce((sum, p) => sum + (p.score || 0), 0)
  const bestPlacement = rankedEvents.length > 0 
    ? Math.min(...rankedEvents.map(p => p.placement))
    : 0

  // Calculate streaks (simplified - consecutive attended events)
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0

  const sortedParticipations = [...participations]
    .sort((a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime())

  for (const participation of sortedParticipations) {
    if (participation.status === 'attended') {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 0
    }
  }

  // Current streak from most recent events
  for (let i = participations.length - 1; i >= 0; i--) {
    if (participations[i].status === 'attended') {
      currentStreak++
    } else {
      break
    }
  }

  return {
    totalEvents,
    eventsAttended,
    eventsOrganized,
    eventsWon,
    averageScore,
    averagePlacement,
    attendanceRate,
    favoriteGame,
    totalScore,
    bestPlacement,
    currentStreak,
    longestStreak
  }
}

function calculatePerformanceTrends(participations: any[]): any {
  const scoreHistory = participations
    .filter(p => p.score !== null && p.events)
    .map(p => ({
      date: p.events.start_time,
      score: p.score,
      event: p.events.title
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const placementHistory = participations
    .filter(p => p.placement !== null && p.events)
    .map(p => ({
      date: p.events.start_time,
      placement: p.placement,
      event: p.events.title
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calculate monthly attendance
  const attendanceByMonth = participations.reduce((acc, p) => {
    if (p.events?.start_time) {
      const month = new Date(p.events.start_time).toISOString().slice(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = { registered: 0, attended: 0 }
      }
      acc[month].registered++
      if (p.status === 'attended') {
        acc[month].attended++
      }
    }
    return acc
  }, {} as Record<string, { registered: number; attended: number }>)

  const attendanceHistory = Object.entries(attendanceByMonth).map(([month, data]) => ({
    month,
    attended: (data as { registered: number; attended: number }).attended,
    registered: (data as { registered: number; attended: number }).registered
  }))

  // Calculate game performance
  const gameStats = participations.reduce((acc, p) => {
    if (p.events?.game) {
      if (!acc[p.events.game]) {
        acc[p.events.game] = { scores: [], placements: [], events: 0 }
      }
      acc[p.events.game].events++
      if (p.score !== null) {
        acc[p.events.game].scores.push(p.score)
      }
      if (p.placement !== null) {
        acc[p.events.game].placements.push(p.placement)
      }
    }
    return acc
  }, {} as Record<string, { scores: number[]; placements: number[]; events: number }>)

  const gamePerformance = Object.entries(gameStats).map(([game, stats]) => {
    const gameStats = stats as { scores: number[]; placements: number[]; events: number }
    return {
      game,
      averageScore: gameStats.scores.length > 0 
        ? Math.round(gameStats.scores.reduce((sum: number, score: number) => sum + score, 0) / gameStats.scores.length)
        : 0,
      averagePlacement: gameStats.placements.length > 0
        ? Math.round(gameStats.placements.reduce((sum: number, placement: number) => sum + placement, 0) / gameStats.placements.length)
        : 0,
      events: gameStats.events
    }
  })

  return {
    scoreHistory,
    placementHistory,
    attendanceHistory,
    gamePerformance
  }
}

function calculateAchievements(participations: any[], statistics: any): any[] {
  const achievements: any[] = []

  // First Event Achievement
  if (statistics.totalEvents >= 1) {
    achievements.push({
      id: 'first_event',
      title: 'Getting Started',
      description: 'Participated in your first event',
      icon: '🎯',
      unlockedAt: participations[participations.length - 1]?.registered_at || new Date().toISOString(),
      rarity: 'common'
    })
  }

  // Perfect Attendance
  if (statistics.attendanceRate === 100 && statistics.totalEvents >= 5) {
    achievements.push({
      id: 'perfect_attendance',
      title: 'Perfect Attendance',
      description: 'Attended every event you registered for (5+ events)',
      icon: '🏆',
      unlockedAt: new Date().toISOString(),
      rarity: 'rare'
    })
  }

  // First Win
  if (statistics.eventsWon >= 1) {
    achievements.push({
      id: 'first_win',
      title: 'Victory!',
      description: 'Won your first event',
      icon: '👑',
      unlockedAt: new Date().toISOString(),
      rarity: 'epic'
    })
  }

  // Event Organizer
  if (statistics.eventsOrganized >= 1) {
    achievements.push({
      id: 'organizer',
      title: 'Event Organizer',
      description: 'Organized your first event',
      icon: '📋',
      unlockedAt: new Date().toISOString(),
      rarity: 'rare'
    })
  }

  // High Scorer
  if (statistics.averageScore >= 100) {
    achievements.push({
      id: 'high_scorer',
      title: 'High Scorer',
      description: 'Achieved an average score of 100+',
      icon: '⭐',
      unlockedAt: new Date().toISOString(),
      rarity: 'epic'
    })
  }

  // Streak Master
  if (statistics.longestStreak >= 5) {
    achievements.push({
      id: 'streak_master',
      title: 'Streak Master',
      description: 'Attended 5 consecutive events',
      icon: '🔥',
      unlockedAt: new Date().toISOString(),
      rarity: 'legendary'
    })
  }

  return achievements
} 