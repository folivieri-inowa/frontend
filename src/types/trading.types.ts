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

export type WebSocketEvent =
  | { type: 'CONNECTED'; data: { message: string; timestamp: Date } }
  | { type: 'SYSTEM_STATUS'; data: SystemStatus }
  | { type: 'ACCOUNT_UPDATE'; data: AccountInfo }
  | { type: 'POSITION_UPDATE'; data: Position }
  | { type: 'ORDER_UPDATE'; data: Order }
  | { type: 'TRADE_CONFIRM'; data: any }
  | { type: 'CONSOLE_LOG'; data: ConsoleLog }
