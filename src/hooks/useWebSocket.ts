import { useEffect, useState, useCallback } from 'react'
import type { WebSocketEvent, SystemStatus, AccountInfo, Position, Order, ConsoleLog, Notification } from '@/types/trading.types'
import { useAuthStore } from '@/stores/authStore'

export function useWebSocket() {
  const { apiUrl, wsUrl, isAuthenticated } = useAuthStore()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'STOPPED',
    igConnected: false,
    lightstreamerConnected: false,
    lastUpdateAt: null,
    secondsSinceUpdate: null,
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
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Fetch initial data on mount (solo se autenticato)
  useEffect(() => {
    if (!isAuthenticated || !apiUrl) return
    
    const fetchInitialData = async () => {
      try {
        console.log('🔄 Fetching initial data from', apiUrl)
        
        // Fetch account info
        const accountRes = await fetch(`${apiUrl}/api/account`)
        if (accountRes.ok) {
          const { success, data } = await accountRes.json()
          if (success && data) {
            setAccountInfo({
              balance: data.available || 0,
              equity: data.balance || 0,
              margin: data.margin || 0,
              available: data.available || 0,
              pnl: data.pnl || 0
            })
            console.log('✅ Loaded account info')
          }
        }
        
        // Fetch positions
        const positionsRes = await fetch(`${apiUrl}/api/positions`)
        if (positionsRes.ok) {
          const positionsResponse = await positionsRes.json()
          const positionsData = positionsResponse.data || positionsResponse
          if (Array.isArray(positionsData) && positionsData.length > 0) {
            setPositions(positionsData)
            console.log(`✅ Loaded ${positionsData.length} positions`)
          }
        }
        
        // Fetch orders
        const ordersRes = await fetch(`${apiUrl}/api/orders`)
        if (ordersRes.ok) {
          const ordersResponse = await ordersRes.json()
          const ordersData = ordersResponse.data || ordersResponse
          if (Array.isArray(ordersData) && ordersData.length > 0) {
            setOrders(ordersData)
            console.log(`✅ Loaded ${ordersData.length} orders`)
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
          uptime: message.data.uptime,
          lastUpdateAt: message.data.lastUpdateAt,
          secondsSinceUpdate: message.data.secondsSinceUpdate
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
      
      case 'NOTIFICATION':
        console.log('🔔 Notification received:', message.data)
        setNotifications((prev) => {
          // Add to front, keep max 50 notifications
          return [message.data, ...prev].slice(0, 50)
        })
        break
      
      case 'MARKET_PRICE_UPDATE':
        // Aggiorna i prezzi delle posizioni in tempo reale
        setPositions((prev) => {
          const epic = message.data.epic
          const bid = message.data.bid
          const offer = message.data.offer
          
          let updated = false
          const newPositions = prev.map((pos) => {
            if (pos.epic === epic) {
              // Per LONG usiamo bid (prezzo di vendita), per SHORT usiamo offer (prezzo di acquisto)
              const currentPrice = pos.direction === 'LONG' ? bid : offer
              if (currentPrice && pos.openPrice) {
                updated = true
                // NON ricalcoliamo il P&L qui - viene calcolato correttamente dal backend
                // perché la formula (currentPrice - openPrice) * contracts non funziona 
                // per forex (serve contractSize e conversione valuta)
                return { ...pos, currentPrice }
              }
            }
            return pos
          })
          
          return updated ? newPositions : prev
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

  // 🔔 Notification handlers
  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => 
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // 🔄 Force reconnection to IG
  const forceReconnect = useCallback(async () => {
    if (!apiUrl) return { success: false, error: 'API URL not configured' }
    
    try {
      console.log('🔄 Forcing IG reconnection...')
      const response = await fetch(`${apiUrl}/api/connection/reconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Reconnection initiated')
      } else {
        console.error('❌ Reconnection failed:', result.error)
      }
      
      return result
    } catch (error) {
      console.error('❌ Failed to force reconnect:', error)
      return { success: false, error: (error as Error).message }
    }
  }, [apiUrl])

  // 📊 Get detailed connection status
  const getConnectionStatus = useCallback(async () => {
    if (!apiUrl) return null
    
    try {
      const response = await fetch(`${apiUrl}/api/connection/status`)
      const result = await response.json()
      return result.success ? result.data : null
    } catch (error) {
      console.error('❌ Failed to get connection status:', error)
      return null
    }
  }, [apiUrl])

  return {
    isConnected,
    systemStatus,
    accountInfo,
    positions,
    orders,
    consoleLogs,
    notifications,
    sendMessage,
    refreshPositions,
    refreshOrders,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    clearAllNotifications,
    forceReconnect,
    getConnectionStatus,
  }
}
