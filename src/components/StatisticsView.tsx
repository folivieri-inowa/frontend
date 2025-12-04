import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { 
  TrendingUp, 
  TrendingDown,
  Clock,
  BarChart3,
  RefreshCw,
  Target,
  Zap,
  Award,
  Activity,
  Loader2
} from 'lucide-react'

// Tipi per le statistiche
interface InstrumentStat {
  epic: string
  instrument: string
  cycles: number
  profitEUR: number
  winRate: number
  lastCycle: string | null
}

interface RecentCycle {
  epic: string
  instrument: string
  type: string
  description: string
  profitEUR: number
  duration: string
  completedAt: string
}

interface GlobalStats {
  totalInstruments: number
  totalCycles: number
  totalProfitEUR: number
  avgWinRate: number
}

interface TodayStats {
  cycles: number
  profitEUR: number
}

interface StatsSummary {
  global: GlobalStats
  today: TodayStats
  recentCycles: RecentCycle[]
  byInstrument: InstrumentStat[]
}

// Mapping tipi ciclo a emoji/label
const CYCLE_TYPE_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  'STARTUP': { emoji: '🚀', label: 'Avvio', color: 'text-blue-500' },
  'TP_FLIP': { emoji: '🎯', label: 'TP Flip', color: 'text-green-500' },
  'HARVEST_PARTIAL': { emoji: '🌾', label: 'Falciatura', color: 'text-amber-500' },
  'HARVEST_FULL': { emoji: '💰', label: 'Chiusura', color: 'text-green-600' },
  'COVERAGE_ACTIVATED': { emoji: '🛡️', label: 'Copertura', color: 'text-purple-500' },
  'COVERAGE_CLOSED': { emoji: '✅', label: 'Fine Copertura', color: 'text-teal-500' },
  'MANUAL_CLOSE': { emoji: '👤', label: 'Manuale', color: 'text-gray-500' },
}

export function StatisticsView() {
  const { apiUrl } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (showRefresh = false) => {
    if (!apiUrl) return
    
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const res = await fetch(`${apiUrl}/api/stats/summary`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      
      const { success, data } = await res.json()
      if (success && data) {
        setStats(data)
        setError(null)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Impossibile caricare le statistiche')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [apiUrl])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500 dark:text-gray-400">{error || 'Nessun dato disponibile'}</p>
        <Button onClick={() => fetchStats()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Riprova
        </Button>
      </div>
    )
  }

  const { global, today, recentCycles, byInstrument } = stats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Statistiche
        </h2>
        <div className="flex items-center gap-3">
          <Badge variant={today.profitEUR >= 0 ? 'success' : 'error'}>
            Oggi: {today.profitEUR >= 0 ? '+' : ''}{formatCurrency(today.profitEUR)}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchStats(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stat Cards Principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Profitto Totale"
          value={formatCurrency(global.totalProfitEUR)}
          icon={global.totalProfitEUR >= 0 ? TrendingUp : TrendingDown}
          trend={global.totalProfitEUR >= 0 ? 'up' : 'down'}
          subtitle={`${global.totalCycles} cicli completati`}
        />
        <StatCard
          title="Win Rate Medio"
          value={`${global.avgWinRate.toFixed(1)}%`}
          icon={Target}
          trend={global.avgWinRate >= 50 ? 'up' : 'down'}
          subtitle={`Su ${global.totalInstruments} strumenti`}
        />
        <StatCard
          title="Cicli Oggi"
          value={formatNumber(today.cycles)}
          icon={Zap}
          trend="neutral"
          subtitle={`${today.profitEUR >= 0 ? '+' : ''}${formatCurrency(today.profitEUR)}`}
        />
        <StatCard
          title="Strumenti Attivi"
          value={formatNumber(global.totalInstruments)}
          icon={Activity}
          trend="neutral"
          subtitle="Con statistiche"
        />
      </div>

      {/* Statistiche per Strumento */}
      {byInstrument.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Performance per Strumento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="pb-3">Strumento</th>
                    <th className="pb-3 text-center">Cicli</th>
                    <th className="pb-3 text-center">Win Rate</th>
                    <th className="pb-3 text-right">Profitto</th>
                    <th className="pb-3 text-right">Ultimo Ciclo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {byInstrument.map((instr, idx) => (
                    <motion.tr
                      key={instr.epic}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {instr.instrument}
                          </p>
                          <p className="text-xs text-gray-500">{instr.epic}</p>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                          {instr.cycles}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={cn(
                                "h-2 rounded-full",
                                instr.winRate >= 60 ? "bg-green-500" :
                                instr.winRate >= 40 ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ width: `${Math.min(instr.winRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {instr.winRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className={cn(
                        "py-3 text-right font-semibold",
                        instr.profitEUR >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {instr.profitEUR >= 0 ? '+' : ''}{formatCurrency(instr.profitEUR)}
                      </td>
                      <td className="py-3 text-right text-sm text-gray-500">
                        {instr.lastCycle ? formatTimeAgo(new Date(instr.lastCycle)) : '-'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cicli Recenti */}
      {recentCycles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Cicli Recenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCycles.map((cycle, idx) => {
                const typeInfo = CYCLE_TYPE_MAP[cycle.type] || { emoji: '📊', label: cycle.type, color: 'text-gray-500' }
                return (
                  <motion.div
                    key={`${cycle.epic}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeInfo.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {cycle.instrument}
                          </span>
                          <Badge variant="default" className={cn("text-xs", typeInfo.color)}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {cycle.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-semibold",
                        cycle.profitEUR >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {cycle.profitEUR >= 0 ? '+' : ''}{formatCurrency(cycle.profitEUR)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {cycle.duration} • {formatTimeAgo(new Date(cycle.completedAt))}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {global.totalCycles === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nessuna statistica ancora
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              Le statistiche verranno generate automaticamente quando completerai i primi cicli di trading.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente StatCard riutilizzabile
interface StatCardProps {
  title: string
  value: string
  icon: React.ElementType
  trend: 'up' | 'down' | 'neutral'
  subtitle?: string
}

function StatCard({ title, value, icon: Icon, trend, subtitle }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card hover>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
              <p className={cn(
                "text-2xl font-bold mt-1",
                trend === 'up' ? "text-green-600 dark:text-green-400" :
                trend === 'down' ? "text-red-600 dark:text-red-400" :
                "text-gray-900 dark:text-white"
              )}>
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
              )}
            </div>
            <div className={cn(
              "p-2 rounded-lg",
              trend === 'up' ? "bg-green-100 dark:bg-green-900/30" :
              trend === 'down' ? "bg-red-100 dark:bg-red-900/30" :
              "bg-gray-100 dark:bg-gray-800"
            )}>
              <Icon className={cn(
                "w-5 h-5",
                trend === 'up' ? "text-green-600 dark:text-green-400" :
                trend === 'down' ? "text-red-600 dark:text-red-400" :
                "text-gray-600 dark:text-gray-400"
              )} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Helper per formattare tempo fa
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Ora'
  if (diffMinutes < 60) return `${diffMinutes}m fa`
  if (diffHours < 24) return `${diffHours}h fa`
  if (diffDays < 7) return `${diffDays}g fa`
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
