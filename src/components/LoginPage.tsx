import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!username.trim() || !password.trim() || !apiKey.trim()) {
      return;
    }
    
    await login(username.trim(), password, apiKey.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4"
          >
            <span className="text-4xl font-bold text-white">G</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Genesis</h1>
          <p className="text-gray-400">Trading System</p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8"
        >
          <h2 className="text-xl font-semibold text-white mb-6">
            Accedi con IG Markets
          </h2>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username IG
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Il tuo username IG"
                disabled={isLoading}
                className={cn(
                  "w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl",
                  "text-white placeholder-gray-500",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200"
                )}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password IG
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="La tua password IG"
                  disabled={isLoading}
                  className={cn(
                    "w-full px-4 py-3 pr-12 bg-gray-900/50 border border-gray-600 rounded-xl",
                    "text-white placeholder-gray-500",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key IG
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="La tua API Key IG"
                  disabled={isLoading}
                  className={cn(
                    "w-full px-4 py-3 pr-12 bg-gray-900/50 border border-gray-600 rounded-xl",
                    "text-white placeholder-gray-500",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !username || !password || !apiKey}
              className={cn(
                "w-full py-3 px-4 rounded-xl font-medium",
                "bg-gradient-to-r from-blue-500 to-purple-600",
                "text-white shadow-lg",
                "hover:from-blue-600 hover:to-purple-700",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200",
                "flex items-center justify-center gap-2"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifica credenziali...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Accedi
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Le credenziali vengono verificate direttamente con IG Markets.
            <br />
            Non memorizziamo password.
          </p>
        </motion.div>

        {/* Version */}
        <p className="text-center text-gray-600 text-sm mt-6">
          Genesis Trading System v1.0
        </p>
      </motion.div>
    </div>
  );
}
