import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Moon, Sun, User, LogOut, MoreVertical, Wifi, Activity } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { NotificationCenter } from '@/components/NotificationCenter'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { useState, useEffect, useRef } from 'react'
import type { Notification, SystemStatus } from '@/types/trading.types'

interface HeaderProps {
  onToggleSidebar: () => void
  systemStatus: {
    isRunning: boolean
    sessionActive: boolean
    sessionAge?: number | string
    streamStatus: string
    secondsSinceUpdate?: number
  }
  fullSystemStatus?: SystemStatus
  onForceReconnect?: () => Promise<{ success: boolean; error?: string }>
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
  fullSystemStatus,
  onForceReconnect,
  userLabel, 
  onLogout,
  notifications = [],
  onMarkNotificationAsRead = () => {},
  onMarkAllNotificationsAsRead = () => {},
  onClearNotification = () => {},
  onClearAllNotifications = () => {},
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    setIsDark(theme === 'dark')
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Chiudi menu mobile quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const formatSessionAge = (age?: number | string) => {
    if (!age) return ''
    // Se è stringa (nuovo formato), usala direttamente
    if (typeof age === 'string') return ` (${age})`
    // Se è numero (vecchio formato in ore)
    const h = Math.floor(age)
    const m = Math.floor((age - h) * 60)
    return ` (${h}h ${m}m)`
  }

  return (
    <motion.header
      className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="sm" onClick={onToggleSidebar}>
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2 md:gap-3">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
            <span className="hidden sm:inline">Genesis Trading</span>
            <span className="sm:hidden">Genesis</span>
          </h1>
          {/* Badge status sempre visibile */}
          <Badge variant={getStatusVariant()} className="text-xs">
            {getStatusText()}
            <span className="hidden md:inline">{formatSessionAge(systemStatus.sessionAge)}</span>
          </Badge>
        </div>
      </div>

      {/* Desktop: tutti i controlli visibili */}
      <div className="hidden md:flex items-center gap-4">
        {/* Connection Status - nuovo componente interattivo */}
        {fullSystemStatus && onForceReconnect && (
          <ConnectionStatus 
            systemStatus={fullSystemStatus}
            onForceReconnect={onForceReconnect}
          />
        )}
        
        {/* Fallback: vecchio indicatore stream se non ci sono le nuove props */}
        {!fullSystemStatus && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Stream: <span className="font-medium">{systemStatus.streamStatus}</span>
          </div>
        )}
        
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

      {/* Mobile: controlli essenziali + menu dropdown */}
      <div className="flex md:hidden items-center gap-2">
        {/* Notifications sempre visibili */}
        <NotificationCenter
          notifications={notifications}
          onMarkAsRead={onMarkNotificationAsRead}
          onMarkAllAsRead={onMarkAllNotificationsAsRead}
          onClear={onClearNotification}
          onClearAll={onClearAllNotifications}
        />

        {/* Menu dropdown mobile */}
        <div className="relative" ref={menuRef}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
              >
                {/* Stream status */}
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Wifi className="w-4 h-4" />
                    <span>Stream: <span className="font-medium">{systemStatus.streamStatus}</span></span>
                  </div>
                </div>

                {/* Session age */}
                {systemStatus.sessionAge && (
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Activity className="w-4 h-4" />
                      <span>Sessione: {formatSessionAge(systemStatus.sessionAge).trim()}</span>
                    </div>
                  </div>
                )}

                {/* User */}
                {userLabel && (
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{userLabel}</span>
                    </div>
                  </div>
                )}

                {/* Theme toggle */}
                <button
                  onClick={() => { toggleTheme(); setMobileMenuOpen(false) }}
                  className="w-full px-4 py-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                  <span>{isDark ? 'Tema chiaro' : 'Tema scuro'}</span>
                </button>

                {/* Logout */}
                {onLogout && (
                  <button
                    onClick={() => { onLogout(); setMobileMenuOpen(false) }}
                    className="w-full px-4 py-2 flex items-center gap-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  )
}
