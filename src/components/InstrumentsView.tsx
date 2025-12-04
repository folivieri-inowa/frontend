import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Play, 
  Square, 
  Settings2, 
  RefreshCw,
  AlertCircle,
  Check,
  X,
  Loader2,
  Power,
  PlayCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface InstrumentConfig {
  epic: string
  name: string
  type: string
  harvestPercentage: number
  defaultContracts: number
  defaultTPPoints: number
  isActive: boolean
  hasConfig: boolean
}

interface StartParams {
  contracts: number
  tpPoints: number
  direction: 'LONG' | 'SHORT'
  orderDistanceDivisor: number
}

export function InstrumentsView() {
  const { apiUrl } = useAuthStore()
  const [instruments, setInstruments] = useState<InstrumentConfig[]>([])
  const [pausedEpics, setPausedEpics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [showStartModal, setShowStartModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentConfig | null>(null)
  
  // Form state
  const [startParams, setStartParams] = useState<StartParams>({
    contracts: 1,
    tpPoints: 90,
    direction: 'LONG',
    orderDistanceDivisor: 3
  })
  const [configParams, setConfigParams] = useState({
    harvestPercentage: 67,
    defaultContracts: 1,
    defaultTPPoints: 90
  })
  
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch instruments from backend
  const fetchInstruments = async () => {
    if (!apiUrl) return
    try {
      setLoading(true)
      const response = await fetch(`${apiUrl}/api/instruments/whitelist`)
      const data = await response.json()
      
      if (data.success) {
        setInstruments(data.data)
        setError(null)
      } else {
        setError(data.error || 'Errore nel caricamento strumenti')
      }
    } catch (err) {
      setError('Impossibile connettersi al backend')
      console.error('Fetch instruments error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch paused epics
  const fetchPausedEpics = async () => {
    if (!apiUrl) return
    try {
      const response = await fetch(`${apiUrl}/api/instruments/paused`)
      const data = await response.json()
      
      if (data.success) {
        setPausedEpics(data.data.map((i: { epic: string }) => i.epic))
      }
    } catch (err) {
      console.error('Fetch paused epics error:', err)
    }
  }

  useEffect(() => {
    fetchInstruments()
    fetchPausedEpics()
    // No polling - gli strumenti non cambiano frequentemente
    // Usare il tasto Aggiorna per refresh manuale
  }, [])

  // Open start modal
  const handleOpenStart = (instrument: InstrumentConfig) => {
    setSelectedInstrument(instrument)
    setStartParams({
      contracts: instrument.defaultContracts,
      tpPoints: instrument.defaultTPPoints,
      direction: 'LONG',
      orderDistanceDivisor: 3  // Default
    })
    setShowStartModal(true)
  }

  // Open config modal
  const handleOpenConfig = (instrument: InstrumentConfig) => {
    setSelectedInstrument(instrument)
    setConfigParams({
      harvestPercentage: instrument.harvestPercentage,
      defaultContracts: instrument.defaultContracts,
      defaultTPPoints: instrument.defaultTPPoints
    })
    setShowConfigModal(true)
  }

  // Start instrument
  const handleStart = async () => {
    if (!selectedInstrument) return
    
    try {
      setActionLoading(selectedInstrument.epic)
      const response = await fetch(`${apiUrl}/api/instruments/${selectedInstrument.epic}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startParams)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setShowStartModal(false)
        fetchInstruments()
      } else {
        alert(`Errore: ${data.error}`)
      }
    } catch (err) {
      alert('Errore nella comunicazione con il backend')
      console.error('Start error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Stop instrument
  const handleStop = async (instrument: InstrumentConfig) => {
    if (!confirm(`Fermare ${instrument.name}? Le posizioni rimarranno aperte.`)) return
    
    try {
      setActionLoading(instrument.epic)
      const response = await fetch(`${apiUrl}/api/instruments/${instrument.epic}/stop`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchInstruments()
      } else {
        alert(`Errore: ${data.error}`)
      }
    } catch (err) {
      alert('Errore nella comunicazione con il backend')
      console.error('Stop error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Shutdown instrument (chiude tutto e mette in pausa)
  const handleShutdown = async (instrument: InstrumentConfig) => {
    if (!confirm(`⚠️ SHUTDOWN COMPLETO di ${instrument.name}?\n\nQuesta operazione:\n• Chiuderà TUTTE le posizioni aperte\n• Cancellerà TUTTI gli ordini pendenti\n• Metterà lo strumento in PAUSA\n\nGenesis NON reagirà più agli eventi su questo strumento fino a quando non lo riattiverai.`)) return
    
    try {
      setActionLoading(instrument.epic)
      const response = await fetch(`${apiUrl}/api/instruments/${instrument.epic}/shutdown`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ Shutdown completato per ${instrument.name}\n\nPosizioni chiuse: ${data.data.positionsClosed}\nOrdini cancellati: ${data.data.ordersCancelled}\n\nLo strumento è ora in PAUSA.`)
        fetchInstruments()
        fetchPausedEpics()
      } else {
        alert(`Errore: ${data.error}`)
      }
    } catch (err) {
      alert('Errore nella comunicazione con il backend')
      console.error('Shutdown error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Unpause instrument
  const handleUnpause = async (instrument: InstrumentConfig) => {
    if (!confirm(`Riattivare ${instrument.name}?\n\nGenesis tornerà a reagire agli eventi su questo strumento.`)) return
    
    try {
      setActionLoading(instrument.epic)
      const response = await fetch(`${apiUrl}/api/instruments/${instrument.epic}/unpause`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchInstruments()
        fetchPausedEpics()
      } else {
        alert(`Errore: ${data.error}`)
      }
    } catch (err) {
      alert('Errore nella comunicazione con il backend')
      console.error('Unpause error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Update config
  const handleUpdateConfig = async () => {
    if (!selectedInstrument) return
    
    try {
      setActionLoading(selectedInstrument.epic)
      const response = await fetch(`${apiUrl}/api/instruments/${selectedInstrument.epic}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configParams)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setShowConfigModal(false)
        fetchInstruments()
      } else {
        alert(`Errore: ${data.error}`)
      }
    } catch (err) {
      alert('Errore nella comunicazione con il backend')
      console.error('Update config error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Group instruments by type
  const groupedInstruments = instruments.reduce((acc, inst) => {
    if (!acc[inst.type]) acc[inst.type] = []
    acc[inst.type].push(inst)
    return acc
  }, {} as Record<string, InstrumentConfig[]>)

  const typeLabels: Record<string, string> = {
    'FOREX': '💱 Forex',
    'INDEX': '📊 Indici',
    'COMMODITY': '🛢️ Materie Prime',
    'CRYPTO': '₿ Crypto'
  }

  const typeOrder = ['FOREX', 'INDEX', 'COMMODITY', 'CRYPTO']

  if (loading && instruments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Caricamento strumenti...</span>
      </div>
    )
  }

  if (error && instruments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p>{error}</p>
        <button 
          onClick={fetchInstruments}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Riprova
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Strumenti</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {instruments.filter(i => i.isActive).length} attivi su {instruments.length} disponibili
          </p>
        </div>
        <button
          onClick={fetchInstruments}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Aggiorna
        </button>
      </div>

      {/* Instruments by Type */}
      {typeOrder.map(type => {
        const typeInstruments = groupedInstruments[type]
        if (!typeInstruments || typeInstruments.length === 0) return null

        return (
          <div key={type} className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {typeLabels[type] || type}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeInstruments.map(instrument => (
                <motion.div
                  key={instrument.epic}
                  className={cn(
                    "bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border",
                    instrument.isActive 
                      ? "border-green-500 dark:border-green-600" 
                      : "border-gray-200 dark:border-gray-700"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        pausedEpics.includes(instrument.epic) 
                          ? "bg-orange-500" 
                          : instrument.isActive 
                            ? "bg-green-500" 
                            : "bg-gray-400"
                      )} />
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {instrument.name}
                      </h4>
                      {pausedEpics.includes(instrument.epic) && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                          PAUSA
                        </span>
                      )}
                    </div>
                    
                    {/* Config button */}
                    <button
                      onClick={() => handleOpenConfig(instrument)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Configura"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Config info */}
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                    <div className="flex justify-between">
                      <span>Falciatura:</span>
                      <span className="font-medium">{instrument.harvestPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contratti:</span>
                      <span className="font-medium">{instrument.defaultContracts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TP Points:</span>
                      <span className="font-medium">{instrument.defaultTPPoints}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {pausedEpics.includes(instrument.epic) ? (
                      /* Strumento in PAUSA */
                      <button
                        onClick={() => handleUnpause(instrument)}
                        disabled={actionLoading === instrument.epic}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading === instrument.epic ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <PlayCircle className="w-4 h-4" />
                        )}
                        Riattiva
                      </button>
                    ) : instrument.isActive ? (
                      /* Strumento ATTIVO */
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStop(instrument)}
                          disabled={actionLoading === instrument.epic}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Ferma orchestrator (posizioni restano aperte)"
                        >
                          {actionLoading === instrument.epic ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          Stop
                        </button>
                        <button
                          onClick={() => handleShutdown(instrument)}
                          disabled={actionLoading === instrument.epic}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Chiudi tutto e metti in pausa"
                        >
                          {actionLoading === instrument.epic ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                          Shutdown
                        </button>
                      </div>
                    ) : (
                      /* Strumento INATTIVO */
                      <button
                        onClick={() => handleOpenStart(instrument)}
                        disabled={actionLoading === instrument.epic}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading === instrument.epic ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        Avvia
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Start Modal */}
      <AnimatePresence>
        {showStartModal && selectedInstrument && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStartModal(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Avvia {selectedInstrument.name}
              </h3>
              
              <div className="space-y-4">
                {/* Contracts */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Numero Contratti
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={startParams.contracts}
                    onChange={(e) => setStartParams({ ...startParams, contracts: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* TP Points */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Take Profit (punti)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={startParams.tpPoints}
                    onChange={(e) => setStartParams({ ...startParams, tpPoints: parseFloat(e.target.value) || 10 })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Direction */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Direzione
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStartParams({ ...startParams, direction: 'LONG' })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors",
                        startParams.direction === 'LONG'
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                      )}
                    >
                      <TrendingUp className="w-5 h-5" />
                      LONG
                    </button>
                    <button
                      onClick={() => setStartParams({ ...startParams, direction: 'SHORT' })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors",
                        startParams.direction === 'SHORT'
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                      )}
                    >
                      <TrendingDown className="w-5 h-5" />
                      SHORT
                    </button>
                  </div>
                </div>

                {/* Order Distance Divisor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Distanza Ordine Opposto
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={startParams.orderDistanceDivisor}
                      onChange={(e) => setStartParams({ ...startParams, orderDistanceDivisor: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-24 text-right font-medium text-gray-900 dark:text-white">
                      TP / {startParams.orderDistanceDivisor}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ordine opposto a {(startParams.tpPoints / startParams.orderDistanceDivisor).toFixed(1)} punti dalla posizione
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <X className="w-4 h-4" />
                  Annulla
                </button>
                <button
                  onClick={handleStart}
                  disabled={actionLoading !== null}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Avvia
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Config Modal */}
      <AnimatePresence>
        {showConfigModal && selectedInstrument && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfigModal(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Configura {selectedInstrument.name}
              </h3>
              
              <div className="space-y-4">
                {/* Harvest Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Percentuale Falciatura
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={configParams.harvestPercentage}
                      onChange={(e) => setConfigParams({ ...configParams, harvestPercentage: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-12 text-right font-medium text-gray-900 dark:text-white">
                      {configParams.harvestPercentage}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Percentuale del profitto da falciare automaticamente
                  </p>
                </div>

                {/* Default Contracts */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contratti Default
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={configParams.defaultContracts}
                    onChange={(e) => setConfigParams({ ...configParams, defaultContracts: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Default TP Points */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    TP Default (punti)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={configParams.defaultTPPoints}
                    onChange={(e) => setConfigParams({ ...configParams, defaultTPPoints: parseFloat(e.target.value) || 10 })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <X className="w-4 h-4" />
                  Annulla
                </button>
                <button
                  onClick={handleUpdateConfig}
                  disabled={actionLoading !== null}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Salva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
