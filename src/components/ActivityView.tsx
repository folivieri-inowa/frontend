import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { 
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  AlertCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Shield,
  Loader2,
  Calendar,
  Filter
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// TIPI
// ═══════════════════════════════════════════════════════════════

interface SystemLogEntry {
  id: number
  timestamp: string
  epic: string | null
  level: string
  category: string
  message: string
  details: string | null
}

interface TradeEntry {
  id: number
  epic: string
  instrument: string
  direction: string
  contracts: number
  openPrice: number
  closePrice: number
  openedAt: string
  closedAt: string
  profitPct: number
  profitEUR: number
  closeReason: string
  isCoverage: boolean
}

interface DailyStats {
  date: string
  trades: number
  profitEUR: number
  winCount: number
  lossCount: number
}

interface ActivityData {
  recentLogs: SystemLogEntry[]
  recentTrades: TradeEntry[]
  todayStats: DailyStats
  weekStats: DailyStats[]
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

const formatDateTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('it-IT', { 
    day: '2-digit', 
    month: '2-digit',
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const getLogIcon = (level: string, category: string) => {
  if (level === 'ERROR') return <AlertCircle className="w-4 h-4 text-red-500" />
  if (category === 'PHASE_CHANGE') return <Zap className="w-4 h-4 text-blue-500" />
  if (category === 'POSITION') return <Target className="w-4 h-4 text-green-500" />
  if (category === 'ORDER') return <ArrowUpRight className="w-4 h-4 text-amber-500" />
  if (category === 'COVERAGE') return <Shield className="w-4 h-4 text-purple-500" />
  return <Info className="w-4 h-4 text-gray-500" />
}

const getLogColor = (level: string): string => {
  switch (level) {
    case 'ERROR': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    case 'WARNING': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
    case 'INFO': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
    default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
  }
}

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'PHASE_CHANGE': 'Fase',
    'POSITION': 'Posizione',
    'ORDER': 'Ordine',
    'COVERAGE': 'Copertura',
    'ERROR': 'Errore',
    'HARVEST': 'Falciatura',
  }
  return labels[category] || category
}

const getCloseReasonLabel = (reason: string): { label: string; color: string; icon: React.ReactNode } => {
  const reasons: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'TP': { label: 'Take Profit', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <Target className="w-3 h-3" /> },
    'HARVEST': { label: 'Falciatura', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Zap className="w-3 h-3" /> },
    'COVERAGE_TP': { label: 'TP Copertura', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <Shield className="w-3 h-3" /> },
    'MANUAL': { label: 'Manuale', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', icon: <Info className="w-3 h-3" /> },
    'STOP_LOSS': { label: 'Stop Loss', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertCircle className="w-3 h-3" /> },
  }
  return reasons[reason] || { label: reason, color: 'bg-gray-100 text-gray-700', icon: <Info className="w-3 h-3" /> }
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ═══════════════════════════════════════════════════════════════

export function ActivityView() {
  const { apiUrl } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ActivityData | null>(null)
  const [logFilter, setLogFilter] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch dati
  const fetchData = useCallback(async (showRefresh = false) => {
    if (!apiUrl) return
    
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const response = await fetch(`${apiUrl}/api/monitor`)
      if (!response.ok) throw new Error('Failed to fetch activity data')
      
      const result = await response.json()
      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Error fetching activity:', err)
      setError('Impossibile caricare i dati')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [apiUrl])

  // Fetch iniziale
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh ogni 30 secondi
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(true), 30000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchData])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-500 dark:text-gray-400">{error || 'Nessun dato disponibile'}</p>
        <Button onClick={() => fetchData()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Riprova
        </Button>
      </div>
    )
  }

  // Filtra logs
  const filteredLogs = logFilter === 'all' 
    ? data.recentLogs 
    : data.recentLogs.filter(log => log.category === logFilter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-500" />
          Activity Monitor
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Auto-refresh
          </label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* P&L Oggi */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">P&L Oggi</p>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  data.todayStats.profitEUR >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {data.todayStats.profitEUR >= 0 ? '+' : ''}{formatCurrency(data.todayStats.profitEUR)}
                </p>
              </div>
              {data.todayStats.profitEUR >= 0 
                ? <TrendingUp className="w-8 h-8 text-green-500" />
                : <TrendingDown className="w-8 h-8 text-red-500" />
              }
            </div>
          </CardContent>
        </Card>

        {/* Trade Oggi */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Trade Oggi</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                  {data.todayStats.trades}
                </p>
              </div>
              <Zap className="w-8 h-8 text-amber-500" />
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600">✓ {data.todayStats.winCount} win</span>
              <span className="text-red-600">✗ {data.todayStats.lossCount} loss</span>
            </div>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Win Rate</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                  {data.todayStats.trades > 0 
                    ? ((data.todayStats.winCount / data.todayStats.trades) * 100).toFixed(0)
                    : 0}%
                </p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Eventi */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Eventi Recenti</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                  {data.recentLogs.length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Log */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Eventi Sistema
              </CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="text-sm border rounded-md px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="all">Tutti</option>
                  <option value="PHASE_CHANGE">Fasi</option>
                  <option value="POSITION">Posizioni</option>
                  <option value="ORDER">Ordini</option>
                  <option value="ERROR">Errori</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nessun evento disponibile</p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredLogs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "p-3 rounded-lg border",
                        getLogColor(log.level)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {getLogIcon(log.level, log.category)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="default" className="text-xs">
                              {getCategoryLabel(log.category)}
                            </Badge>
                            {log.epic && (
                              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                {log.epic.split('.').pop()}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 ml-auto">
                              {formatTime(log.timestamp)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">{log.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trade History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Trade Recenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.recentTrades.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nessun trade registrato</p>
                  <p className="text-xs mt-1">I trade appariranno quando le posizioni verranno chiuse</p>
                </div>
              ) : (
                <AnimatePresence>
                  {data.recentTrades.map((trade, index) => {
                    const closeInfo = getCloseReasonLabel(trade.closeReason)
                    return (
                      <motion.div
                        key={trade.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="p-3 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {trade.direction === 'LONG' || trade.direction === 'BUY' ? (
                              <ArrowUpRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-500" />
                            )}
                            <span className="font-medium text-sm">{trade.instrument}</span>
                            {trade.isCoverage && (
                              <Badge variant="info" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                COV
                              </Badge>
                            )}
                          </div>
                          <span className={cn(
                            "font-bold",
                            trade.profitEUR >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {trade.profitEUR >= 0 ? '+' : ''}{formatCurrency(trade.profitEUR)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <span>{trade.contracts} contratti</span>
                          <span>•</span>
                          <span>{trade.openPrice.toFixed(2)} → {trade.closePrice.toFixed(2)}</span>
                          <span>•</span>
                          <Badge className={cn("text-xs", closeInfo.color)}>
                            {closeInfo.icon}
                            <span className="ml-1">{closeInfo.label}</span>
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {formatDateTime(trade.closedAt)}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Chart */}
      {data.weekStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Performance Settimanale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {data.weekStats.map((day, index) => {
                const maxProfit = Math.max(...data.weekStats.map(d => Math.abs(d.profitEUR)), 1)
                const height = (Math.abs(day.profitEUR) / maxProfit) * 100
                const isPositive = day.profitEUR >= 0
                
                return (
                  <div 
                    key={day.date} 
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div className="w-full flex-1 flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(height, 5)}%` }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        className={cn(
                          "w-full rounded-t",
                          isPositive ? "bg-green-500" : "bg-red-500"
                        )}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(day.date)}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      isPositive ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(day.profitEUR)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
