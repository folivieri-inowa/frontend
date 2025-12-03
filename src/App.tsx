import { useState } from 'react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/components/Dashboard'
import { ConsoleView } from '@/components/ConsoleView'
import { StatisticsView } from '@/components/StatisticsView'
import { SettingsView } from '@/components/SettingsView'
import { InstrumentsView } from '@/components/InstrumentsView'
import { PositionsView } from '@/components/PositionsView'
import { LoginPage } from '@/components/LoginPage'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAuthStore } from '@/stores/authStore'

function App() {
  const { isAuthenticated, backendConfig, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')

  // Se non autenticato, mostra login
  if (!isAuthenticated) {
    return <LoginPage />
  }

  const { 
    isConnected, 
    systemStatus, 
    accountInfo, 
    positions, 
    orders,
    consoleLogs,
    refreshPositions,
    refreshOrders
  } = useWebSocket()

  const mockStatistics = {
    totalTrades: 0,
    winRate: 0,
    totalProfit: 0,
    maxDrawdown: 0,
    avgTradeDuration: '0h 0m',
    todayTrades: 0,
    todayProfit: 0
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col">
      <Header 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        systemStatus={{
          isRunning: systemStatus.status === 'ACTIVE',
          sessionActive: systemStatus.igConnected,
          streamStatus: systemStatus.lightstreamerConnected ? 'CONNECTED' : 'DISCONNECTED'
        }}
        userLabel={backendConfig?.label}
        onLogout={logout}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activeView={activeView}
          onViewChange={setActiveView}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {activeView === 'dashboard' && (
            <Dashboard 
              accountInfo={accountInfo}
              positions={positions}
              orders={orders}
              onRefreshPositions={refreshPositions}
              onRefreshOrders={refreshOrders}
            />
          )}
          {activeView === 'instruments' && (
            <InstrumentsView />
          )}
          {activeView === 'positions' && (
            <PositionsView />
          )}
          {activeView === 'statistics' && (
            <StatisticsView statistics={mockStatistics} />
          )}
          {activeView === 'console' && (
            <ConsoleView logs={consoleLogs} />
          )}
          {activeView === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {!isConnected && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          WebSocket Disconnected
        </div>
      )}
    </div>
  )
}

export default App
