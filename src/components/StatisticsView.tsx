import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Statistics } from '@/types/trading.types'
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/utils'
import { 
  TrendingUp, 
  Target, 
  TrendingDown,
  Clock,
  BarChart3 
} from 'lucide-react'

interface StatisticsViewProps {
  statistics: Statistics
}

export function StatisticsView({ statistics }: StatisticsViewProps) {
  const statCards = [
    {
      title: 'Total Trades',
      value: statistics.totalTrades,
      formatted: formatNumber(statistics.totalTrades),
      icon: BarChart3,
      color: 'blue',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      iconClass: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Win Rate',
      value: statistics.winRate,
      formatted: formatPercentage(statistics.winRate),
      icon: Target,
      color: statistics.winRate >= 50 ? 'green' : 'red',
      bgClass: statistics.winRate >= 50 
        ? 'bg-green-100 dark:bg-green-900/30' 
        : 'bg-red-100 dark:bg-red-900/30',
      iconClass: statistics.winRate >= 50 
        ? 'text-green-600 dark:text-green-400' 
        : 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Total Profit',
      value: statistics.totalProfit,
      formatted: formatCurrency(statistics.totalProfit),
      icon: statistics.totalProfit >= 0 ? TrendingUp : TrendingDown,
      color: statistics.totalProfit >= 0 ? 'green' : 'red',
      bgClass: statistics.totalProfit >= 0 
        ? 'bg-green-100 dark:bg-green-900/30' 
        : 'bg-red-100 dark:bg-red-900/30',
      iconClass: statistics.totalProfit >= 0 
        ? 'text-green-600 dark:text-green-400' 
        : 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Max Drawdown',
      value: statistics.maxDrawdown,
      formatted: formatCurrency(statistics.maxDrawdown),
      icon: TrendingDown,
      color: 'red',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      iconClass: 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Avg Trade Duration',
      value: statistics.avgTradeDuration,
      formatted: statistics.avgTradeDuration,
      icon: Clock,
      color: 'purple',
      bgClass: 'bg-purple-100 dark:bg-purple-900/30',
      iconClass: 'text-purple-600 dark:text-purple-400'
    },
    {
      title: "Today's Profit",
      value: statistics.todayProfit,
      formatted: formatCurrency(statistics.todayProfit),
      icon: statistics.todayProfit >= 0 ? TrendingUp : TrendingDown,
      color: statistics.todayProfit >= 0 ? 'green' : 'red',
      bgClass: statistics.todayProfit >= 0 
        ? 'bg-green-100 dark:bg-green-900/30' 
        : 'bg-red-100 dark:bg-red-900/30',
      iconClass: statistics.todayProfit >= 0 
        ? 'text-green-600 dark:text-green-400' 
        : 'text-red-600 dark:text-red-400'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Statistics
        </h2>
        <Badge variant="info">
          {statistics.todayTrades} trades today
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card hover>
                <CardContent className="flex items-center gap-4">
                  <div className={`p-4 ${stat.bgClass} rounded-lg`}>
                    <Icon className={`w-7 h-7 ${stat.iconClass}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {typeof stat.value === 'number' && stat.value >= 0 && stat.title.includes('Profit') ? '+' : ''}
                      {stat.formatted}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">Profitability</span>
              <div className="flex items-center gap-2">
                <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${statistics.winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(statistics.winRate, 100)}%` }}
                  />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatPercentage(statistics.winRate)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Trades</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statistics.totalTrades}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Today's Trades</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statistics.todayTrades}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
