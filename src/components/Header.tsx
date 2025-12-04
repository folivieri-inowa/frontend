import { motion } from 'framer-motion'
import { Menu, Moon, Sun, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { NotificationCenter } from '@/components/NotificationCenter'
import { useState, useEffect } from 'react'
import type { Notification } from '@/types/trading.types'

interface HeaderProps {
  onToggleSidebar: () => void
  systemStatus: {
    isRunning: boolean
    sessionActive: boolean
    sessionAge?: number
    streamStatus: string
  }
  userLabel?: string
  onLogout?: () => void
  notifications?: Notification[]
  onMarkNotificationAsRead?: (id: string) => void
  onMarkAllNotificationsAsRead?: () => void
  onClearNotification?: (id: string) => void
  onClearAllNotifications?: () => void
}

export function Header({ 
  onToggleSidebar, 
  systemStatus, 
  userLabel, 
  onLogout,
  notifications = [],
  onMarkNotificationAsRead = () => {},
  onMarkAllNotificationsAsRead = () => {},
  onClearNotification = () => {},
  onClearAllNotifications = () => {},
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    setIsDark(theme === 'dark')
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newTheme)
  }

  const getStatusVariant = () => {
    if (!systemStatus.sessionActive) return 'error'
    if (systemStatus.streamStatus === 'STALLED' || systemStatus.streamStatus === 'DISCONNECTED') return 'warning'
    if (systemStatus.isRunning) return 'success'
    return 'default'
  }

  const getStatusText = () => {
    if (!systemStatus.sessionActive) return 'Session Lost'
    if (systemStatus.streamStatus === 'STALLED') return 'Stream Stalled'
    if (systemStatus.streamStatus === 'DISCONNECTED') return 'Disconnected'
    if (systemStatus.isRunning) return 'Running'
    return 'Stopped'
  }

  const formatSessionAge = (hours?: number) => {
    if (!hours) return ''
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return ` (${h}h ${m}m)`
  }

  return (
    <motion.header
      className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onToggleSidebar}>
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Genesis Trading
          </h1>
          <Badge variant={getStatusVariant()}>
            {getStatusText()}{formatSessionAge(systemStatus.sessionAge)}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Stream: <span className="font-medium">{systemStatus.streamStatus}</span>
        </div>
        
        {/* User info */}
        {userLabel && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {userLabel}
            </span>
          </div>
        )}

        {/* Notifications */}
        <NotificationCenter
          notifications={notifications}
          onMarkAsRead={onMarkNotificationAsRead}
          onMarkAllAsRead={onMarkAllNotificationsAsRead}
          onClear={onClearNotification}
          onClearAll={onClearAllNotifications}
        />
        
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-700" />
          )}
        </Button>

        {/* Logout button */}
        {onLogout && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        )}
      </div>
    </motion.header>
  )
}
