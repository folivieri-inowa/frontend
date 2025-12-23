import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Target,
  Shield,
  Loader2,
  Calendar,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Percent,
  CheckCircle2,
  XCircle,
  Filter
} from 'lucide-react'

// Tipi
interface StatsOverview {
  totals: {
    profit: number
    loss: number
    netPnL: number
    winningTrades: number
    losingTrades: number
    winRate: number
  }
  cycles: {
    completed: number      // Cicli completati (falciatura finale)
    coverageExits: number  // Uscite tramite copertura
  }
  byInstrument: Array<{
    epic: string
    instrument: string
    totalCycles: number
    completedCycles: number
    coverageExits: number
    profitEUR: number
    winRate: number
    lastActivity: string | null
  }>
}

interface Trade {
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
  closePhase: string
  isCoverage: boolean
  wasHarvested: boolean
  date: string
  time: string
  type: string
}

export function StatisticsView() {
  const { apiUrl } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [overview, setOverview] = useState<StatsOverview | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedEpic, setSelectedEpic] = useState<string>('all')
  const [tradesLimit, setTradesLimit] = useState(50)

  const fetchData = useCallback(async (showRefresh = false) => {
    if (!apiUrl) return
    
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      // Fetch overview
      const overviewRes = await fetch(`${apiUrl}/api/stats/overview`)
      const overviewData = await overviewRes.json()
      
      if (overviewData.success) {
        setOverview(overviewData.data)
      }

      // Fetch trades
      const tradesUrl = selectedEpic === 'all' 
        ? `${apiUrl}/api/stats/trades?limit=${tradesLimit}`
        : `${apiUrl}/api/stats/trades?limit=${tradesLimit}&epic=${selectedEpic}`
      
      const tradesRes = await fetch(tradesUrl)
      const tradesData = await tradesRes.json()
      
      if (tradesData.success) {
        setTrades(tradesData.data.trades)
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Impossibile caricare le statistiche')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [apiUrl, selectedEpic, tradesLimit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500 dark:text-gray-400">{error || 'Nessun dato disponibile'}</p>
        <Button onClick={() => fetchData()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Riprova
        </Button>
      </div>
    )
  }

  const { totals, cycles, byInstrument } = overview
  const totalTrades = totals.winningTrades + totals.losingTrades

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          📊 Statistiche
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Aggiorna
        </Button>
      </div>

      {/* Cards Principali - P&L Totale */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Profitto Netto */}
        <motion.div
          className={cn(
            "rounded-xl p-5 border shadow-sm",
            totals.netPnL >= 0 
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            {totals.netPnL >= 0 ? (
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              P&L Netto
            </span>
          </div>
          <p className={cn(
            "text-3xl font-bold",
            totals.netPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {totals.netPnL >= 0 ? '+' : ''}{formatCurrency(totals.netPnL)}
          </p>
        </motion.div>

        {/* Profitti Totali */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpCircle className="w-6 h-6 text-green-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Profitti
            </span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            +{formatCurrency(totals.profit)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {totals.winningTrades} operazioni
          </p>
        </motion.div>

        {/* Perdite Totali */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <ArrowDownCircle className="w-6 h-6 text-red-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Perdite
            </span>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            -{formatCurrency(totals.loss)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {totals.losingTrades} operazioni
          </p>
        </motion.div>

        {/* Win Rate */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Percent className="w-6 h-6 text-blue-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Win Rate
            </span>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            totals.winRate >= 50 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
          )}>
            {totals.winRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {totals.winningTrades}/{totalTrades} operazioni
          </p>
        </motion.div>
      </div>

      {/* Cicli */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cicli Completati */}
        <motion.div
          className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800 shadow-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Cicli Completati
                </span>
              </div>
              <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                {cycles.completed}
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-2">
                Fase 2 → Falciatura → Chiusura completa
              </p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-emerald-200 dark:text-emerald-800" />
          </div>
        </motion.div>

        {/* Uscite Copertura */}
        <motion.div
          className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800 shadow-sm"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Uscite Copertura
                </span>
              </div>
              <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                {cycles.coverageExits}
              </p>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-2">
                Chiusura anticipata tramite ordine copertura
              </p>
            </div>
            <XCircle className="w-12 h-12 text-purple-200 dark:text-purple-800" />
          </div>
        </motion.div>
      </div>

      {/* Statistiche per Cross */}
      {byInstrument.length > 0 && (
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              📈 Statistiche per Cross
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cross</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cicli</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completati</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Coperture</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ultima Attività</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {byInstrument.map((item) => (
                  <tr 
                    key={item.epic}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedEpic(item.epic)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.instrument}
                      </div>
                      <div className="text-xs text-gray-500">{item.epic}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {item.totalCycles}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                        {item.completedCycles}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {item.coverageExits}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-right font-bold",
                      item.profitEUR >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {item.profitEUR >= 0 ? '+' : ''}{formatCurrency(item.profitEUR)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "font-medium",
                        item.winRate >= 50 ? "text-green-600" : "text-amber-600"
                      )}>
                        {item.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {item.lastActivity ? new Date(item.lastActivity).toLocaleDateString('it-IT') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Storico Operazioni */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            📋 Storico Operazioni
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedEpic}
                onChange={(e) => setSelectedEpic(e.target.value)}
                className="text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg px-3 py-1.5"
              >
                <option value="all">Tutti i cross</option>
                {byInstrument.map(item => (
                  <option key={item.epic} value={item.epic}>{item.instrument}</option>
                ))}
              </select>
            </div>
            <select
              value={tradesLimit}
              onChange={(e) => setTradesLimit(Number(e.target.value))}
              className="text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg px-3 py-1.5"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Ora</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cross</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Direzione</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Contratti</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nessuna operazione trovata
                  </td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">{trade.date}</span>
                        <Clock className="w-3.5 h-3.5 text-gray-400 ml-2" />
                        <span className="text-gray-500">{trade.time}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {trade.instrument}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold",
                        trade.direction === 'LONG' 
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      )}>
                        {trade.direction === 'LONG' ? '↑' : '↓'} {trade.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-sm">
                      {trade.contracts}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                        trade.type === 'Copertura' 
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                          : trade.type === 'Falciatura'
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      )}>
                        {trade.type}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-right font-bold",
                      trade.profitEUR >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {trade.profitEUR >= 0 ? '+' : ''}{formatCurrency(trade.profitEUR)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
