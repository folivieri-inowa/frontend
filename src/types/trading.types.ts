export interface Position {
  id: string
  epic: string
  instrument: string
  direction: 'LONG' | 'SHORT'
  contracts: number
  openPrice: number
  currentPrice?: number
  pnl?: number
  tpLevel?: number
  limitLevel?: number
  stopLevel?: number
  phase: string
  openedAt: Date
}

export interface Order {
  id: string
  epic: string
  instrument: string
  direction: 'LONG' | 'SHORT'
  type: 'MARKET' | 'LIMIT' | 'STOP'
  contracts: number
  entryPrice: number
  tpLevel?: number
  limitLevel?: number
  stopLevel?: number
  status: 'PENDING' | 'FILLED' | 'CANCELLED'
  createdAt: Date
}

export interface SystemStatus {
  status: 'ACTIVE' | 'STOPPED' | 'ERROR'
  igConnected: boolean
  lightstreamerConnected: boolean
  sessionAge?: string
  uptime?: string
  lightstreamerStatus?: string
  // 🆕 Dettagli per monitoraggio connessione
  lastUpdateAt?: string | null
  secondsSinceUpdate?: number | null
}

export interface AccountInfo {
  balance: number
  equity: number
  margin: number
  available: number
  pnl: number
}

export interface Statistics {
  totalTrades: number
  winRate: number
  totalProfit: number
  maxDrawdown: number
  avgTradeDuration: string
  todayTrades: number
  todayProfit: number
}

export interface ConsoleLog {
  id: string
  timestamp: Date
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  epic?: string
}

export interface StrategyConfig {
  epic: string
  instrument: string
  defaultContracts: number
  tpPercentage: number
  pipDistance: number
  scalingFactor: number
  profitReinvestPercentage: number
  maxContracts: number
}

// 🔔 Sistema Notifiche
export type NotificationType = 
  | 'tp_reached'      // Take Profit raggiunto
  | 'order_executed'  // Ordine eseguito
  | 'position_opened' // Posizione aperta
  | 'position_closed' // Posizione chiusa
  | 'cycle_complete'  // Ciclo completato
  | 'instrument_started' // Strumento avviato
  | 'instrument_stopped' // Strumento fermato
  | 'ig_rejection'    // ⚠️ IG ha rifiutato un'operazione
  | 'error'           // Errore
  | 'warning'         // Avviso
  | 'info'            // Informazione

export type NotificationLevel = 'success' | 'info' | 'warning' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  level: NotificationLevel
  title: string
  message: string
  epic?: string
  instrument?: string
  data?: Record<string, any>
  timestamp: Date
  read: boolean
}

export type WebSocketEvent =
  | { type: 'CONNECTED'; data: { message: string; timestamp: Date } }
  | { type: 'SYSTEM_STATUS'; data: SystemStatus }
  | { type: 'ACCOUNT_UPDATE'; data: AccountInfo }
  | { type: 'POSITION_UPDATE'; data: Position }
  | { type: 'ORDER_UPDATE'; data: Order }
  | { type: 'TRADE_CONFIRM'; data: any }
  | { type: 'CONSOLE_LOG'; data: ConsoleLog }
  | { type: 'NOTIFICATION'; data: Notification }
  | { type: 'MARKET_PRICE_UPDATE'; data: { epic: string; bid: number; offer: number; high?: number; low?: number; netChange?: number; netChangePct?: number; updateTime?: string } }
