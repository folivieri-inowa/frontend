import { useEffect, useState, useCallback } from 'react'
import type { WebSocketEvent, SystemStatus, AccountInfo, Position, Order, ConsoleLog } from '@/types/trading.types'
import { useAuthStore } from '@/stores/authStore'

export function useWebSocket() {
  const { apiUrl, wsUrl, isAuthenticated } = useAuthStore()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'STOPPED',
    igConnected: false,
    lightstreamerConnected: false,
  })
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    balance: 0,
    equity: 0,
    margin: 0,
    available: 0,
    pnl: 0,
  })
  const [positions, setPositions] = useState<Position[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([])

  // Fetch initial data on mount (solo se autenticato)
  useEffect(() => {
    if (!isAuthenticated || !apiUrl) return
    
    const fetchInitialData = async () => {
      try {
        console.log('🔄 Fetching initial data from', apiUrl)
        
        // Fetch account info only (positions/orders on manual refresh)
        const accountRes = await fetch(`${apiUrl}/api/account`)
        if (accountRes.ok) {
          const { success, data } = await accountRes.json()
          if (success && data) {
            setAccountInfo({
              balance: data.available || 0,
              equity: data.balance || 0,
              margin: data.deposit || 0,
              available: data.available || 0,
              pnl: data.profitLoss || 0
            })
            console.log('✅ Loaded account info')
          }
        }
      } catch (error) {
        console.error('❌ Error fetching initial data:', error)
      }
    }
    
    fetchInitialData()
  }, [isAuthenticated, apiUrl])

  // Connect to WebSocket (solo se autenticato)
  useEffect(() => {
    if (!isAuthenticated || !wsUrl) return
    
    console.log('🔌 Connecting to WebSocket:', wsUrl)
    const websocket = new WebSocket(wsUrl)

    websocket.onopen = () => {
      console.log('✅ WebSocket connected')
      setIsConnected(true)
    }

    websocket.onclose = () => {
      console.log('❌ WebSocket disconnected')
      setIsConnected(false)
      
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect...')
        setWs(null)
      }, 3000)
    }

    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
    }

    websocket.onmessage = (event) => {
      try {
        const message: WebSocketEvent = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    setWs(websocket)

    return () => {
      websocket.close()
    }
  }, [isAuthenticated, wsUrl])

  const handleMessage = useCallback((message: WebSocketEvent) => {
    console.log('📨 WebSocket message:', message.type, message.data)
    
    switch (message.type) {
      case 'CONNECTED':
        console.log('✅ WebSocket connected:', message.data.message)
        break
        
      case 'SYSTEM_STATUS':
        setSystemStatus((prev) => ({
          ...prev,
          status: message.data.status || prev.status,
          igConnected: message.data.igConnected !== undefined ? message.data.igConnected : prev.igConnected,
          lightstreamerConnected: message.data.lightstreamerConnected !== undefined ? message.data.lightstreamerConnected : prev.lightstreamerConnected,
          sessionAge: message.data.sessionAge,
          uptime: message.data.uptime
        }))
        break
      
      case 'ACCOUNT_UPDATE':
        console.log('💰 Account update received:', message.data)
        setAccountInfo({
          balance: message.data.balance || 0,
          equity: message.data.equity || 0,
          margin: message.data.margin || 0,
          available: message.data.available || 0,
          pnl: message.data.pnl || 0
        })
        break
      
      case 'POSITION_UPDATE':
        console.log('📊 Position update received:', message.data)
        setPositions((prev) => {
          const existing = prev.findIndex((p) => p.id === message.data.id)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = message.data
            console.log(`✏️  Updated position ${message.data.id}`)
            return updated
          }
          console.log(`➕ Added new position ${message.data.id}`)
          return [...prev, message.data]
        })
        break
      
      case 'ORDER_UPDATE':
        console.log('📋 Order update received:', message.data)
        setOrders((prev) => {
          // Rimuovi ordini CANCELLED
          if (message.data.status === 'CANCELLED' || message.data.status === 'FILLED') {
            console.log(`🗑️  Removed order ${message.data.id} (${message.data.status})`)
            return prev.filter((o) => o.id !== message.data.id)
          }
          
          const existing = prev.findIndex((o) => o.id === message.data.id)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = message.data
            console.log(`✏️  Updated order ${message.data.id}`)
            return updated
          }
          console.log(`➕ Added new order ${message.data.id}`)
          return [...prev, message.data]
        })
        break
      
      case 'TRADE_CONFIRM':
        console.log('✅ Trade confirmation:', message.data)
        // Add to console logs
        setConsoleLogs((prev) => {
          const log = {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            type: 'success' as const,
            message: `Trade confirmed: ${message.data.data?.epic || 'Unknown'}`,
            epic: message.data.data?.epic
          }
          return [log, ...prev].slice(0, 500)
        })
        break
      
      case 'CONSOLE_LOG':
        setConsoleLogs((prev) => {
          const newLogs = [message.data, ...prev]
          // Keep only last 500 logs
          return newLogs.slice(0, 500)
        })
        break
    }
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }, [ws])

  // Manual refresh positions from IG API
  const refreshPositions = useCallback(async () => {
    if (!apiUrl) return false
    try {
      console.log('🔄 Manual positions refresh...')
      const res = await fetch(`${apiUrl}/api/positions/refresh`)
      if (res.ok) {
        const { success, data } = await res.json()
        if (success && Array.isArray(data)) {
          setPositions(data) // Replace completely
          console.log(`✅ Refreshed ${data.length} positions`)
          return true
        }
      }
      return false
    } catch (error) {
      console.error('❌ Error refreshing positions:', error)
      return false
    }
  }, [apiUrl])

  // Manual refresh orders from IG API
  const refreshOrders = useCallback(async () => {
    if (!apiUrl) return false
    try {
      console.log('🔄 Manual orders refresh...')
      const res = await fetch(`${apiUrl}/api/orders`)
      if (res.ok) {
        const { success, data } = await res.json()
        if (success && Array.isArray(data)) {
          setOrders(data) // Replace completely
          console.log(`✅ Refreshed ${data.length} orders`)
          return true
        }
      }
      return false
    } catch (error) {
      console.error('❌ Error refreshing orders:', error)
      return false
    }
  }, [apiUrl])

  return {
    isConnected,
    systemStatus,
    accountInfo,
    positions,
    orders,
    consoleLogs,
    sendMessage,
    refreshPositions,
    refreshOrders,
  }
}
