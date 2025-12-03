import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Settings, Save, RotateCcw, Loader2 } from 'lucide-react'

// Zod validation schema
const strategyConfigSchema = z.object({
  epic: z.string().min(1, 'Epic is required'),
  instrument: z.string().min(1, 'Instrument name is required'),
  defaultContracts: z.number().int().min(1, 'Must be at least 1').max(100, 'Must be at most 100'),
  tpPercentage: z.number().min(0.01, 'Must be greater than 0').max(100, 'Must be at most 100%'),
  pipDistance: z.number().min(0.1, 'Must be greater than 0').max(1000, 'Must be at most 1000'),
  scalingFactor: z.number().min(0.1, 'Must be greater than 0').max(10, 'Must be at most 10'),
  profitReinvestPercentage: z.number().int().min(0, 'Must be at least 0%').max(100, 'Must be at most 100%'),
  maxContracts: z.number().int().min(1, 'Must be at least 1').max(1000, 'Must be at most 1000'),
})

type FormData = z.infer<typeof strategyConfigSchema>

export function SettingsView() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(strategyConfigSchema),
  })

  // Load current configuration on mount
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/strategy/config')
      const { success, data } = await res.json()
      
      if (success && data) {
        // Populate form with current values
        Object.entries(data).forEach(([key, value]) => {
          setValue(key as keyof FormData, value as any)
        })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load configuration' })
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      setSaving(true)
      setMessage(null)

      const res = await fetch('/api/strategy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Configuration saved successfully!' })
        reset(data) // Reset form dirty state
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save configuration' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while saving' })
      console.error('Error saving config:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to default configuration?')) {
      return
    }

    try {
      setResetting(true)
      setMessage(null)

      const res = await fetch('/api/strategy/config/reset', {
        method: 'POST',
      })

      const result = await res.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Configuration reset to defaults!' })
        // Reload form with default values
        await loadConfig()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to reset configuration' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while resetting' })
      console.error('Error resetting config:', error)
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-gray-700 dark:text-gray-300" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Strategy Settings</h1>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Trading Strategy Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Epic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Epic Code
                </label>
                <input
                  type="text"
                  {...register('epic')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="CC.D.CL.UEB.IP"
                />
                {errors.epic && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.epic.message}</p>
                )}
              </div>

              {/* Instrument */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instrument Name
                </label>
                <input
                  type="text"
                  {...register('instrument')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="WTI Crude Oil"
                />
                {errors.instrument && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.instrument.message}</p>
                )}
              </div>

              {/* Default Contracts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Contracts
                </label>
                <input
                  type="number"
                  step="1"
                  {...register('defaultContracts', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.defaultContracts && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.defaultContracts.message}</p>
                )}
              </div>

              {/* Max Contracts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Contracts
                </label>
                <input
                  type="number"
                  step="1"
                  {...register('maxContracts', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.maxContracts && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.maxContracts.message}</p>
                )}
              </div>

              {/* TP Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Take Profit (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('tpPercentage', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.tpPercentage && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tpPercentage.message}</p>
                )}
              </div>

              {/* Pip Distance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pip Distance
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('pipDistance', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.pipDistance && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pipDistance.message}</p>
                )}
              </div>

              {/* Scaling Factor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scaling Factor
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('scalingFactor', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.scalingFactor && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.scalingFactor.message}</p>
                )}
              </div>

              {/* Profit Reinvest Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Profit Reinvest (%)
                </label>
                <input
                  type="number"
                  step="1"
                  {...register('profitReinvestPercentage', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.profitReinvestPercentage && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.profitReinvestPercentage.message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <Button
                type="submit"
                disabled={!isDirty || saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                disabled={resetting}
                className="flex items-center gap-2"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Reset to Defaults
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              <strong>Epic Code:</strong> The IG Markets instrument identifier (e.g., CC.D.CL.UEB.IP for WTI Crude Oil)
            </p>
            <p>
              <strong>Default Contracts:</strong> Initial number of contracts for each new trade
            </p>
            <p>
              <strong>Max Contracts:</strong> Maximum number of contracts allowed in a single position
            </p>
            <p>
              <strong>Take Profit (%):</strong> Target profit percentage before closing position
            </p>
            <p>
              <strong>Pip Distance:</strong> Distance in pips between scaling orders
            </p>
            <p>
              <strong>Scaling Factor:</strong> Multiplier for contract size when scaling positions
            </p>
            <p>
              <strong>Profit Reinvest (%):</strong> Percentage of profits to reinvest in next trade (0-100%)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
