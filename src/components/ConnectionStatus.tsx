import { useState, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, Clock, Activity } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { SystemStatus } from '@/types/trading.types'

interface ConnectionStatusProps {
  systemStatus: SystemStatus
  onForceReconnect: () => Promise<{ success: boolean; error?: string }>
}

type StreamHealth = 'healthy' | 'stale' | 'disconnected' | 'unknown'

export function ConnectionStatus({ systemStatus, onForceReconnect }: ConnectionStatusProps) {
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectMessage, setReconnectMessage] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Calcola lo stato dello stream
  const getStreamHealth = useCallback((): StreamHealth => {
    if (!systemStatus.igConnected) return 'disconnected'
    if (!systemStatus.lightstreamerConnected) return 'disconnected'
    
    const seconds = systemStatus.secondsSinceUpdate
    if (seconds === null || seconds === undefined) return 'unknown'
    if (seconds < 120) return 'healthy'
    if (seconds < 600) return 'stale'
    return 'disconnected'
  }, [systemStatus])

  const streamHealth = getStreamHealth()

  // Colori e icone per stato
  const statusConfig = {
    healthy: {
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: CheckCircle2,
      label: 'Connesso',
      pulse: false
    },
    stale: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      icon: AlertTriangle,
      label: 'Rallentato',
      pulse: true
    },
    disconnected: {
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: WifiOff,
      label: 'Disconnesso',
      pulse: true
    },
    unknown: {
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      borderColor: 'border-gray-200 dark:border-gray-800',
      icon: Activity,
      label: 'In attesa...',
      pulse: false
    }
  }

  const config = statusConfig[streamHealth]
  const StatusIcon = config.icon

  // Gestisce riconnessione
  const handleReconnect = async () => {
    setIsReconnecting(true)
    setReconnectMessage(null)
    
    try {
      const result = await onForceReconnect()
      if (result.success) {
        setReconnectMessage('✅ Riconnessione avviata')
      } else {
        setReconnectMessage(`❌ ${result.error || 'Errore sconosciuto'}`)
      }
    } catch (error) {
      setReconnectMessage(`❌ ${(error as Error).message}`)
    } finally {
      setIsReconnecting(false)
      // Nascondi messaggio dopo 5 secondi
      setTimeout(() => setReconnectMessage(null), 5000)
    }
  }

  // Formatta tempo dall'ultimo update
  const formatLastUpdate = () => {
    const seconds = systemStatus.secondsSinceUpdate
    if (seconds === null || seconds === undefined) return 'N/A'
    if (seconds < 60) return `${seconds}s fa`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m fa`
  }

  // Formatta età sessione
  const formatSessionAge = () => {
    const age = systemStatus.sessionAge
    if (!age) return 'N/A'
    return age
  }

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} transition-all duration-200`}>
      {/* Header cliccabile */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`relative ${config.pulse ? 'animate-pulse' : ''}`}>
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="text-left">
            <span className={`font-medium text-sm ${config.color}`}>
              {config.label}
            </span>
            {streamHealth === 'healthy' && systemStatus.secondsSinceUpdate !== null && (
              <span className="text-xs text-gray-500 ml-2">
                {formatLastUpdate()}
              </span>
            )}
          </div>
        </div>
        
        {/* Indicatore espandi/chiudi */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Pannello espanso */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-200 dark:border-gray-700 mt-1 pt-3">
          {/* Dettagli connessione */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Wifi className={`w-3.5 h-3.5 ${systemStatus.igConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-gray-600 dark:text-gray-400">IG API:</span>
              <span className={systemStatus.igConnected ? 'text-green-600' : 'text-red-600'}>
                {systemStatus.igConnected ? 'OK' : 'Disconnesso'}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Activity className={`w-3.5 h-3.5 ${systemStatus.lightstreamerConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-gray-600 dark:text-gray-400">Stream:</span>
              <span className={systemStatus.lightstreamerConnected ? 'text-green-600' : 'text-red-600'}>
                {systemStatus.lightstreamerConnected ? 'OK' : 'Disconnesso'}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Ultimo dato:</span>
              <span className={
                systemStatus.secondsSinceUpdate && systemStatus.secondsSinceUpdate > 120 
                  ? 'text-yellow-600' 
                  : 'text-gray-700 dark:text-gray-300'
              }>
                {formatLastUpdate()}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Sessione:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {formatSessionAge()}
              </span>
            </div>
          </div>

          {/* Warning se c'è un problema */}
          {(streamHealth === 'stale' || streamHealth === 'disconnected') && (
            <div className={`text-xs p-2 rounded ${config.bgColor} ${config.color}`}>
              {streamHealth === 'stale' && (
                <p>⚠️ Nessun aggiornamento da {formatLastUpdate()}. Il mercato potrebbe essere chiuso o c'è un problema di connessione.</p>
              )}
              {streamHealth === 'disconnected' && (
                <p>❌ Connessione persa. Clicca "Riconnetti" per ristabilire la connessione.</p>
              )}
            </div>
          )}

          {/* Pulsante riconnessione */}
          <Button
            onClick={handleReconnect}
            disabled={isReconnecting}
            variant={streamHealth === 'disconnected' ? 'primary' : 'ghost'}
            size="sm"
            className="w-full"
          >
            {isReconnecting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Riconnessione in corso...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Forza Riconnessione
              </>
            )}
          </Button>

          {/* Messaggio risultato */}
          {reconnectMessage && (
            <p className={`text-xs text-center ${reconnectMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {reconnectMessage}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
