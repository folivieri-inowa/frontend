import { useState, useEffect, useMemo } from 'react'
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
  PlayCircle,
  Bot,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

/**
 * 🧮 ALGORITMO FALCI - Calcola array di falciatura ottimale
 * Identico alla funzione backend per preview
 */
function calculateFalciArray(
  contracts: number,
  tpPoints: number,
  orderDistanceDivisor: number,
  harvestPct: number
): number[] {
  const falci: number[] = [];
  const banda = tpPoints / orderDistanceDivisor;
  const profit = contracts * tpPoints;
  const reinv = profit * harvestPct;

  let ct = contracts;
  let n = 1;

  while (ct > 0.05) {
    const loss = ((tpPoints * n) + banda) * ct;

    if (reinv < loss) {
      const flp = Math.floor((reinv * 100) / loss);
      const falcioContractsRaw = (ct * flp) / 100;
      const rounded = Math.floor(falcioContractsRaw * 10) / 10;

      if (rounded <= 0 && ct > 0.05) {
        falci.push(0.1);
        ct = Math.round((ct - 0.1) * 10) / 10;
      } else if (rounded > 0) {
        falci.push(rounded);
        ct = Math.round((ct - rounded) * 10) / 10;
      } else {
        break;
      }
      n++;
    } else {
      const rounded = Math.round(ct * 10) / 10;
      if (rounded > 0) falci.push(rounded);
      ct = 0;
    }

    if (n > 20) {
      if (ct > 0) {
        falci.push(Math.round(ct * 10) / 10);
      }
      break;
    }
  }

  return falci;
}

interface InstrumentConfig {
  epic: string
  name: string
  type: string
  harvestPercentage: number
  defaultContracts: number
  defaultTPPoints: number
  orderDistanceDivisor: number
  restartFineCiclo: boolean
  isActive: boolean
  hasConfig: boolean
}

interface StartParams {
  contracts: number
  tpPoints: number
  direction: 'LONG' | 'SHORT'
  orderDistanceDivisor: number
  harvestPercentage: number
}

export function InstrumentsView() {
  const { apiUrl } = useAuthStore()
  const [instruments, setInstruments] = useState<InstrumentConfig[]>([])
  const [pausedEpics, setPausedEpics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 🤖 Recovery Agent automatic mode
  const [automaticMode, setAutomaticMode] = useState<boolean>(true)
  const [automaticModeLoading, setAutomaticModeLoading] = useState(false)
  
  // Modal state
  const [showStartModal, setShowStartModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showMarketInfoModal, setShowMarketInfoModal] = useState(false)
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentConfig | null>(null)
  const [marketInfo, setMarketInfo] = useState<any>(null)
  const [marketInfoLoading, setMarketInfoLoading] = useState(false)
  const [savedFalciArray, setSavedFalciArray] = useState<number[] | null>(null)
  
  // Form state
  const [startParams, setStartParams] = useState<StartParams>({
    contracts: 1,
    tpPoints: 90,
    direction: 'LONG',
    orderDistanceDivisor: 3,
    harvestPercentage: 67
  })
  const [configParams, setConfigParams] = useState({
    harvestPercentage: 67,
    defaultContracts: 1,
    defaultTPPoints: 90,
    orderDistanceDivisor: 3,
    restartFineCiclo: true
  })
  
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // 🧮 Calcola array falci in tempo reale per anteprima
  const previewFalciArray = useMemo(() => {
    const harvestPctDecimal = configParams.harvestPercentage / 100;
    return calculateFalciArray(
      configParams.defaultContracts,
      configParams.defaultTPPoints,
      configParams.orderDistanceDivisor,
      harvestPctDecimal
    );
  }, [
    configParams.defaultContracts,
    configParams.defaultTPPoints,
    configParams.orderDistanceDivisor,
    configParams.harvestPercentage
  ]);

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

  // 🤖 Fetch recovery agent settings
  const fetchRecoverySettings = async () => {
    if (!apiUrl) return
    try {
      const response = await fetch(`${apiUrl}/api/recovery/settings`)
      const data = await response.json()
      
      if (data.success) {
        setAutomaticMode(data.data.automaticMode)
      }
    } catch (err) {
      console.error('Fetch recovery settings error:', err)
    }
  }

  // 🤖 Toggle recovery agent automatic mode
  const toggleAutomaticMode = async () => {
    if (!apiUrl) return
    try {
      setAutomaticModeLoading(true)
      const newMode = !automaticMode
      
      const response = await fetch(`${apiUrl}/api/recovery/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automaticMode: newMode })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAutomaticMode(data.data.automaticMode)
      }
    } catch (err) {
      console.error('Toggle automatic mode error:', err)
    } finally {
      setAutomaticModeLoading(false)
    }
  }

  useEffect(() => {
    fetchInstruments()
    fetchPausedEpics()
    fetchRecoverySettings()
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
      orderDistanceDivisor: instrument.orderDistanceDivisor || 3,
      harvestPercentage: instrument.harvestPercentage
    })
    setShowStartModal(true)
  }

  // Fetch saved falci array from DB
  const fetchSavedFalciArray = async (epic: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/instruments/${epic}`)
      const data = await response.json()
      
      if (data.success && data.data?.metadata) {
        const metadata = typeof data.data.metadata === 'string' 
          ? JSON.parse(data.data.metadata) 
          : data.data.metadata
        setSavedFalciArray(metadata?.strategyConfig?.pascalFalciArray || null)
      } else {
        setSavedFalciArray(null)
      }
    } catch (err) {
      console.error('Error fetching saved falci array:', err)
      setSavedFalciArray(null)
    }
  }

  // Open config modal
  const handleOpenConfig = (instrument: InstrumentConfig) => {
    setSelectedInstrument(instrument)
    setConfigParams({
      harvestPercentage: instrument.harvestPercentage,
      defaultContracts: instrument.defaultContracts,
      defaultTPPoints: instrument.defaultTPPoints,
      orderDistanceDivisor: instrument.orderDistanceDivisor || 3,
      restartFineCiclo: instrument.restartFineCiclo ?? true
    })
    setSavedFalciArray(null) // Reset
    fetchSavedFalciArray(instrument.epic) // Carica array salvato
    setShowConfigModal(true)
  }

  // Open market info modal
  const handleOpenMarketInfo = async (instrument: InstrumentConfig) => {
    setSelectedInstrument(instrument)
    setShowMarketInfoModal(true)
    setMarketInfoLoading(true)
    setMarketInfo(null)
    
    try {
      const response = await fetch(`${apiUrl}/api/instruments/${instrument.epic}/market-info`)
      const data = await response.json()
      
      if (data.success) {
        setMarketInfo(data.data)
      } else {
        alert(`Errore: ${data.error}`)
        setShowMarketInfoModal(false)
      }
    } catch (err) {
      alert('Errore nel recupero info mercato')
      console.error('Market info error:', err)
      setShowMarketInfoModal(false)
    } finally {
      setMarketInfoLoading(false)
    }
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

  // Shutdown instrument (chiude tutto e resetta a PHASE_0_STARTUP)
  const handleShutdown = async (instrument: InstrumentConfig) => {
    if (!confirm(`⚠️ SHUTDOWN COMPLETO di ${instrument.name}?\n\nQuesta operazione:\n• Chiuderà TUTTE le posizioni aperte\n• Cancellerà TUTTI gli ordini pendenti\n• Riporterà lo strumento alla fase iniziale\n\nPotrai poi cliccare "Avvia" per ricominciare.`)) return
    
    try {
      setActionLoading(instrument.epic)
      const response = await fetch(`${apiUrl}/api/instruments/${instrument.epic}/shutdown`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ Shutdown completato per ${instrument.name}\n\nPosizioni chiuse: ${data.data.positionsClosed}\nOrdini cancellati: ${data.data.ordersCancelled}\n\nClicca "Avvia" per ricominciare.`)
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

      {/* 🤖 Recovery Agent Toggle */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-lg border",
        automaticMode 
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
          : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      )}>
        <div className="flex items-center gap-3">
          <Bot className={cn(
            "w-6 h-6",
            automaticMode ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
          )} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Agente di Recovery Automatico
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {automaticMode 
                ? "L'agente interviene automaticamente in caso di anomalie" 
                : "L'agente è disabilitato - intervento manuale richiesto"
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={toggleAutomaticMode}
          disabled={automaticModeLoading}
          className={cn(
            "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
            automaticMode 
              ? "bg-green-500 focus:ring-green-500" 
              : "bg-gray-300 dark:bg-gray-600 focus:ring-gray-500"
          )}
        >
          <span
            className={cn(
              "inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform",
              automaticMode ? "translate-x-7" : "translate-x-1"
            )}
          >
            {automaticModeLoading && (
              <Loader2 className="w-4 h-4 animate-spin absolute top-1 left-1 text-gray-400" />
            )}
          </span>
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
                    
                    {/* Info & Config buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenMarketInfo(instrument)}
                        className="p-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Info Mercato IG"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenConfig(instrument)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Configura"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    </div>
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
                    <div className="flex justify-between">
                      <span>Dist. Ordine:</span>
                      <span className="font-medium">TP / {instrument.orderDistanceDivisor || 3}</span>
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
                      value={startParams.harvestPercentage}
                      onChange={(e) => setStartParams({ ...startParams, harvestPercentage: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-12 text-right font-medium text-gray-900 dark:text-white">
                      {startParams.harvestPercentage}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Percentuale del profitto da falciare automaticamente
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
                      value={configParams.orderDistanceDivisor}
                      onChange={(e) => setConfigParams({ ...configParams, orderDistanceDivisor: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-24 text-right font-medium text-gray-900 dark:text-white">
                      TP / {configParams.orderDistanceDivisor}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ordine opposto a TP/{configParams.orderDistanceDivisor} punti dalla posizione
                  </p>
                </div>

                {/* Restart Fine Ciclo */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configParams.restartFineCiclo}
                      onChange={(e) => setConfigParams({ ...configParams, restartFineCiclo: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Restart Fine Ciclo
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Riavvio automatico dopo falciatura completa (FASE 3 → FASE 1)
                  </p>
                </div>

                {/* 🧮 Array Falci Preview & Verifica DB */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Array Falci - Sequenza Chiusura Contratti
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {/* Preview calcolato */}
                    <div>
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">📊 Anteprima (calcolato):</span>
                      </div>
                      <code className="block px-3 py-2 bg-white dark:bg-gray-800 rounded text-blue-600 dark:text-blue-400 font-mono text-xs">
                        [{previewFalciArray.map(v => v.toFixed(1)).join(', ')}]
                      </code>
                      <div className="flex items-center gap-2 text-xs mt-1 text-gray-500 dark:text-gray-400">
                        <span>Falci: <strong>{previewFalciArray.length}</strong></span>
                        <span>•</span>
                        <span>Totale: <strong>{previewFalciArray.reduce((a, b) => a + b, 0).toFixed(1)}</strong> contratti</span>
                      </div>
                    </div>

                    {/* Array salvato nel DB */}
                    <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">💾 Salvato nel DB:</span>
                      </div>
                      {savedFalciArray ? (
                        <>
                          <code className={cn(
                            "block px-3 py-2 bg-white dark:bg-gray-800 rounded font-mono text-xs",
                            JSON.stringify(savedFalciArray) === JSON.stringify(previewFalciArray)
                              ? "text-green-600 dark:text-green-400"
                              : "text-orange-600 dark:text-orange-400"
                          )}>
                            [{savedFalciArray.map(v => v.toFixed(1)).join(', ')}]
                          </code>
                          {JSON.stringify(savedFalciArray) === JSON.stringify(previewFalciArray) ? (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Array sincronizzato con anteprima
                            </p>
                          ) : (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Array diverso - Salva per aggiornare
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          ❌ Non ancora salvato - Salva configurazione per generare array
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pt-2 border-t border-blue-200 dark:border-blue-700">
                      💡 La sequenza indica quanti contratti verranno chiusi ad ogni Take Profit in FASE 2.
                    </p>
                  </div>
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

      {/* Market Info Modal */}
      <AnimatePresence>
        {showMarketInfoModal && selectedInstrument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowMarketInfoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Info Mercato IG
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedInstrument.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowMarketInfoModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {marketInfoLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : marketInfo ? (
                <div className="space-y-6">
                  {/* Distanza minima - EVIDENZIATA */}
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border-2 border-amber-500 dark:border-amber-400 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-3">
                          ⚠️ Distanza Minima per TP/Stop
                        </h4>
                        
                        {/* Distanza principale - EVIDENZIATA */}
                        <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                              Distanza Minima Richiesta:
                            </span>
                            <span className="text-2xl font-mono font-bold text-amber-900 dark:text-amber-100">
                              {marketInfo.minNormalStopDistance || marketInfo.minStopDistance} punti
                            </span>
                          </div>
                        </div>

                        {/* Dettagli aggiuntivi */}
                        {marketInfo.minGuaranteedStopDistance > 0 && (
                          <div className="space-y-1 text-xs mb-2">
                            <div className="flex justify-between text-amber-800 dark:text-amber-200">
                              <span>Guaranteed Stop:</span>
                              <span className="font-mono font-semibold">
                                {marketInfo.minGuaranteedStopDistance} punti
                              </span>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 leading-relaxed">
                          💡 <strong>Importante:</strong> Il valore di <strong>TP Points</strong> nel setup deve essere <strong>maggiore o uguale</strong> a questa distanza, altrimenti IG rifiuterà l'ordine.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info generali */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Tipo</div>
                        <div className="font-medium text-gray-900 dark:text-white">{marketInfo.instrumentType}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Valuta</div>
                        <div className="font-medium text-gray-900 dark:text-white">{marketInfo.currency}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">1 Pip =</div>
                        <div className="font-medium text-gray-900 dark:text-white">{marketInfo.onePipMeans}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Scaling Factor</div>
                        <div className="font-mono text-gray-900 dark:text-white">{marketInfo.scalingFactor}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Bid</div>
                        <div className="font-mono text-gray-900 dark:text-white">{marketInfo.bid.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Offer</div>
                        <div className="font-mono text-gray-900 dark:text-white">{marketInfo.offer.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Spread</div>
                        <div className="font-mono text-gray-900 dark:text-white">{marketInfo.spreadPoints.toFixed(5)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Limiti */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Limiti Operativi</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Min Deal Size</div>
                        <div className="font-medium text-gray-900 dark:text-white">{marketInfo.minDealSize}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Max Deal Size</div>
                        <div className="font-medium text-gray-900 dark:text-white">{marketInfo.maxDealSize}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Margin Factor</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {marketInfo.marginFactor}{marketInfo.marginFactorUnit}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Nessuna informazione disponibile
                </div>
              )}

              {/* Close button */}
              <div className="mt-6">
                <button
                  onClick={() => setShowMarketInfoModal(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <X className="w-4 h-4" />
                  Chiudi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
