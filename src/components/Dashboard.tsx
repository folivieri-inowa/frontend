import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AccountInfo } from '@/types/trading.types'
import { formatCurrency, getPnLColor } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  RefreshCw, 
  History,
  Calendar,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

interface Transaction {
  date: string
  reference: string
  instrumentName: string
  type: string
  openLevel: string
  closeLevel: string
  size: string
  profitAndLoss: string
  currency: string
}

type TimeFilter = 'today' | 'week'
type ViewMode = 'list' | 'grouped'

interface DashboardProps {
  accountInfo: AccountInfo
  positions?: unknown[]
  orders?: unknown[]
  onRefreshPositions?: () => Promise<boolean>
  onRefreshOrders?: () => Promise<boolean>
}

// Helper per normalizzare il nome strumento (raggruppa varianti come "US 500 Cash" e "US 500")
const normalizeInstrumentName = (name: string): string => {
  if (!name) return name
  // Rimuovi suffissi comuni che creano varianti dello stesso strumento
  return name
    .replace(/\s*\([^)]*\)\s*/g, '')      // Rimuovi contenuto tra parentesi es. "(1€)", "($1)"
    .replace(/\s+Cash\s*/gi, ' ')          // Rimuovi "Cash"
    .replace(/\s+Mini\s*/gi, ' ')          // Rimuovi "Mini"  
    .replace(/\s+Spot\s*/gi, ' ')          // Rimuovi "Spot"
    .replace(/\s+Forward\s*/gi, ' ')       // Rimuovi "Forward"
    .replace(/\s+CFD\s*/gi, ' ')           // Rimuovi "CFD"
    .replace(/\s+DFB\s*/gi, ' ')           // Rimuovi "DFB"
    .trim()
    .replace(/\s+/g, ' ')                   // Normalizza spazi multipli
}

// Helper per estrarre valore numerico dal P&L
const parsePnL = (pnlString: string | undefined): number => {
  if (!pnlString) return 0
  const match = pnlString.match(/[-]?[\d,.]+/)
  if (!match) return 0
  const value = parseFloat(match[0].replace(',', '.'))
  return pnlString.includes('-') ? -Math.abs(value) : value
}

// Helper per formattare P&L con simbolo valuta corretto
const formatPnL = (pnlString: string | undefined, currency: string | undefined): string => {
  if (!pnlString) return '-'
  // Mappa dei simboli valuta
  const currencySymbols: Record<string, string> = {
    'EUR': '€',
    'E': '€',
    'USD': '$',
    'GBP': '£',
    'JPY': '¥',
    'CHF': 'CHF '
  }
  // Estrae il valore numerico (gestisce formati come "E12.34" o "-E12.34" o "12.34")
  const match = pnlString.match(/([-]?)\s*[A-Z€$£¥]*\s*([\d,.]+)/)
  if (!match) return pnlString
  
  const isNegative = pnlString.includes('-')
  const numValue = match[2]
  
  // Determina il simbolo dalla currency o dalla stringa P&L
  let symbol = '€' // default
  if (currency && currencySymbols[currency]) {
    symbol = currencySymbols[currency]
  } else if (pnlString.match(/^-?\s*E/)) {
    symbol = '€'
  } else if (pnlString.match(/^-?\s*\$/)) {
    symbol = '$'
  } else if (pnlString.match(/^-?\s*£/)) {
    symbol = '£'
  }
  
  return `${isNegative ? '-' : ''}${symbol}${numValue}`
}

// Helper per formattare data
const formatTxDate = (dateStr: string, short = false): string => {
  const date = new Date(dateStr)
  if (short) {
    return date.toLocaleString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  return date.toLocaleString('it-IT', { 
    day: '2-digit', 
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function Dashboard({ accountInfo }: DashboardProps) {
  const { apiUrl } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Usa P&L dall'account info (dato da IG Markets in real-time)
  const totalPnL = accountInfo.pnl
  const totalMarginUsed = accountInfo.margin

  // Carica le transazioni recenti
  const fetchTransactions = async () => {
    if (!apiUrl) return
    setLoadingTransactions(true)
    try {
      const response = await fetch(`${apiUrl}/api/transactions?limit=100`)
      const data = await response.json()
      if (data.success) {
        setTransactions(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [apiUrl])

  // Filtra transazioni per periodo e ordina cronologicamente
  const filteredTransactions = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    return transactions
      .filter(tx => {
        // Filtra solo DEAL (esclude DEPOSIT, WITHDRAWAL, etc.)
        if (tx.type !== 'DEAL') return false
        
        const txDate = new Date(tx.date)
        switch (timeFilter) {
          case 'today':
            return txDate >= today
          case 'week':
          default:
            return txDate >= weekAgo
        }
      })
      // Ordina per data decrescente (più recenti prima)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, timeFilter])

  // Raggruppa transazioni per strumento (con normalizzazione nomi)
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { transactions: Transaction[], totalPnL: number, count: number, displayName: string }> = {}
    
    filteredTransactions.forEach(tx => {
      // Usa nome normalizzato come chiave per raggruppare varianti dello stesso strumento
      const normalizedKey = normalizeInstrumentName(tx.instrumentName)
      if (!groups[normalizedKey]) {
        groups[normalizedKey] = { transactions: [], totalPnL: 0, count: 0, displayName: tx.instrumentName }
      }
      groups[normalizedKey].transactions.push(tx)
      groups[normalizedKey].totalPnL += parsePnL(tx.profitAndLoss)
      groups[normalizedKey].count++
    })

    // Ordina per P&L totale (dal più alto al più basso)
    return Object.entries(groups)
      .sort((a, b) => b[1].totalPnL - a[1].totalPnL)
  }, [filteredTransactions])

  // Calcola totale P&L delle transazioni filtrate
  const totalFilteredPnL = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + parsePnL(tx.profitAndLoss), 0)
  }, [filteredTransactions])

  const toggleGroup = (instrument: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(instrument)) {
        next.delete(instrument)
      } else {
        next.add(instrument)
      }
      return next
    })
  }

  const filterLabels: Record<TimeFilter, string> = {
    today: 'Oggi',
    week: 'Settimana'
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card hover>
          <CardContent className="flex items-center gap-3 p-4 md:p-6">
            <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Disponibile</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {formatCurrency(accountInfo.balance)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-3 p-4 md:p-6">
            <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Saldo</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {formatCurrency(accountInfo.equity)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-3 p-4 md:p-6">
            <div className={cn(
              "p-2 md:p-3 rounded-lg shrink-0",
              totalPnL >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
            )}>
              {totalPnL >= 0 ? (
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">P&L Aperto</p>
              <p className={cn("text-lg md:text-2xl font-bold truncate", getPnLColor(totalPnL))}>
                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-3 p-4 md:p-6">
            <div className="p-2 md:p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg shrink-0">
              <Activity className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Margine</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {formatCurrency(totalMarginUsed)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <History className="w-5 h-5" />
              Ultime Operazioni
            </CardTitle>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Time Filter */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {(['today', 'week'] as TimeFilter[]).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={cn(
                      "px-3 py-1.5 text-xs md:text-sm font-medium transition-colors",
                      timeFilter === filter
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    {filterLabels[filter]}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'grouped' : 'list')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors border",
                  viewMode === 'grouped'
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Raggruppa</span>
              </button>

              {/* Refresh Button */}
              <Button
                size="sm"
                variant="secondary"
                onClick={fetchTransactions}
                disabled={loadingTransactions}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className={cn("w-4 h-4", loadingTransactions && 'animate-spin')} />
                <span className="hidden sm:inline">Aggiorna</span>
              </Button>
            </div>
          </div>

          {/* Summary Bar */}
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Badge variant="default">
              {filteredTransactions.length} operazioni
            </Badge>
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold",
              totalFilteredPnL >= 0 
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            )}>
              {totalFilteredPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Totale: {totalFilteredPnL >= 0 ? '+' : ''}{formatCurrency(totalFilteredPnL)}
            </div>
            {viewMode === 'grouped' && (
              <Badge variant="info">
                {groupedTransactions.length} strumenti
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {filteredTransactions.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-12">
              {loadingTransactions ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>Caricamento...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <History className="w-8 h-8 opacity-50" />
                  <span>Nessuna operazione per il periodo selezionato</span>
                </div>
              )}
            </div>
          ) : viewMode === 'list' ? (
            /* List View */
            <div className="space-y-2">
              {filteredTransactions.map((tx, idx) => {
                const pnlNum = parsePnL(tx.profitAndLoss)
                
                return (
                  <motion.div
                    key={`${tx.reference}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {tx.instrumentName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                          {tx.size}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {formatTxDate(tx.date)}
                        {tx.openLevel && tx.closeLevel && (
                          <span className="hidden sm:inline">
                            • {tx.openLevel} → {tx.closeLevel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "text-right font-semibold text-sm md:text-base shrink-0 ml-3",
                      getPnLColor(pnlNum)
                    )}>
                      {formatPnL(tx.profitAndLoss, tx.currency)}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            /* Grouped View */
            <div className="space-y-2">
              {groupedTransactions.map(([instrument, data], idx) => {
                const isExpanded = expandedGroups.has(instrument)
                
                return (
                  <motion.div
                    key={instrument}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                  >
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(instrument)}
                      className="w-full flex items-center justify-between p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-8 rounded-full",
                          data.totalPnL >= 0 ? "bg-green-500" : "bg-red-500"
                        )} />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {data.displayName || instrument}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {data.count} operazion{data.count === 1 ? 'e' : 'i'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "font-bold text-sm md:text-base",
                          getPnLColor(data.totalPnL)
                        )}>
                          {data.totalPnL >= 0 ? '+' : ''}{formatCurrency(data.totalPnL)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Group Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                            {data.transactions.map((tx, txIdx) => {
                              const pnlNum = parsePnL(tx.profitAndLoss)
                              
                              return (
                                <div
                                  key={`${tx.reference}-${txIdx}`}
                                  className="flex items-center justify-between p-3 pl-8 text-sm"
                                >
                                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                    <span>{formatTxDate(tx.date, true)}</span>
                                    <span className="text-xs">{tx.size}</span>
                                    {tx.openLevel && tx.closeLevel && (
                                      <span className="hidden md:inline text-xs">
                                        {tx.openLevel} → {tx.closeLevel}
                                      </span>
                                    )}
                                  </div>
                                  <span className={cn("font-medium", getPnLColor(pnlNum))}>
                                    {formatPnL(tx.profitAndLoss, tx.currency)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
