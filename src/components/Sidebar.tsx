import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  TrendingUp, 
  ChevronLeft,
  ChevronRight,
  Boxes,
  BarChart3,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  activeView: string
  onViewChange: (view: string) => void
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'instruments', label: 'Strumenti', icon: Boxes },
  { id: 'positions', label: 'Posizioni', icon: TrendingUp },
  { id: 'statistics', label: 'Statistiche', icon: BarChart3 },
  { id: 'database', label: 'Database', icon: Database },
]

export function Sidebar({ isOpen, onToggle, activeView, onViewChange }: SidebarProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.aside
        className={cn(
          'bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col',
          'transition-all duration-300'
        )}
        initial={false}
        animate={{ width: isOpen ? 240 : 64 }}
      >
        {/* Toggle Button */}
        <div className="p-4 flex justify-end">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            {isOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            return (
              <motion.button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {isOpen && (
                    <motion.span
                      className="font-medium"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </nav>

        {/* Version Info */}
        {isOpen && (
          <motion.div
            className="p-4 text-xs text-gray-500 dark:text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            v1.0.0
          </motion.div>
        )}
      </motion.aside>
    </AnimatePresence>
  )
}
