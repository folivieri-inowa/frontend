import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AccountInfo, Position, Order } from '@/types/trading.types'
import { formatCurrency, formatNumber, getPnLColor } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Activity, RefreshCw } from 'lucide-react'

interface DashboardProps {
  accountInfo: AccountInfo
  positions: Position[]
  orders: Order[]
  onRefreshPositions?: () => Promise<boolean>
  onRefreshOrders?: () => Promise<boolean>
}

export function Dashboard({ accountInfo, positions, orders, onRefreshPositions, onRefreshOrders }: DashboardProps) {
  const [refreshingPositions, setRefreshingPositions] = useState(false)
  const [refreshingOrders, setRefreshingOrders] = useState(false)
  
  const activePositions = positions
  const workingOrders = orders.filter(o => o.status === 'PENDING')

  // Usa P&L dall'account info (dato da IG Markets in real-time)
  const totalPnL = accountInfo.pnl
  const totalMarginUsed = accountInfo.margin

  const handleRefreshPositions = async () => {
    if (!onRefreshPositions || refreshingPositions) return
    setRefreshingPositions(true)
    await onRefreshPositions()
    setRefreshingPositions(false)
  }

  const handleRefreshOrders = async () => {
    if (!onRefreshOrders || refreshingOrders) return
    setRefreshingOrders(true)
    await onRefreshOrders()
    setRefreshingOrders(false)
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Disponibile</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(accountInfo.balance)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Saldo</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(accountInfo.equity)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${totalPnL >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {totalPnL >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Profitto/Perdita</p>
              <p className={`text-2xl font-bold ${getPnLColor(totalPnL)}`}>
                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Margine</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalMarginUsed)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Positions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Posizioni Aperte</CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant={activePositions.length > 0 ? 'success' : 'default'}>
                {activePositions.length} aperte
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRefreshPositions}
                disabled={refreshingPositions}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingPositions ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activePositions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Nessuna posizione aperta
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left">Strumento</th>
                    <th className="px-4 py-3 text-left">Direzione</th>
                    <th className="px-4 py-3 text-right">Contratti</th>
                    <th className="px-4 py-3 text-right">Entrata</th>
                    <th className="px-4 py-3 text-right">P&L</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {activePositions.map((position) => (
                    <motion.tr
                      key={position.id}
                      className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {position.epic}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={position.direction === 'LONG' ? 'success' : 'error'}>
                          {position.direction}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                        {formatNumber(position.contracts)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                        {formatNumber(position.openPrice)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${getPnLColor(position.pnl || 0)}`}>
                        {(position.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(position.pnl || 0)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Working Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ordini Pendenti</CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant={workingOrders.length > 0 ? 'info' : 'default'}>
                {workingOrders.length} pendenti
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRefreshOrders}
                disabled={refreshingOrders}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingOrders ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {workingOrders.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Nessun ordine pendente
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left">Strumento</th>
                    <th className="px-4 py-3 text-left">Direzione</th>
                    <th className="px-4 py-3 text-right">Contratti</th>
                    <th className="px-4 py-3 text-right">Livello</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {workingOrders.map((order) => (
                    <motion.tr
                      key={order.id}
                      className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {order.epic}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={order.direction === 'LONG' ? 'success' : 'error'}>
                          {order.direction}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                        {formatNumber(order.contracts)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                        {formatNumber(order.entryPrice)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {order.type}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
