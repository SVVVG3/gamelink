// Achievement System Library
import { Event, EventParticipant, Profile } from '@/types'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: 'participation' | 'performance' | 'social' | 'organizing'
  points: number
}

export interface UserAchievements {
  achievements: Achievement[]
  totalPoints: number
  rarityBreakdown: Record<string, number>
  categoryBreakdown: Record<string, number>
}

// Achievement definitions with point values
const ACHIEVEMENT_DEFINITIONS = {
  // Participation Achievements
  first_event: {
    title: 'Getting Started',
    description: 'Participated in your first event',
    icon: '🎯',
    rarity: 'common' as const,
    category: 'participation' as const,
    points: 10
  },
  five_events: {
    title: 'Regular Player',
    description: 'Participated in 5 events',
    icon: '🎮',
    rarity: 'common' as const,
    category: 'participation' as const,
    points: 25
  },
  ten_events: {
    title: 'Dedicated Gamer',
    description: 'Participated in 10 events',
    icon: '🏅',
    rarity: 'rare' as const,
    category: 'participation' as const,
    points: 50
  },
  
  // Performance Achievements
  first_win: {
    title: 'Victory!',
    description: 'Won your first event',
    icon: '👑',
    rarity: 'epic' as const,
    category: 'performance' as const,
    points: 100
  },
  three_wins: {
    title: 'Champion',
    description: 'Won 3 events',
    icon: '🏆',
    rarity: 'epic' as const,
    category: 'performance' as const,
    points: 250
  },
  perfect_score: {
    title: 'Perfectionist',
    description: 'Achieved a perfect score in an event',
    icon: '💯',
    rarity: 'legendary' as const,
    category: 'performance' as const,
    points: 200
  },
  high_scorer: {
    title: 'High Scorer',
    description: 'Achieved an average score of 100+',
    icon: '⭐',
    rarity: 'epic' as const,
    category: 'performance' as const,
    points: 150
  },
  
  // Social Achievements
  perfect_attendance: {
    title: 'Perfect Attendance',
    description: 'Attended every event you registered for (5+ events)',
    icon: '🎖️',
    rarity: 'rare' as const,
    category: 'social' as const,
    points: 75
  },
  streak_master: {
    title: 'Streak Master',
    description: 'Attended 5 consecutive events',
    icon: '🔥',
    rarity: 'legendary' as const,
    category: 'social' as const,
    points: 300
  },
  
  // Organizing Achievements
  organizer: {
    title: 'Event Organizer',
    description: 'Organized your first event',
    icon: '📋',
    rarity: 'rare' as const,
    category: 'organizing' as const,
    points: 100
  },
  prolific_organizer: {
    title: 'Prolific Organizer',
    description: 'Organized 5 events',
    icon: '🎪',
    rarity: 'epic' as const,
    category: 'organizing' as const,
    points: 300
  },
  community_builder: {
    title: 'Community Builder',
    description: 'Organized 10 events',
    icon: '🏗️',
    rarity: 'legendary' as const,
    category: 'organizing' as const,
    points: 500
  }
}

/**
 * Calculate achievements for a user based on their event participation
 */
export function calculateUserAchievements(
  participations: any[],
  statistics: any,
  organizedEvents: Event[] = []
): UserAchievements {
  const achievements: Achievement[] = []

  // Participation Achievements
  if (statistics.totalEvents >= 1) {
    achievements.push({
      id: 'first_event',
      ...ACHIEVEMENT_DEFINITIONS.first_event,
      unlockedAt: participations[participations.length - 1]?.registered_at || new Date().toISOString()
    })
  }

  if (statistics.totalEvents >= 5) {
    achievements.push({
      id: 'five_events',
      ...ACHIEVEMENT_DEFINITIONS.five_events,
      unlockedAt: new Date().toISOString()
    })
  }

  if (statistics.totalEvents >= 10) {
    achievements.push({
      id: 'ten_events',
      ...ACHIEVEMENT_DEFINITIONS.ten_events,
      unlockedAt: new Date().toISOString()
    })
  }

  // Performance Achievements
  if (statistics.eventsWon >= 1) {
    achievements.push({
      id: 'first_win',
      ...ACHIEVEMENT_DEFINITIONS.first_win,
      unlockedAt: new Date().toISOString()
    })
  }

  if (statistics.eventsWon >= 3) {
    achievements.push({
      id: 'three_wins',
      ...ACHIEVEMENT_DEFINITIONS.three_wins,
      unlockedAt: new Date().toISOString()
    })
  }

  if (statistics.averageScore >= 100) {
    achievements.push({
      id: 'high_scorer',
      ...ACHIEVEMENT_DEFINITIONS.high_scorer,
      unlockedAt: new Date().toISOString()
    })
  }

  // Check for perfect scores
  const hasPerfectScore = participations.some(p => p.score === 100 || p.placement === 1)
  if (hasPerfectScore) {
    achievements.push({
      id: 'perfect_score',
      ...ACHIEVEMENT_DEFINITIONS.perfect_score,
      unlockedAt: new Date().toISOString()
    })
  }

  // Social Achievements
  if (statistics.attendanceRate === 100 && statistics.totalEvents >= 5) {
    achievements.push({
      id: 'perfect_attendance',
      ...ACHIEVEMENT_DEFINITIONS.perfect_attendance,
      unlockedAt: new Date().toISOString()
    })
  }

  if (statistics.longestStreak >= 5) {
    achievements.push({
      id: 'streak_master',
      ...ACHIEVEMENT_DEFINITIONS.streak_master,
      unlockedAt: new Date().toISOString()
    })
  }

  // Organizing Achievements
  if (statistics.eventsOrganized >= 1) {
    achievements.push({
      id: 'organizer',
      ...ACHIEVEMENT_DEFINITIONS.organizer,
      unlockedAt: new Date().toISOString()
    })
  }

  if (statistics.eventsOrganized >= 5) {
    achievements.push({
      id: 'prolific_organizer',
      ...ACHIEVEMENT_DEFINITIONS.prolific_organizer,
      unlockedAt: new Date().toISOString()
    })
  }

  if (statistics.eventsOrganized >= 10) {
    achievements.push({
      id: 'community_builder',
      ...ACHIEVEMENT_DEFINITIONS.community_builder,
      unlockedAt: new Date().toISOString()
    })
  }

  // Calculate totals
  const totalPoints = achievements.reduce((sum, achievement) => sum + achievement.points, 0)
  
  const rarityBreakdown = achievements.reduce((acc, achievement) => {
    acc[achievement.rarity] = (acc[achievement.rarity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const categoryBreakdown = achievements.reduce((acc, achievement) => {
    acc[achievement.category] = (acc[achievement.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    achievements,
    totalPoints,
    rarityBreakdown,
    categoryBreakdown
  }
}

/**
 * Generate shareable achievement text for Farcaster
 */
export function generateAchievementShareText(achievement: Achievement, username: string): string {
  const rarityEmojis = {
    common: '🥉',
    rare: '🥈', 
    epic: '🥇',
    legendary: '💎'
  }

  return `🎮 Achievement Unlocked!\n\n${rarityEmojis[achievement.rarity]} ${achievement.title}\n${achievement.description}\n\n+${achievement.points} points earned!\n\nJoin me on /gamelink! 🕹️`
}

/**
 * Generate shareable results text for event completion
 */
export function generateEventResultsShareText(
  event: Event,
  userPlacement: number | null,
  userScore: number | null,
  totalParticipants: number,
  username: string
): string {
  let performanceText = ''
  
  if (userPlacement === 1) {
    performanceText = `🥇 1st Place Winner!`
  } else if (userPlacement === 2) {
    performanceText = `🥈 2nd Place!`
  } else if (userPlacement === 3) {
    performanceText = `🥉 3rd Place!`
  } else if (userPlacement && userPlacement <= 5) {
    performanceText = `🏆 Top 5 Finish! (#${userPlacement})`
  } else if (userPlacement) {
    performanceText = `📊 Placed #${userPlacement} of ${totalParticipants}`
  } else {
    performanceText = `🎮 Participated in ${event.title}`
  }

  const scoreText = userScore ? `\n🎯 Score: ${userScore}` : ''
  
  return `${performanceText}\n\n🎮 Event: ${event.title}${event.game ? `\n🕹️ Game: ${event.game}` : ''}${scoreText}\n👥 ${totalParticipants} participants\n\nJoin me on /gamelink! 🕹️`
}

/**
 * Generate leaderboard share text with participant tagging
 */
export function generateLeaderboardShareText(
  event: Event,
  topParticipants: Array<{ profile: Profile; placement: number; score: number | null }>,
  totalParticipants: number
): string {
  const leaderboardText = topParticipants
    .slice(0, 3)
    .map((participant, index) => {
      const medals = ['🥇', '🥈', '🥉']
      const username = participant.profile.username
      const scoreText = participant.score ? ` - ${participant.score} pts` : ''
      return `${medals[index]} @${username}${scoreText}`
    })
    .join('\n')

  return `🏆 ${event.title} Results!\n\n${leaderboardText}\n\n👥 ${totalParticipants} total participants\n${event.game ? `🕹️ ${event.game}` : ''}\n\nJoin the competition on /gamelink! 🕹️`
}

/**
 * Get rarity color for UI display
 */
export function getRarityColor(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common': return 'text-gray-400 bg-gray-800'
    case 'rare': return 'text-blue-400 bg-blue-900'
    case 'epic': return 'text-purple-400 bg-purple-900'
    case 'legendary': return 'text-yellow-400 bg-yellow-900'
    default: return 'text-gray-400 bg-gray-800'
  }
}

/**
 * Get category icon for UI display
 */
export function getCategoryIcon(category: Achievement['category']): string {
  switch (category) {
    case 'participation': return '🎯'
    case 'performance': return '🏆'
    case 'social': return '👥'
    case 'organizing': return '📋'
    default: return '🎮'
  }
} 