import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { 
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Table2,
  Loader2,
  Zap,
  Trash2
} from 'lucide-react'

// Tipi
interface TableInfo {
  id: string
  name: string
  description: string
  count: number
  icon: string
  category: string
}

interface SyncStatus {
  synced: boolean
  lastCheck: string
  positions: {
    ig: number
    db: number
    synced: boolean
    missing: string[]
    extra: string[]
  }
  orders: {
    ig: number
    db: number
    synced: boolean
    missing: string[]
    extra: string[]
  }
}

interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  trading: { label: 'Trading', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
  config: { label: 'Configurazione', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' },
  history: { label: 'Storico', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' },
  stats: { label: 'Statistiche', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
}

// Colonne importanti per ogni tabella
const TABLE_COLUMNS: Record<string, string[]> = {
  positions: ['id', 'instrument', '_directionLabel', 'contracts', 'openPrice', 'currentPrice', '_statusLabel', 'updatedAt'],
  orders: ['id', 'instrument', '_directionLabel', 'contracts', 'entryPrice', 'orderType', '_statusLabel', 'createdAt'],
  tradingStates: ['epic', 'instrumentName', '_phaseLabel', 'currentDirection', 'currentContracts', 'isActive', 'updatedAt'],
  instrumentConfigs: ['epic', 'name', 'type', 'defaultContracts', 'harvestPercentage', 'isActive'],
  tradeHistory: ['epic', 'action', '_directionLabel', 'contracts', 'executedPrice', 'profitLoss', 'closedAt'],
  systemLogs: ['epic', 'level', 'category', 'message', 'timestamp'],
  tradeCycles: ['instrument', 'cycleType', 'description', 'profitEUR', 'durationSeconds', 'completedAt'],
  instrumentStats: ['instrument', 'totalCycles', 'winRate', 'totalProfitEUR', 'lastCycleAt'],
}

// Etichette colonne
const COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  epic: 'Epic',
  instrument: 'Strumento',
  instrumentName: 'Strumento',
  name: 'Nome',
  type: 'Tipo',
  _directionLabel: 'Direzione',
  direction: 'Direzione',
  contracts: 'Contratti',
  currentContracts: 'Contratti',
  defaultContracts: 'Contratti Default',
  openPrice: 'Prezzo Apertura',
  currentPrice: 'Prezzo Corrente',
  entryPrice: 'Prezzo Entry',
  executedPrice: 'Prezzo Eseguito',
  orderType: 'Tipo Ordine',
  _statusLabel: 'Stato',
  status: 'Stato',
  _phaseLabel: 'Fase',
  phase: 'Fase',
  isActive: 'Attivo',
  harvestPercentage: '% Falciatura',
  action: 'Azione',
  profitLoss: 'P&L',
  profitEUR: 'Profitto €',
  level: 'Livello',
  category: 'Categoria',
  message: 'Messaggio',
  cycleType: 'Tipo Ciclo',
  description: 'Descrizione',
  durationSeconds: 'Durata',
  totalCycles: 'Cicli Totali',
  winRate: 'Win Rate',
  totalProfitEUR: 'Profitto Totale',
  createdAt: 'Creato',
  updatedAt: 'Aggiornato',
  timestamp: 'Data/Ora',
  executedAt: 'Eseguito',
  completedAt: 'Completato',
  lastCycleAt: 'Ultimo Ciclo',
  currentDirection: 'Direzione',
}

export function DatabaseView() {
  const { apiUrl } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Fetch tabelle e sync status
  const fetchTablesAndSync = useCallback(async () => {
    if (!apiUrl) return
    setLoading(true)
    
    try {
      const [tablesRes, syncRes] = await Promise.all([
        fetch(`${apiUrl}/api/db/tables`),
        fetch(`${apiUrl}/api/db/sync-status`),
      ])

      if (tablesRes.ok) {
        const { data } = await tablesRes.json()
        setTables(data)
      }

      if (syncRes.ok) {
        const { data } = await syncRes.json()
        setSyncStatus(data)
      }
    } catch (error) {
      console.error('Error fetching database info:', error)
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  // Fetch dati tabella
  const fetchTableData = useCallback(async (table: string, offset = 0) => {
    if (!apiUrl) return
    setLoadingData(true)
    
    try {
      const res = await fetch(`${apiUrl}/api/db/${table}?limit=20&offset=${offset}`)
      if (res.ok) {
        const { data, pagination: pag } = await res.json()
        setTableData(data)
        setPagination(pag)
      }
    } catch (error) {
      console.error('Error fetching table data:', error)
    } finally {
      setLoadingData(false)
    }
  }, [apiUrl])

  // Forza sync
  const forceSync = async () => {
    if (!apiUrl) return
    setSyncing(true)
    
    try {
      const res = await fetch(`${apiUrl}/api/db/force-sync`, { method: 'POST' })
      if (res.ok) {
        await fetchTablesAndSync()
        if (selectedTable) {
          await fetchTableData(selectedTable)
        }
      }
    } catch (error) {
      console.error('Error forcing sync:', error)
    } finally {
      setSyncing(false)
    }
  }

  // Reset database
  const handleResetDatabase = async () => {
    if (!apiUrl) return
    setResetting(true)
    
    try {
      const res = await fetch(`${apiUrl}/api/db/reset`, { method: 'POST' })
      if (res.ok) {
        setShowResetModal(false)
        setSelectedTable(null)
        setTableData([])
        await fetchTablesAndSync()
      } else {
        alert('Errore durante il reset del database')
      }
    } catch (error) {
      console.error('Error resetting database:', error)
      alert('Errore durante il reset del database')
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => {
    fetchTablesAndSync()
  }, [fetchTablesAndSync])

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable)
    }
  }, [selectedTable, fetchTableData])

  // Raggruppa tabelle per categoria
  const groupedTables = tables.reduce((acc, table) => {
    if (!acc[table.category]) acc[table.category] = []
    acc[table.category].push(table)
    return acc
  }, {} as Record<string, TableInfo[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Reset Database
              </h3>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Sei sicuro di voler resettare completamente il database? Questa operazione:
            </p>
            
            <ul className="text-sm text-gray-600 dark:text-gray-300 mb-6 space-y-2 list-disc list-inside">
              <li>Eliminerà tutte le posizioni salvate</li>
              <li>Eliminerà tutti gli ordini salvati</li>
              <li>Eliminerà lo storico dei trade</li>
              <li>Resetterà tutte le configurazioni</li>
              <li className="font-bold text-red-600 dark:text-red-400">Questa azione è IRREVERSIBILE</li>
            </ul>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowResetModal(false)}
                variant="secondary"
                className="flex-1"
                disabled={resetting}
              >
                Annulla
              </Button>
              <Button
                onClick={handleResetDatabase}
                variant="danger"
                className="flex-1"
                disabled={resetting}
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset DB
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
          <div>
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Database Explorer
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              Visualizza e verifica la sincronizzazione del database
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchTablesAndSync()}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Aggiorna
          </Button>
          <Button 
            onClick={() => setShowResetModal(true)}
            variant="danger"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Reset DB
          </Button>
        </div>
      </div>

      {/* Sync Status Card */}
      {syncStatus && (
        <Card className={cn(
          "border-2",
          syncStatus.synced 
            ? "border-green-200 dark:border-green-800" 
            : "border-red-200 dark:border-red-800"
        )}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                {syncStatus.synced ? (
                  <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                    {syncStatus.synced ? '✅ DB Sincronizzato' : '⚠️ Sync Necessaria'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Ultimo: {new Date(syncStatus.lastCheck).toLocaleTimeString('it-IT')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                {/* Posizioni */}
                <div className="text-center">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className={cn(
                      "text-lg sm:text-2xl font-bold",
                      syncStatus.positions.synced ? "text-green-600" : "text-red-600"
                    )}>
                      {syncStatus.positions.db}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span className="text-sm sm:text-lg text-gray-500">{syncStatus.positions.ig}</span>
                  </div>
                  <p className="text-xs text-gray-500">Posizioni</p>
                </div>

                {/* Ordini */}
                <div className="text-center">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className={cn(
                      "text-lg sm:text-2xl font-bold",
                      syncStatus.orders.synced ? "text-green-600" : "text-red-600"
                    )}>
                      {syncStatus.orders.db}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span className="text-sm sm:text-lg text-gray-500">{syncStatus.orders.ig}</span>
                  </div>
                  <p className="text-xs text-gray-500">Ordini</p>
                </div>

                {/* Bottone Forza Sync */}
                {!syncStatus.synced && (
                  <Button 
                    onClick={forceSync}
                    disabled={syncing}
                    size="sm"
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Forza Sync</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Dettagli mismatch */}
            {!syncStatus.synced && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {syncStatus.positions.missing.length > 0 && (
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        Posizioni mancanti nel DB:
                      </p>
                      <p className="text-yellow-600 dark:text-yellow-300 text-xs mt-1">
                        {syncStatus.positions.missing.join(', ')}
                      </p>
                    </div>
                  )}
                  {syncStatus.orders.missing.length > 0 && (
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        Ordini mancanti nel DB:
                      </p>
                      <p className="text-yellow-600 dark:text-yellow-300 text-xs mt-1">
                        {syncStatus.orders.missing.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Layout a due colonne su desktop, stack su mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Lista Tabelle */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="w-5 h-5" />
                Tabelle
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {Object.entries(groupedTables).map(([category, categoryTables]) => (
                <div key={category}>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <Badge className={CATEGORY_LABELS[category]?.color}>
                      {CATEGORY_LABELS[category]?.label || category}
                    </Badge>
                  </div>
                  {categoryTables.map((table) => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                        selectedTable === table.id && "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{table.icon}</span>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {table.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                            {table.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          {Math.floor(table.count)}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Contenuto Tabella */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedTable ? (
              <motion.div
                key={selectedTable}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        {tables.find(t => t.id === selectedTable)?.icon}{' '}
                        {tables.find(t => t.id === selectedTable)?.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {pagination && (
                          <span className="text-sm text-gray-500">
                            {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} di {pagination.total}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!pagination || pagination.offset === 0}
                          onClick={() => fetchTableData(selectedTable, pagination!.offset - pagination!.limit)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!pagination?.hasMore}
                          onClick={() => fetchTableData(selectedTable, pagination!.offset + pagination!.limit)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingData ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                    ) : tableData.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Nessun dato in questa tabella
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              {(TABLE_COLUMNS[selectedTable] || Object.keys(tableData[0] || {}).slice(0, 8)).map((col) => (
                                <th 
                                  key={col} 
                                  className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400"
                                >
                                  {COLUMN_LABELS[col] || col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tableData.map((row, idx) => (
                              <tr 
                                key={row.id || idx}
                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              >
                                {(TABLE_COLUMNS[selectedTable] || Object.keys(row).slice(0, 8)).map((col) => (
                                  <td key={col} className="py-2 px-3">
                                    {formatCellValue(col, row[col])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 text-gray-500"
              >
                <Database className="w-16 h-16 mb-4 opacity-30" />
                <p>Seleziona una tabella per visualizzare i dati</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Formatta valore cella per visualizzazione
function formatCellValue(column: string, value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">-</span>
  }

  // Booleani
  if (typeof value === 'boolean') {
    return value ? (
      <span className="text-green-500">✓</span>
    ) : (
      <span className="text-gray-400">✗</span>
    )
  }

  // Date ISO
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    const date = new Date(value)
    return (
      <span className="text-gray-600 dark:text-gray-400">
        {date.toLocaleDateString('it-IT')} {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
      </span>
    )
  }

  // Numeri con EUR
  if (column.toLowerCase().includes('eur') || column.toLowerCase().includes('profit')) {
    const num = typeof value === 'number' ? value : parseFloat(value)
    if (!isNaN(num)) {
      return (
        <span className={cn(
          "font-medium",
          num >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}>
          {num >= 0 ? '+' : ''}{num.toFixed(2)} €
        </span>
      )
    }
  }

  // Win Rate
  if (column === 'winRate') {
    const num = typeof value === 'number' ? value : parseFloat(value)
    return (
      <span className={cn(
        "font-medium",
        num >= 50 ? "text-green-600" : "text-red-600"
      )}>
        {num.toFixed(1)}%
      </span>
    )
  }

  // Durata in secondi
  if (column === 'durationSeconds') {
    const secs = typeof value === 'number' ? value : parseInt(value)
    if (secs < 60) return `${secs}s`
    if (secs < 3600) return `${Math.floor(secs / 60)}m`
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
  }

  // ID lunghi: tronca
  if (column === 'id' && typeof value === 'string' && value.length > 20) {
    return (
      <span className="font-mono text-xs" title={value}>
        {value.substring(0, 8)}...
      </span>
    )
  }

  // Oggetti JSON
  if (typeof value === 'object') {
    return (
      <span className="text-xs text-gray-500 font-mono">
        {JSON.stringify(value).substring(0, 50)}...
      </span>
    )
  }

  return String(value)
}
