'use client'

import { Achievement, getRarityColor, getCategoryIcon } from '@/lib/achievements'
import { FaStar, FaShare } from 'react-icons/fa'
import { useState } from 'react'

interface AchievementBadgeProps {
  achievement: Achievement
  isNew?: boolean
  showShareButton?: boolean
  onShare?: (achievement: Achievement) => void
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function AchievementBadge({
  achievement,
  isNew = false,
  showShareButton = false,
  onShare,
  size = 'medium',
  className = ''
}: AchievementBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  const sizeClasses = {
    small: 'p-3 text-sm',
    medium: 'p-4 text-base',
    large: 'p-6 text-lg'
  }

  const iconSizes = {
    small: 'text-xl',
    medium: 'text-2xl',
    large: 'text-3xl'
  }

  const rarityColors = {
    common: 'bg-gray-800 border-gray-600 text-gray-300',
    rare: 'bg-blue-900/30 border-blue-500 text-blue-300',
    epic: 'bg-purple-900/30 border-purple-500 text-purple-300',
    legendary: 'bg-yellow-900/30 border-yellow-500 text-yellow-300'
  }

  const rarityGlow = {
    common: '',
    rare: 'shadow-blue-500/20',
    epic: 'shadow-purple-500/20', 
    legendary: 'shadow-yellow-500/20'
  }

  const rarityEmojis = {
    common: '🥉',
    rare: '🥈',
    epic: '🥇',
    legendary: '💎'
  }

  return (
    <div
      className={`
        relative rounded-lg border-2 transition-all duration-300 cursor-pointer
        ${rarityColors[achievement.rarity]}
        ${rarityGlow[achievement.rarity]}
        ${sizeClasses[size]}
        ${isNew ? 'animate-pulse shadow-lg' : ''}
        ${isHovered ? 'scale-105 shadow-lg' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* New Badge Indicator */}
      {isNew && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-bounce">
          NEW!
        </div>
      )}

      {/* Achievement Content */}
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`${iconSizes[size]} flex-shrink-0`}>
          {achievement.icon}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-bold truncate">{achievement.title}</h3>
            <span className="text-sm">{rarityEmojis[achievement.rarity]}</span>
          </div>
          
          <p className="text-sm opacity-90 mb-2 line-clamp-2">
            {achievement.description}
          </p>

          {/* Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs">
              {/* Points */}
              <div className="flex items-center space-x-1">
                <FaStar className="w-3 h-3 text-yellow-400" />
                <span>{achievement.points}</span>
              </div>

              {/* Category */}
              <div className="flex items-center space-x-1">
                <span>{getCategoryIcon(achievement.category)}</span>
                <span className="capitalize">{achievement.category}</span>
              </div>

              {/* Rarity */}
              <span className={`
                px-2 py-1 rounded text-xs font-medium capitalize
                ${achievement.rarity === 'common' ? 'bg-gray-700 text-gray-300' :
                  achievement.rarity === 'rare' ? 'bg-blue-700 text-blue-300' :
                  achievement.rarity === 'epic' ? 'bg-purple-700 text-purple-300' :
                  'bg-yellow-700 text-yellow-300'}
              `}>
                {achievement.rarity}
              </span>
            </div>

            {/* Share Button */}
            {showShareButton && onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onShare(achievement)
                }}
                className="flex items-center space-x-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-colors"
              >
                <FaShare className="w-3 h-3" />
                <span>Share</span>
              </button>
            )}
          </div>

          {/* Unlock Date */}
          {size !== 'small' && (
            <div className="text-xs opacity-70 mt-2">
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Legendary Sparkle Effect */}
      {achievement.rarity === 'legendary' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-2 w-1 h-1 bg-yellow-400 rounded-full animate-ping" />
          <div className="absolute bottom-3 left-3 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/2 left-2 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
        </div>
      )}
    </div>
  )
} 