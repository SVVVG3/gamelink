'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FaUsers, 
  FaComments, 
  FaCalendarAlt, 
  FaGamepad,
  FaUserCircle 
} from 'react-icons/fa'
import { useNotifications } from '@/hooks/useNotifications'

interface NavItem {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
}

export default function BottomNavigation() {
  const pathname = usePathname()
  const { unreadMessages, pendingInvitations } = useNotifications()

  const navItems: NavItem[] = [
    {
      href: '/events',
      icon: <FaCalendarAlt className="w-5 h-5" />,
      label: 'Events'
    },
    {
      href: '/friends',
      icon: <FaGamepad className="w-5 h-5" />,
      label: 'Friends'
    },
    {
      href: '/profile',
      icon: <FaUserCircle className="w-5 h-5" />,
      label: 'Profile'
    },
    {
      href: '/groups',
      icon: <FaUsers className="w-5 h-5" />,
      label: 'Groups',
      badge: pendingInvitations > 0 ? pendingInvitations : undefined
    },
    {
      href: '/messages',
      icon: <FaComments className="w-5 h-5" />,
      label: 'Messages',
      badge: unreadMessages > 0 ? unreadMessages : undefined
    }
  ]

  return (
    <nav className="fixed left-0 right-0 bg-gray-800 border-t border-gray-700 z-50 bottom-nav-safe">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors min-w-[60px] relative ${
                isActive
                  ? 'text-blue-400 bg-blue-900/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${
                isActive ? 'text-blue-400' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
} 