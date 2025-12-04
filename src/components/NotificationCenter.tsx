import { useState, useEffect } from 'react'
import { Bell, X, Check, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types/trading.types'

interface NotificationCenterProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onClear: (id: string) => void
  onClearAll: () => void
}

const LEVEL_ICONS = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
}

const LEVEL_COLORS = {
  success: 'text-green-500',
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
}

const LEVEL_BG = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Ora'
  if (diffMinutes < 60) return `${diffMinutes}m fa`
  if (diffHours < 24) return `${diffHours}h fa`
  return `${diffDays}g fa`
}

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
  onClearAll,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  // Effetto sonoro per nuove notifiche
  useEffect(() => {
    if (unreadCount > 0 && !isOpen) {
      // Potrebbe essere aggiunto un suono qui
    }
  }, [unreadCount, isOpen])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifiche</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onMarkAllAsRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Segna tutte lette
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-500 hover:text-red-600"
                onClick={onClearAll}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Pulisci
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nessuna notifica</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = LEVEL_ICONS[notification.level]
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-3 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
                      !notification.read && 'bg-blue-50/50 dark:bg-blue-900/10'
                    )}
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                        LEVEL_BG[notification.level]
                      )}>
                        <Icon className={cn('h-4 w-4', LEVEL_COLORS[notification.level])} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm font-medium',
                            !notification.read && 'text-blue-600 dark:text-blue-400'
                          )}>
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onClear(notification.id)
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          {notification.instrument && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {notification.instrument}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
