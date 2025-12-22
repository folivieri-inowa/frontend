import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Loader2,
  Target,
  DollarSign,
  Package,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react'
import { cn, formatCurrency, formatNumber, getPnLColor } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import type { Position, Order } from '@/types/trading.types'

interface RecoveryProposal {
  id: string;
  epic: string;
  proposedAction: string;
  description: string;
  impact: string;
  status: string;
}

interface GroupedData {
  epic: string
  instrument: string
  positions: Position[]
  orders: Order[]
}

interface PositionsViewProps {
  positions: Position[]
  orders: Order[]
  onRefreshPositions: () => Promise<boolean>
  onRefreshOrders: () => Promise<boolean>
}

export function PositionsView({ positions, orders, onRefreshPositions, onRefreshOrders }: PositionsViewProps) {
  const { apiUrl } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [checkingEpic, setCheckingEpic] = useState<string | null>(null)
  const [pendingProposal, setPendingProposal] = useState<RecoveryProposal | null>(null)

  // Manual refresh
  const handleRefresh = async () => {
    setLoading(true)
    await Promise.all([onRefreshPositions(), onRefreshOrders()])
    setLoading(false)
  }

  // 🛡️ Recovery Check per singolo epic
  const handleRecoveryCheck = async (epic: string, instrument: string) => {
    try {
      setCheckingEpic(epic)
      
      const response = await fetch(`${apiUrl}/api/recovery/check/${encodeURIComponent(epic)}`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        if (data.data.healthy) {
          // Stato sano
          alert(`✅ ${instrument}\n\nStato verificato: SANO\n\n${data.data.message}`)
        } else if (data.data.proposal) {
          // C'è una proposta - mostra dialog
          setPendingProposal(data.data.proposal)
        } else {
          alert(`⚠️ ${instrument}\n\nAnomalia rilevata: ${data.data.message}`)
        }
      } else {
        alert(`❌ Errore: ${data.error}`)
      }
    } catch (err) {
      alert('Errore nella comunicazione con il backend')
      console.error('Recovery check error:', err)
    } finally {
      setCheckingEpic(null)
    }
  }

  // 🛡️ Check globale
  const handleGlobalCheck = async () => {
    if (!confirm('Eseguire check di tutti gli strumenti attivi?\n\nQuesto controllerà lo stato di tutte le posizioni e ordini.')) return
    
    try {
      setLoading(true)
      
      const response = await fetch(`${apiUrl}/api/recovery/check-all`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        const { total, healthy, unhealthy } = data.data
        if (unhealthy === 0) {
          alert(`✅ Check Globale Completato\n\n${total} strumenti controllati\n✅ Tutti sani!`)
        } else {
          alert(`⚠️ Check Globale Completato\n\n${total} strumenti controllati\n✅ ${healthy} sani\n⚠️ ${unhealthy} con anomalie\n\nControlla le notifiche per i dettagli.`)
        }
      } else {
        alert(`❌ Errore: ${data.error}`)
      }
    } catch (err) {
      alert('Errore nella comunicazione con il backend')
      console.error('Global check error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Conferma proposta
  const handleConfirmProposal = async () => {
    if (!pendingProposal) return
    
    try {
      setLoading(true)
      
      const response = await fetch(`${apiUrl}/api/recovery/proposals/${pendingProposal.id}/confirm`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ Azione eseguita: ${data.data.message}`)
        // Refresh positions after action
        await Promise.all([onRefreshPositions(), onRefreshOrders()])
      } else {
        alert(`❌ Errore: ${data.error || data.data?.message}`)
      }
    } catch (err) {
      alert('Errore nella comunicazione con il backend')
      console.error('Confirm proposal error:', err)
    } finally {
      setPendingProposal(null)
      setLoading(false)
    }
  }

  // ❌ Rifiuta proposta
  const handleRejectProposal = async () => {
    if (!pendingProposal) return
    
    try {
      await fetch(`${apiUrl}/api/recovery/proposals/${pendingProposal.id}/reject`, {
        method: 'POST'
      })
      alert('Proposta rifiutata - nessuna azione eseguita')
    } catch (err) {
      console.error('Reject proposal error:', err)
    } finally {
      setPendingProposal(null)
    }
  }

  // Normalize direction
  const normalizeDirection = (dir: string): 'LONG' | 'SHORT' => {
    return dir === 'BUY' || dir === 'LONG' ? 'LONG' : 'SHORT'
  }

  // Group positions and orders by epic
  const groupedByEpic = (): GroupedData[] => {
    const epicMap = new Map<string, GroupedData>()
    
    // Add positions
    positions.forEach(pos => {
      if (!epicMap.has(pos.epic)) {
        epicMap.set(pos.epic, {
          epic: pos.epic,
          instrument: pos.instrument || pos.epic,
          positions: [],
          orders: []
        })
      }
      epicMap.get(pos.epic)!.positions.push(pos)
    })
    
    // Add orders
    orders.forEach(ord => {
      if (!epicMap.has(ord.epic)) {
        epicMap.set(ord.epic, {
          epic: ord.epic,
          instrument: ord.instrument || ord.epic,
          positions: [],
          orders: []
        })
      }
      epicMap.get(ord.epic)!.orders.push(ord)
    })
    
    return Array.from(epicMap.values()).sort((a, b) => a.instrument.localeCompare(b.instrument))
  }

  const grouped = groupedByEpic()

  // Calculate totals
  const totalPnL = positions.reduce((sum, p) => sum + (p.pnl || 0), 0)
  const totalContracts = positions.reduce((sum, p) => sum + p.contracts, 0)

  return (
    <div className="space-y-6">
      {/* 🛡️ Proposal Modal */}
      {pendingProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Proposta Recovery
              </h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {pendingProposal.description}
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                  Azione proposta:
                </p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {pendingProposal.proposedAction}
                </p>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-1">
                  Impatto:
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {pendingProposal.impact}
                </p>
              </div>
              
              {/* ⚠️ Avviso speciale per azioni distruttive */}
              {(pendingProposal.proposedAction === 'CLOSE_ALL' || pendingProposal.proposedAction === 'CLEAN_AND_RESTART') && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-600 dark:text-red-400 font-bold mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    ATTENZIONE - AZIONE IRREVERSIBILE
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Se lo stato non è recuperabile, verranno <strong>chiuse tutte le posizioni</strong> e <strong>cancellati tutti gli ordini</strong> pendenti su questo strumento.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleRejectProposal}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ❌ Rifiuta
              </button>
              <button
                onClick={handleConfirmProposal}
                disabled={loading}
                className={cn(
                  "flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2",
                  (pendingProposal.proposedAction === 'CLOSE_ALL' || pendingProposal.proposedAction === 'CLEAN_AND_RESTART')
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {(pendingProposal.proposedAction === 'CLOSE_ALL' || pendingProposal.proposedAction === 'CLEAN_AND_RESTART')
                  ? '⚠️ Conferma Chiusura'
                  : '✅ Conferma'
                }
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Posizioni & Ordini</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {positions.length} posizioni aperte • {orders.length} ordini pendenti
            <span className="ml-2 text-xs text-green-500">● Live</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGlobalCheck}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
            title="Verifica stato di tutti gli strumenti"
          >
            <ShieldCheck className="w-4 h-4" />
            Check
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Aggiorna
          </button>
        </div>
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

      {/* Grouped by Epic */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">📊 Posizioni & Ordini per Strumento</h3>
        
        {grouped.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            Nessuna posizione o ordine
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {grouped.map((group) => {
              const groupPnL = group.positions.reduce((sum, p) => sum + (p.pnl || 0), 0)
              return (
                <div key={group.epic} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {group.instrument}
                      </h4>
                      <div className="flex items-center gap-2">
                        {group.positions.length > 0 && (
                          <span className={cn("text-sm font-medium", getPnLColor(groupPnL))}>
                            {groupPnL >= 0 ? '+' : ''}{formatCurrency(groupPnL)}
                          </span>
                        )}
                        {/* 🛡️ Check button per singolo strumento */}
                        <button
                          onClick={() => handleRecoveryCheck(group.epic, group.instrument)}
                          disabled={checkingEpic === group.epic}
                          className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors disabled:opacity-50"
                          title="Verifica stato strumento"
                        >
                          {checkingEpic === group.epic ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {group.positions.length} posizioni • {group.orders.length} ordini
                    </p>
                  </div>
                  
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {/* Aggregated Positions Summary */}
                    {group.positions.length > 0 && (
                      <motion.div
                        className="p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              POSIZIONI ({group.positions.length})
                            </span>
                          </div>
                          <span className={cn("text-lg font-bold", getPnLColor(groupPnL))}>
                            {groupPnL >= 0 ? '+' : ''}{formatCurrency(groupPnL)}
                          </span>
                        </div>
                        
                        {/* Breakdown per direzione */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {/* LONG positions */}
                          {(() => {
                            const longPositions = group.positions.filter(p => normalizeDirection(p.direction) === 'LONG')
                            const longContracts = longPositions.reduce((sum, p) => sum + p.contracts, 0)
                            const longPnL = longPositions.reduce((sum, p) => sum + (p.pnl || 0), 0)
                            return longPositions.length > 0 ? (
                              <div className="bg-green-50/50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 mb-2">
                                  <TrendingUp className="w-4 h-4 text-green-500" />
                                  <span className="font-semibold text-green-600 dark:text-green-400">
                                    LONG × {longContracts}
                                  </span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Posizioni:</span>
                                    <span className="font-medium">{longPositions.length}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">P&L:</span>
                                    <span className={cn("font-bold", getPnLColor(longPnL))}>
                                      {longPnL >= 0 ? '+' : ''}{formatCurrency(longPnL)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : null
                          })()}
                          
                          {/* SHORT positions */}
                          {(() => {
                            const shortPositions = group.positions.filter(p => normalizeDirection(p.direction) === 'SHORT')
                            const shortContracts = shortPositions.reduce((sum, p) => sum + p.contracts, 0)
                            const shortPnL = shortPositions.reduce((sum, p) => sum + (p.pnl || 0), 0)
                            return shortPositions.length > 0 ? (
                              <div className="bg-red-50/50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                <div className="flex items-center gap-2 mb-2">
                                  <TrendingDown className="w-4 h-4 text-red-500" />
                                  <span className="font-semibold text-red-600 dark:text-red-400">
                                    SHORT × {shortContracts}
                                  </span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Posizioni:</span>
                                    <span className="font-medium">{shortPositions.length}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">P&L:</span>
                                    <span className={cn("font-bold", getPnLColor(shortPnL))}>
                                      {shortPnL >= 0 ? '+' : ''}{formatCurrency(shortPnL)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : null
                          })()}
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Orders */}
                    {group.orders.map((order) => {
                      const dir = normalizeDirection(order.direction)
                      const tpLevel = order.tpLevel || order.limitLevel
                      return (
                        <motion.div
                          key={order.id}
                          className="p-4 bg-purple-50/30 dark:bg-purple-900/10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                                Ordine
                              </span>
                              {dir === 'LONG' ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                              <span className={cn(
                                "font-semibold text-sm",
                                dir === 'LONG' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              )}>
                                {dir} {order.contracts}
                              </span>
                            </div>

                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Entry:</span>
                              <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                {formatNumber(order.entryPrice)}
                              </span>
                            </div>
                            {tpLevel && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">TP:</span>
                                <span className="ml-1 font-medium text-green-600 dark:text-green-400">
                                  {formatNumber(tpLevel)}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Status:</span>
                              <span className="ml-1 font-medium text-gray-600 dark:text-gray-300">
                                {order.status}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
