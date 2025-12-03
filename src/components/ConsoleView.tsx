import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConsoleLog } from '@/types/trading.types'
import { formatDateTime } from '@/lib/utils'
import { Terminal, Trash2, Download } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface ConsoleViewProps {
  logs: ConsoleLog[]
  onClear?: () => void
}

export function ConsoleView({ logs, onClear }: ConsoleViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const getLogVariant = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error': return 'error'
      case 'warning': return 'warning'
      case 'success': return 'success'
      default: return 'info'
    }
  }

  const getLogIcon = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'success': return '✅'
      default: return 'ℹ️'
    }
  }

  const handleExport = () => {
    const logsText = logs.map(log => 
      `[${formatDateTime(log.timestamp)}] ${log.type.toUpperCase()} ${log.epic ? `[${log.epic}]` : ''} ${log.message}`
    ).join('\n')
    
    const blob = new Blob([logsText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `genesis-logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <CardTitle>Console</CardTitle>
            <Badge variant="info">{logs.length} logs</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {onClear && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto px-6 py-4 font-mono text-sm space-y-2"
        >
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900/50"
              >
                <span className="flex-shrink-0 text-lg">{getLogIcon(log.type)}</span>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDateTime(log.timestamp)}
                    </span>
                    <Badge variant={getLogVariant(log.type)} className="text-xs">
                      {log.type}
                    </Badge>
                    {log.epic && (
                      <Badge variant="default" className="text-xs">
                        {log.epic}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-900 dark:text-white break-words">
                    {log.message}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {logs.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              No logs yet...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
