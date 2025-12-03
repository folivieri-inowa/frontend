import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  X,
  AlertCircle,
  Loader2,
  Target,
  DollarSign,
  Package
} from 'lucide-react'
import { cn, formatCurrency, formatNumber, getPnLColor } from '@/lib/utils'

interface Position {
  id: string
  epic: string
  instrument: string
  direction: 'BUY' | 'SELL' | 'LONG' | 'SHORT'
  contracts: number
  openPrice: number
  currentPrice: number
  pnl: number
  limitLevel?: number
  stopLevel?: number
  createdAt: string
}

interface Order {
  id: string
  epic: string
  instrument: string
  direction: 'BUY' | 'SELL'
  size: number
  level: number
  type: 'LIMIT' | 'STOP'
  limitLevel?: number
  stopLevel?: number
  createdAt: string
  status: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function PositionsView() {
  const [positions, setPositions] = useState<Position[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch positions and orders in parallel
      const [posRes, ordRes] = await Promise.all([
        fetch(`${API_BASE}/api/positions`),
        fetch(`${API_BASE}/api/orders`)
      ])
      
      const posData = await posRes.json()
      const ordData = await ordRes.json()
      
      if (posData.success) {
        setPositions(posData.data || [])
      }
      if (ordData.success) {
        setOrders(ordData.data || [])
      }
      
      setError(null)
    } catch (err) {
      setError('Impossibile connettersi al backend')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Refresh ogni 10 secondi
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  // Close position
  const handleClosePosition = async (position: Position) => {
    if (!confirm(`Chiudere la posizione ${position.instrument}?`)) return
    
    try {
      setActionLoading(position.id)
      const response = await fetch(`${API_BASE}/api/positions/${position.id}/close`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchData()
      } else {
        alert(`Errore: ${data.error}`)
      }
    } catch (err) {
      alert('Errore nella comunicazione con il backend')
      console.error('Close error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Cancel order
  const handleCancelOrder = async (order: Order) => {
    if (!confirm(`Annullare l'ordine ${order.instrument}?`)) return
    
    try {
      setActionLoading(order.id)
      const response = await fetch(`${API_BASE}/api/orders/${order.id}/cancel`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchData()
      } else {
        alert(`Errore: ${data.error}`)
      }
    } catch (err) {
      alert('Errore nella comunicazione con il backend')
      console.error('Cancel error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Normalize direction
  const normalizeDirection = (dir: string): 'LONG' | 'SHORT' => {
    return dir === 'BUY' || dir === 'LONG' ? 'LONG' : 'SHORT'
  }

  // Group positions by epic
  const groupedPositions = positions.reduce((acc, pos) => {
    if (!acc[pos.epic]) acc[pos.epic] = []
    acc[pos.epic].push(pos)
    return acc
  }, {} as Record<string, Position[]>)

  // Calculate totals
  const totalPnL = positions.reduce((sum, p) => sum + (p.pnl || 0), 0)
  const totalContracts = positions.reduce((sum, p) => sum + p.contracts, 0)

  if (loading && positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Caricamento posizioni...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Posizioni & Ordini</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {positions.length} posizioni aperte • {orders.length} ordini pendenti
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Aggiorna
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-lg",
              totalPnL >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
            )}>
              <DollarSign className={cn(
                "w-6 h-6",
                totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">P&L Totale</p>
              <p className={cn("text-2xl font-bold", getPnLColor(totalPnL))}>
                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Contratti Totali</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(totalContracts)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ordini Pendenti</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Positions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">📊 Posizioni Aperte</h3>
        
        {positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            Nessuna posizione aperta
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(groupedPositions).map(([epic, epicPositions]) => (
              <div key={epic} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {epicPositions[0]?.instrument || epic}
                  </h4>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {epicPositions.map((position) => {
                    const dir = normalizeDirection(position.direction)
                    return (
                      <motion.div
                        key={position.id}
                        className="p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {dir === 'LONG' ? (
                              <TrendingUp className="w-5 h-5 text-green-500" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-500" />
                            )}
                            <span className={cn(
                              "font-semibold",
                              dir === 'LONG' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                              {dir}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {position.contracts} contratti
                            </span>
                          </div>
                          <button
                            onClick={() => handleClosePosition(position)}
                            disabled={actionLoading === position.id}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Chiudi posizione"
                          >
                            {actionLoading === position.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Apertura:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {formatNumber(position.openPrice)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Corrente:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {formatNumber(position.currentPrice)}
                            </span>
                          </div>
                          {position.limitLevel && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">TP:</span>
                              <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                                {formatNumber(position.limitLevel)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">P&L:</span>
                            <span className={cn("ml-2 font-bold", getPnLColor(position.pnl))}>
                              {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">📋 Ordini Pendenti</h3>
        
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            Nessun ordine pendente
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Strumento</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Direzione</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Tipo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Prezzo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Contratti</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">TP</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((order) => {
                  const dir = normalizeDirection(order.direction)
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {order.instrument || order.epic}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          dir === 'LONG' 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {dir === 'LONG' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {dir}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {order.type}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {formatNumber(order.level)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                        {order.size}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                        {order.limitLevel ? formatNumber(order.limitLevel) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleCancelOrder(order)}
                          disabled={actionLoading === order.id}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Annulla ordine"
                        >
                          {actionLoading === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
