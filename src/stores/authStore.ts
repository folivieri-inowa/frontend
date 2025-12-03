import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BackendConfig, getBackendConfig, getApiUrl, getWsUrl } from '@/config/backends';

interface AuthState {
  // Stato autenticazione
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Dati utente
  igUsername: string | null;
  backendConfig: BackendConfig | null;
  
  // URL dinamici
  apiUrl: string;
  wsUrl: string;
  
  // Azioni
  login: (username: string, password: string, apiKey: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      igUsername: null,
      backendConfig: null,
      apiUrl: '',
      wsUrl: '',

      login: async (username: string, password: string, apiKey: string) => {
        set({ isLoading: true, error: null });

        try {
          // 1. Trova il backend per questo username
          const config = getBackendConfig(username);
          
          if (!config) {
            set({ 
              isLoading: false, 
              error: `Username "${username}" non autorizzato. Contatta l'amministratore.` 
            });
            return false;
          }

          // 2. Costruisci URL API
          const apiUrl = getApiUrl(config);
          const wsUrl = getWsUrl(config);

          // 3. Verifica credenziali con il backend
          const response = await fetch(`${apiUrl}/api/auth/verify`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, apiKey }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            set({ 
              isLoading: false, 
              error: data.error || 'Credenziali IG non valide' 
            });
            return false;
          }

          // 4. Login riuscito
          set({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            igUsername: username,
            backendConfig: config,
            apiUrl,
            wsUrl,
          });

          return true;

        } catch (err) {
          set({ 
            isLoading: false, 
            error: 'Errore di connessione. Riprova più tardi.' 
          });
          return false;
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          igUsername: null,
          backendConfig: null,
          apiUrl: '',
          wsUrl: '',
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'genesis-auth',
      // Non persistere password o dati sensibili
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        igUsername: state.igUsername,
        backendConfig: state.backendConfig,
        apiUrl: state.apiUrl,
        wsUrl: state.wsUrl,
      }),
    }
  )
);
